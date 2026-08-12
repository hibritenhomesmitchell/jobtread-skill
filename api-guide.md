# JobTread API Guide (No Scripts Required)

This guide teaches you how to perform any JobTread task with raw HTTP,
using `curl` or any HTTP client. It is the canonical reference for agents
that cannot (or prefer not to) execute the bundled `scripts/jt.ts` CLI.

Everything in this guide is also implemented by the CLI; the CLI just
injects the grant key and pretty-prints the response. The query shapes
are identical.

---

## 1. The Endpoint

```
POST https://api.jobtread.com/pave
Content-Type: application/json
```

The request body is:

```json
{ "query": { "$": { "grantKey": "<grantKey>" }, ...rootFields } }
```

There is no GraphQL layer, no special headers beyond `Content-Type`, and
no authentication header. The grant key lives **inside the query body**
at `query.$.grantKey`.

A grant key can be generated at `https://app.jobtread.com/grants`. Treat
it like a secret — it grants API access to the JobTread organization it
was issued for.

---

## 2. Hello World — Get Your Organization ID

Almost every other query needs an organization ID. Fetch it first:

```bash
curl https://api.jobtread.com/pave -H 'Content-Type: application/json' -d '{
  "query": {
    "$": { "grantKey": "<grantKey>" },
    "currentGrant": {
      "user": {
        "memberships": {
          "nodes": {
            "organization": { "id": {}, "name": {} }
          }
        }
      }
    }
  }
}'
```

Response shape:

```json
{
  "currentGrant": {
    "user": {
      "memberships": {
        "nodes": [
          { "organization": { "id": "ORG...", "name": "Acme Construction" } }
        ]
      }
    }
  }
}
```

Use `ORG...` as `<orgId>` in subsequent queries.

---

## 3. Query Syntax in 60 Seconds

Pave is a JSON graph API: top-level keys are root field names, scalar
fields are selected with `{}`, and arguments go under a special `$` key.

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "id":   {},
    "name": {},
    "jobs": {
      "$": { "size": 25, "where": ["closedOn", null] },
      "nodes": { "id": {}, "name": {}, "status": {} },
      "nextPage": {}
    }
  }
}
```

- `"$"` holds the input/arguments for the enclosing field.
- `{}` selects a scalar.
- Nested objects select nested fields.
- Plural fields (connections) return `{ nodes, nextPage }` and accept
  `size`, `page`, `sortBy`, `where`, `with`, `expressions`, `group`.

Multiple root fields can be queried in one request:

```json
{
  "job":          { "$": { "id": "<jobId>" },           "id": {}, "name": {} },
  "organization": { "$": { "id": "<orgId>" },           "id": {}, "name": {} }
}
```

For the full syntax reference, see `references/pave-docs.md` and
`references/pave-query-guide.md`.

---

## 4. Filtering (`where`)

Short-hand array form (two-element = equality, three-element = explicit
operator):

```
["fieldName", value]                       equality
["fieldName", "!=", value]                 inequality
["fieldName", ">",  value]                 greater than
["fieldName", ">=", value]
["fieldName", "<",  value]
["fieldName", "<=", value]
["fieldName", "in", [v1, v2]]              in list
["fieldName", "like", "%pattern%"]         pattern match
["fieldName", "between", [start, end]]
[["nested", "path", "to", "field"], value] nested field
[["related", "id"], null]                  no relationship
[["related", "id"], "!=", null]            has relationship
```

Compound:

```json
{ "and": [condition1, condition2] }
{ "or":  [condition1, condition2] }
```

Example — open customer invoices over $0:

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "documents": {
      "$": {
        "where": { "and": [
          ["type",   "customerInvoice"],
          ["status", "pending"],
          ["price",  ">", 0]
        ]},
        "sortBy": [{ "field": "price", "order": "desc" }],
        "size": 25
      },
      "nodes": { "id": {}, "name": {}, "price": {}, "balance": {}, "dueDate": {} },
      "nextPage": {}
    }
  }
}
```

---

## 5. Sorting & Pagination

