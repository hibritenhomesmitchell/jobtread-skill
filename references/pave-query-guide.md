# Pave Query Language Guide

## Basic Query Structure

Inputs are passed as an object following the `$` symbol. Fields to be returned
are added at the same nested level as the input property.

## Workflow

1. Introspect root fields: `{ "schema": { "$": { "path": "root" } } }`
2. Search by keyword: `{ "schema": { "$": { "path": "root", "search": "<keyword>" } } }`
3. Expand a specific field: `{ "schema": { "$": { "expand": true, "path": "root.<fieldName>" } } }`
4. Execute your query.

## Organization Context

Most queries require an organization ID. Fetch it with:
`{ "currentGrant": { "organization": { "id": {} } } }`

## Where Clauses

Short-hand array form:
- `["fieldName", value]` — equality
- `["fieldName", "!=", value]` — inequality
- `["fieldName", ">", value]` — greater than
- `["fieldName", "in", [val1, val2]]` — in list
- `["fieldName", "like", "%pattern%"]` — pattern match

Compound:
- `{ "and": [condition1, condition2] }`
- `{ "or": [condition1, condition2] }`

Operators can be chained. This matches all customers named "Test Name" or "Test Name2":

```json
{
  "organization": {
    "$": { "id": "<orgId>" },
    "accounts": {
      "$": {
        "where": {
          "and": [
            ["type", "=", "customer"],
            { "or": [["name", "=", "Test Name"], ["name", "=", "Test Name2"]] }
          ]
        }
      },
      "nodes": { "id": {}, "name": {}, "type": {} }
    }
  }
}
```

### Nested-path targets

A condition's first element may be a path array to filter on a related
field. This returns locations whose `account.name` is "Test Name":

```json
{ "where": [ ["account", "name"], "Test Name" ] }
```

Combine with operators and other conditions as usual.

## Sorting

Pass `sortBy` (an array of `{ field, order? }` objects) on a connection.
`order` is `"asc"` or `"desc"`; omit it for ascending. Multiple entries
apply in order.

```json
{
  "accounts": {
    "$": {
      "size": 5,
      "sortBy": [
        { "field": "type", "order": "desc" },
        { "field": "name" }
      ]
    },
    "nodes": { "id": {}, "name": {}, "type": {} }
  }
}
```

## Pagination

Include `nextPage` (and `previousPage` when paging backward) at the
connection level alongside `nodes`. Pass the returned `nextPage` value as
`page` on the next request. Stop when it is null.

```json
{
  "accounts": {
    "$": { "size": 5, "page": "<pageToken>" },
    "nextPage": {},
    "previousPage": {},
    "nodes": { "id": {}, "name": {} }
  }
}
```

## Custom Fields

List an organization's custom fields via `organization.customFields`:

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

Read custom field values on a record via `customFieldValues`:

```json
{
  "account": { "$": { "id": "<accountId>" } },
  "customFieldValues": {
    "$": { "size": 25 },
    "nodes": { "id": {}, "value": {}, "customField": { "id": {} } }
  }
}
```

Update custom field values by passing `{ "<customFieldId>": "<value>" }`
under `customFieldValues` on a mutation:

```json
{
  "updateAccount": {
    "$": {
      "id": "<accountId>",
      "customFieldValues": { "<customFieldId>": "<value>" }
    },
    "account": { "$": { "id": "<accountId>" }, "name": {} }
  }
}
```

### Searching by custom field values

Use the `with` input to bind a named alias to a `customFieldValues`
subquery, then reference it in `where`. The alias key in `where` must
match the `with` key.

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

For multiple custom fields, define multiple aliases (`cf1`, `cf2`, ...) and
combine them with `and`/`or` in `where`.

## Aggregations

Use `group` on a connection to aggregate `nodes`. Provide `by` (an array
of field names to group on) and `aggs` (named aggregations). Supported
aggs: `sum: <field>`, `count: []`.

```json
{
  "documents": {
    "$": {
      "where": { "and": [["type", "=", "customerInvoice"], ["status", "=", "pending"]] },
      "group": {
        "by": ["type", "status"],
        "aggs": {
          "amountPaid": { "sum": "amountPaid" },
          "count": { "count": [] }
        }
      }
    },
    "withValues": {}
  }
}
```

`withValues: {}` materializes the grouped result. To sum a single field
without grouping, use `sum` directly on the connection:

```json
{ "documents": { "$": { "where": { "and": [...] }, "sum": { "$": "priceWithTax" } } } }
```

## Mutations

Pattern: `<verb><Noun>` (createAccount, updateDailyLog, deleteJob, etc.)

For creates, access the new record at `created<Noun>`.
For updates, request fields to return directly under the mutation key.
For deletes, no return fields are needed.

## Signed PDF URLs

The `signQuery` operation signs an inner query with the current grant and
returns a short-lived token string. Append the token to
`https://api.jobtread.com/t/` to get a URL that resolves to a PDF (or
other signed payload) without further authentication.

The canonical use is rendering a document PDF. `pdfToken` below is an
alias (`_`) for `signQuery` so the scalar lands under a known key:

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

Response: `{ "pdfToken": "<token>" }` → URL
`https://api.jobtread.com/t/<token>`.

The `pdf` field is a discriminated union on `id` supporting: `budget`,
`dailyLogs`, `document`, `formSubmission`, `selections`, `specifications`,
`tasks`. Each takes its own `options` shape. Pass `download: true` to get
`Content-Disposition: attachment` instead of inline display.

For the common `document` case, prefer the `get_document_pdf` tool, which
wraps this flow and returns the full URL directly.