`sortBy` is an array of `{ field, order? }` objects. `order` is `"asc"`
(omit for default) or `"desc"`.

```json
"sortBy": [{ "field": "createdAt", "order": "desc" }, { "field": "name" }]
```

Pagination: include `nextPage` at the connection level alongside `nodes`.
Pass its value as `page` on the next request. Stop when it is `null`.

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "accounts": {
      "$": { "size": 25, "page": "<pageTokenFromLastResponse>" },
      "nodes": { "id": {}, "name": {} },
      "nextPage": {}
    }
  }
}
```

---

## 6. Aggregations (`count`, `sum`, `min`, `max`, `group`)

Don't pull all records and do math client-side. Use server-side aggregations.

Count open jobs:

```json
{ "organization": { "$": { "id": "<orgId>" }, "jobs": { "$": { "where": ["closedOn", null] }, "count": {} } } }
```

Sum a field:

```json
{ "job": { "$": { "id": "<jobId>" }, "documents": { "sum": { "$": "priceWithTax" } } } }
```

Group aggregation (e.g. documents by type and status):

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "documents": {
      "$": {
        "group": {
          "by": ["type", "status"],
          "aggs": {
            "total": { "sum": "priceWithTax" },
            "count": { "count": [] }
          }
        },
        "size": 50
      },
      "withValues": {}
    }
  }
}
```

`withValues: {}` materializes the grouped result. To group by a computed
expression (e.g. a date part), define it under `expressions` first:

```json
"expressions": { "date": { "formatDatetime": [["startedAt"], "YYYY-MM-DD"] } },
"group": { "by": ["date", ["user", "name"]], "aggs": { "minutes": { "sum": "minutes" } } }
```

---

## 7. Custom Fields

List an organization's custom fields:

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "customFields": {
      "$": { "sortBy": [{ "field": "targetType" }, { "field": "position" }] },
      "nodes": { "id": {}, "name": {}, "type": {}, "targetType": {} }
    }
  }
}
```

Read custom field values on a record:

```json
{
  "account": { "$": { "id": "<accountId>" } },
  "customFieldValues": {
    "$": { "size": 25 },
    "nodes": { "id": {}, "value": {}, "customField": { "id": {}, "name": {} } }
  }
}
```

Update custom field values via a mutation (keys can be field IDs or names):

```json
{
  "updateAccount": {
    "$": { "id": "<accountId>", "customFieldValues": { "<customFieldId>": "<value>" } },
    "account": { "$": { "id": "<accountId>" }, "name": {} }
  }
}
```

Search records by custom field value using `with`:

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "contacts": {
      "$": {
        "with": {
          "cf": {
            "_": "customFieldValues",
            "$": { "where": [["customField", "name"], "<customFieldName>"] },
            "values": { "$": { "field": "value" } }
          }
        },
        "where": [["cf", "values"], "=", "<customFieldValue>"]
      },
      "nodes": { "id": {}, "name": {} }
    }
  }
}
```

---

## 8. Mutations (Create / Update / Delete)

Pattern: `<verb><Noun>` — `createAccount`, `updateDailyLog`, `deleteJob`, etc.

- **Create**: access the new record at `created<Noun>`.
- **Update**: request fields to return directly under the mutation key.
  Pass only the changed fields.
- **Delete**: no return fields needed.

Create a customer + contact + location + job (chained — each response
gives you the ID for the next call):

```json
{ "createAccount":  { "$": { "organizationId": "<orgId>", "type": "customer", "name": "Doe Family" }, "createdAccount":  { "id": {} } } }
```

```json
{ "createContact":  { "$": { "accountId": "<accountId>", "name": "John Doe" }, "createdContact":  { "id": {} } } }
```

```json
{ "createLocation": { "$": { "accountId": "<accountId>", "address": "123 Main St" }, "createdLocation": { "id": {} } } }
```

```json
{ "createJob":      { "$": { "locationId": "<locationId>", "name": "Pool Reno", "priceType": "fixed" }, "createdJob": { "id": {} } } }
```

Update (read back updated data by nesting the entity's root field):

```json
{ "updateJob": { "$": { "id": "<jobId>", "name": "Phase 2" }, "job": { "$": { "id": "<jobId>" }, "id": {}, "name": {} } } }
```

Delete:

```json
{ "deleteJob": { "$": { "id": "<jobId>" } } }
```

For the full list of mutations and their inputs, see
`references/schema-root.md` or introspect live:

```json
{ "schema": { "$": { "path": "root", "search": "create" } } }
```

---

## 9. Schema Introspection

When you don't know what fields exist, introspect:

```json
{ "schema": { "$": { "path": "root" } } }
```

Search by keyword:

```json
{ "schema": { "$": { "path": "root", "search": "invoice" } } }
```

Expand a specific field to see its type, input, and sub-fields:

```json
{ "schema": { "$": { "expand": true, "path": "root.createAccount" } } }
```

Global types (returned as plain strings, e.g. `account`, `document`) can
be introspected by passing the type name as the path:

```json
{ "schema": { "$": { "path": "account" } } }
```

---

## 10. Signed PDF URLs

The `signQuery` operation signs an inner query with the current grant and
returns a short-lived token. Append it to `https://api.jobtread.com/t/` to
get a URL that resolves to a PDF without further authentication.

```json
{
  "pdfToken": {
    "_": "signQuery",
    "$": {
      "query": {
        "pdf": {
          "$": { "id": "document", "options": { "id": "<documentId>" } }
        }
      }
    }
  }
}
```

Response: `{ "pdfToken": "<token>" }` →
`https://api.jobtread.com/t/<token>`

The `pdf` field is a discriminated union on `id` supporting: `budget`,
`dailyLogs`, `document`, `formSubmission`, `selections`, `specifications`,
`tasks`. Pass `download: true` in the inner `$` to get
`Content-Disposition: attachment` instead of inline display.

---

## 11. Tutorials (Help Docs)

JobTread publishes help tutorials that are also queryable via the API.
Useful when you need to understand a JobTread concept before explaining it
to the user.

```json
{ "tutorials": { "$": { "search": "budget template" }, "id": {}, "description": {} } }
```

```json
{ "tutorial": { "$": { "id": "documents" } } }
```

---

## 12. Common Query Recipes

### List active jobs

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "jobs": {
      "$": { "where": ["closedOn", null], "sortBy": [{ "field": "name" }], "size": 25 },
      "nodes": { "id": {}, "name": {}, "number": {}, "status": {}, "closedOn": {} },
      "nextPage": {}
    }
  }
}
```

### Single job with location and account

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "id": {}, "name": {}, "number": {}, "status": {}, "priceType": {},
    "location": { "id": {}, "name": {}, "address": {}, "account": { "id": {}, "name": {}, "type": {} } }
  }
}
```

### Job financial summary (documents grouped by type/status)

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "documents": {
      "$": {
        "where": { "or": [
          { "and": [["type", "bidRequest"],     ["status", "pending"]] },
          { "and": [["type", "vendorOrder"],    ["status", "in", ["pending", "approved"]]] },
          { "and": [["type", "customerOrder"],  ["status", "in", ["pending", "approved"]], ["includeInBudget", true]] },
          { "and": [["type", "vendorBill"],     ["status", "in", ["draft", "pending"]]] },
          { "and": [["type", "customerInvoice"],["status", "in", ["pending", "approved"]]] }
        ]},
        "group": {
          "by": ["type", "status"],
          "aggs": {
            "amountPaid":   { "sum": "amountPaid" },
            "cost":         { "sum": "cost" },
            "count":        { "count": [] },
            "priceWithTax": { "sum": "priceWithTax" }
          }
        }
      },
      "withValues": {}
    }
  }
}
```

### Open customer invoices

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "documents": {
      "$": {
        "where": { "and": [["type", "customerInvoice"], ["status", "pending"], ["price", ">", 0]] },
        "sortBy": [{ "field": "price", "order": "desc" }],
        "size": 25
      },
      "nodes": { "id": {}, "name": {}, "number": {}, "price": {}, "balance": {}, "dueDate": {}, "job": { "id": {}, "name": {} } },
      "nextPage": {}
    }
  }
}
```

### Single document with payments and recipients

```json
{
  "document": {
    "$": { "id": "<documentId>" },
    "id": {}, "name": {}, "number": {}, "type": {}, "status": {},
    "price": {}, "cost": {}, "tax": {}, "balance": {}, "priceWithTax": {}, "amountPaid": {},
    "issueDate": {}, "dueDate": {},
    "job": { "id": {}, "name": {}, "number": {} },
    "documentPayments": { "$": { "size": 25 }, "nodes": { "id": {}, "amount": {}, "payment": { "id": {}, "amount": {}, "paidAt": {} } } },
    "documentRecipients": { "$": { "size": 10 }, "nodes": { "id": {}, "requireSignature": {} } }
  }
}
```

### Find a customer by name

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "accounts": {
      "$": { "where": { "and": [["type", "customer"], ["name", "like", "%Smith%"]] }, "size": 25 },
      "nodes": { "id": {}, "name": {}, "type": {}, "isTaxable": {}, "createdAt": {} },
      "nextPage": {}
    }
  }
}
```

### Time entries for a date range, grouped by date and user

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "timeEntries": {
      "$": {
        "where": { "and": [["startedAt", ">=", "2025-01-01"], ["startedAt", "<", "2025-02-01"]] },
        "expressions": { "date": { "formatDatetime": [["startedAt"], "YYYY-MM-DD"] } },
        "group": {
          "by": ["date", ["user", "id"], ["user", "name"]],
          "aggs": {
            "minutes":      { "sum": "minutes" },
            "minStartedAt": { "min": "startedAt" },
            "maxEndedAt":   { "max": "endedAt" }
          }
        },
        "size": 100,
        "sortBy": [{ "field": "date", "order": "desc" }]
      },
      "withValues": {}
    }
  }
}
```

### Tasks on a job

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "tasks": {
      "$": { "sortBy": [{ "field": "startDate", "order": "desc" }], "size": 50 },
      "nodes": { "id": {}, "name": {}, "progress": {}, "startDate": {}, "endDate": {}, "isToDo": {}, "completed": {} },
      "nextPage": {}
    }
  }
}
```

### Daily logs for a job in a date range

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "dailyLogs": {
      "$": {
        "where": { "and": [["date", ">=", "2025-01-01"], ["date", "<", "2025-02-01"]] },
        "sortBy": [{ "field": "date", "order": "desc" }],
        "size": 25
      },
      "nodes": { "id": {}, "date": {}, "notes": {} },
      "nextPage": {}
    }
  }
}
```

### Cost items (budget line items) on a job

```json
{
  "job": {
    "$": { "id": "<jobId>" },
    "costItems": {
      "$": { "size": 50 },
      "nodes": { "id": {}, "name": {}, "quantity": {}, "unitCost": {}, "unitPrice": {}, "costCode": { "id": {}, "name": {} }, "costType": { "id": {}, "name": {} } },
      "nextPage": {}
    }
  }
}
```

### Webhooks configured for an organization

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "webhooks": { "$": { "size": 50 }, "nodes": { "id": {}, "url": {}, "eventTypes": {} } }
  }
}
```

---

## 13. Error Handling

- Non-2xx HTTP status: the body contains the error message. Common causes
  are an invalid/expired grant key, an unknown root field, or a malformed
  query.
- 200 with an `errors` array in the body: the query was syntactically
  valid but some fields failed. Inspect the error path.
- Always check the HTTP status before parsing the body as a successful
  result.

---

## 14. Where to Look Next

- `references/pave-docs.md` — the most complete guide to the query language.
- `references/pave-query-guide.md` — quick reference for `where`, `sortBy`,
  pagination, custom fields, aggregations, mutations, and signed PDF URLs.
- `references/schema-root.md` — every root field with its input arguments.
- `references/document-types.md` — proposal/order/invoice/bill types and
  their status lifecycles.
- `references/job-statuses.md` — `active` / `closed` lifecycle.
- `references/event-types.md` — webhook event type list.
- `workflows/*.md` — step-by-step playbooks for common multi-step tasks.
