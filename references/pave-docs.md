# Pave API Comprehensive Guide

This is the canonical reference for the JobTread Pave query language. It is
the single most useful document for an agent learning to query JobTread.
Read it before writing your own queries.

> Execute a query against the JobTread Pave API. It is a JSON graph API,
> similar to GraphQL but queried with JSON objects. The examples in this
> description are not exhaustive so always query the schema for what is
> possible before coming to a conclusion.



## WORKFLOW
1. Introspect root fields: { "schema": { "$": { "path": "root" } } }
2. Search by keyword: { "schema": { "$": { "path": "root", "search": "<keyword>" } } }
3. Expand a specific field: { "schema": { "$": { "expand": true, "path": "root.<fieldName>" } } }
4. Execute your query.

Always introspect before querying unfamiliar fields. Global types (returned as plain strings) can be introspected by passing the type name as the path.

## SCHEMA PATH RULES
Build a path by appending a segment for each layer encountered:
- object key    => '.<key>'
- input ('$')   => '.$'
- oneOf variant => '._on_<key>'

Example - root -> createFoo -> input -> oneOf "bar" -> "baz":
  root.createFoo.$._on_bar.baz

## QUERY SYNTAX
Top-level keys are root field names. Select a scalar with an empty object {}. Arguments go under the special '$' key.

{ "fieldName": { "$": { ...args }, "subField": {}, "nested": { "deeper": {} } } }

Always double-check that your keys are at the right depth and that your curly brackets and square brackets are correctly balanced.

## FIELD ALIAS (_)
Use "_" to alias any field to a schema type, or to access a typed connection under a custom name.

Rename a connection field (e.g. query tasks but call the result scheduledTasks):
{ "organization": { "$": { "id": "<organizationId>" }, "scheduledTasks": { "_": "tasks", "$": { "where": ["isToDo", false] }, "count": {} } } }

Named sum via alias:
{ "job": { "$": { "id": "<jobId>" }, "documents": { "count": {}, "priceSum": { "_": "sum", "$": "price" } } } }

## ORGANIZATION CONTEXT
Most queries require an organization ID. Fetch it with:
{ "currentGrant": { "organization": { "id": {} } } }

Or via user memberships:
{ "currentGrant": { "user": { "memberships": { "nodes": { "organization": { "id": {} } } } } } }

## CONNECTION PATTERN (lists, filtering, sorting, pagination, aggregation)
Plural fields follow a connection pattern. Key params: size, page, sortBy, where, with, expressions.

### WHERE CLAUSE

Short-hand array form (two-element = implicit equality, three-element = explicit operator):
  ["fieldName", value]
  [["nested", "path", "to", "field"], value]
  ["fieldName", "!=", value]
  ["fieldName", ">", value]  /  ["fieldName", ">=", value]
  ["fieldName", "<", value]  /  ["fieldName", "<=", value]
  ["fieldName", "in", [val1, val2, val3]]
  ["fieldName", "like", "%pattern%"]
  ["fieldName", "between", [startVal, endVal]]
  [["related", "id"], null]         -- no relationship (null check)
  [["related", "id"], "!=", null]   -- has relationship (not-null check)

Object form (more explicit, equivalent to array form):
  { "=":  [{ "field": ["type"] },   { "value": "customer" }] }
  { "!=": [{ "field": ["status"] }, { "value": "draft" }] }
  { ">":  [{ "field": ["balance"] },{ "value": 0 }] }

Compound:
  { "and": [condition1, condition2, ...] }
  { "or":  [condition1, condition2, ...] }

Count open jobs:
{ "organization": { "$": { "id": "<organizationId>" }, "jobs": { "$": { "where": ["closedOn", null] }, "count": {} } } }

Filter and sum approved order values on a job:
{
  "job": {
    "$": { "id": "<jobId>" },
    "documents": {
      "$": {
        "where": {
          "and": [
            ["type", "customerOrder"],
            ["status", "approved"],
            ["includeInBudget", true]
          ]
        }
      },
      "sum": { "$": "priceWithTax" }
    }
  }
}

Find a customer account by name:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "accounts": {
      "$": {
        "where": { "and": [["type", "customer"], ["name", "John Doe"]] },
        "size": 1
      },
      "nodes": { "id": {}, "name": {}, "type": {} }
    }
  }
}

Find a customer contact by a custom field value — use "with" to count matching customFieldValues, then filter where count > 0:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "contacts": {
      "$": {
        "with": {
          "emailMatch": {
            "_": "customFieldValues",
            "$": {
              "where": {
                "and": [
                  [["customField", "type"], "emailAddress"],
                  ["value", "john@example.com"]
                ]
              }
            }
          }
        },
        "where": { "and": [[["account", "type"], "customer"], [["emailMatch", "count"], ">", 0]] },
        "size": 1
      },
      "nodes": { "id": {}, "name": {}, "account": { "id": {}, "name": {}, "type": {} }
    }
  }
}

Filter by nested relationship, null check, and date range:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "timeEntries": {
      "$": {
        "where": {
          "and": [
            [["user", "id"], "<userId>"],
            [["costItem", "id"], null],
            ["startedAt", ">=", "2025-01-01"],
            ["startedAt", "<",  "2025-02-01"]
          ]
        },
        "sortBy": [{ "field": "startedAt", "order": "desc" }],
        "size": 100
      },
      "nodes": { "id": {}, "startedAt": {}, "endedAt": {}, "user": { "id": {}, "name": {} } }
    }
  }
}

Filter using 'in' and 'between':
{
  "job": {
    "$": { "id": "<jobId>" },
    "documents": {
      "$": {
        "where": {
          "and": [
            ["status", "in", ["pending", "approved"]],
            ["issueDate", "between", ["2025-01-01", "2025-12-31"]]
          ]
        }
      },
      "nodes": { "id": {}, "fullName": {}, "status": {}, "issueDate": {} }
    }
  }
}

Sort and select with custom field values:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "dailyLogs": {
      "$": { "size": 3, "sortBy": [{ "field": "date", "order": "desc" }] },
      "nodes": {
        "id": {}, "date": {}, "notes": {},
        "customFieldValues": {
          "$": { "size": 25 },
          "nodes": { "value": {}, "customField": { "id": {}, "name": {} } }
        }
      }
    }
  }
}

### PAGINATION
Include "nextPage" at the connection level alongside "nodes". Pass its value as "page" on subsequent requests. Stop when null.

{
  "organization": {
    "$": { "id": "<organizationId>" },
    "timeEntries": {
      "$": { "size": 20 },
      "nodes": { "id": {}, "startedAt": {}, "endedAt": {}, "user": { "id": {}, "name": {} } },
      "nextPage": {}
    }
  }
}

### COUNT AND SUM/MIN/MAX/AVG
Don't pull all records and do math, use these aggregation functions.

Count (no nodes needed):
{ "organization": { "$": { "id": "<organizationId>" }, "jobs": { "$": { "where": ["closedOn", null] }, "count": {} } } }

Sum (string shorthand and object form are equivalent):
{ "job": { "$": { "id": "<jobId>" }, "documents": { "sum": { "$": "priceWithTax" } } } }
{ "organization": { "$": { "id": "<organizationId>" }, "timeEntries": { "sum": { "$": { "field": "minutes" } }, "count": {} } } }

### WITH (computed sub-connections)
"with" injects a named sub-connection that can be referenced in "where" or "sortBy". Add "withValues": {} alongside "nodes" to include the computed results in the response.

Find documents with an outstanding balance not yet covered by a given payment:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "documents": {
      "$": {
        "with": {
          "existingPayment": {
            "_": "documentPayments",
            "$": { "where": [["payment", "id"], "<paymentId>"], "size": 1 },
            "count": {}
          }
        },
        "where": {
          "and": [
            [["existingPayment", "count"], 0],
            ["balance", "!=", 0],
            ["type", "customerInvoice"]
          ]
        },
        "size": 50
      },
      "nodes": { "id": {}, "fullName": {}, "balance": {} },
      "withValues": {}
    }
  }
}

Filter jobs that have at least one task:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "jobs": {
      "$": {
        "with": {
          "taskCount": { "_": "tasks", "$": { "where": ["progress", "!=", 1] }, "count": {} }
        },
        "where": { "and": [[["taskCount", "count"], ">", 0], ["closedOn", null]] },
        "size": 100
      },
      "nodes": { "id": {}, "name": {}, "status": {} },
      "withValues": {}
    }
  }
}

### EXPRESSIONS (computed fields)
Define computed fields under "$": { "expressions": { ... } } and reference them in "where" and "sortBy".

Conditional expression (customer docs use priceWithTax, vendor docs use cost+tax):
{ "expressions": { "total": { "if": [["type", "like", "customer%"], ["priceWithTax"], { "+": [["cost"], ["tax"]] }] } } }

Date extraction for grouping:
{ "expressions": { "date": { "formatDatetime": [["startedAt"], "YYYY-MM-DD"] } } }

### GROUP AGGREGATION
Group time entries by date and user:
{
  "organization": {
    "$": { "id": "<organizationId>" },
    "timeEntries": {
      "$": {
        "where": { "and": [["startedAt", ">=", "2025-06-01"], ["startedAt", "<", "2025-07-01"]] },
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

Group documents by type and status (count + total):
{
  "job": {
    "$": { "id": "<jobId>" },
    "documents": {
      "$": {
        "group": {
          "by": ["type", "status"],
          "aggs": { "total": { "sum": "priceWithTax" }, "count": { "count": [] } }
        },
        "size": 50
      },
      "withValues": {}
    }
  }
}

## MULTI-ROOT QUERIES
Multiple top-level fields are fetched in a single round-trip:
{
  "job":          { "$": { "id": "<jobId>" },           "id": {}, "name": {}, "status": {} },
  "organization": { "$": { "id": "<organizationId>" }, "id": {}, "name": {}, "defaultTaxRate": {} }
}

## MUTATIONS
Pattern: <verb><Noun> (createAccount, updateDailyLog, deleteJob, etc.)

For creates, access the new record at created<Noun>. customFieldValues accepts field name strings or field IDs as keys.
For updates, request fields to return directly under the mutation key. Pass only changed fields.
For deletes, no return fields are needed.

Create account + contact + location + job (chained):
{ "createAccount":  { "$": { "organizationId": "<orgId>", "type": "customer", "name": "Doe Family" }, "createdAccount":  { "id": {} } } }
{ "createContact":  { "$": { "accountId": "<accountId>", "name": "John Doe", "customFieldValues": { "Email Address": "john@example.com", "Phone Number": "+1234567890" } }, "createdContact":  { "id": {} } } }
{ "createLocation": { "$": { "accountId": "<accountId>", "address": "123 Main St" }, "createdLocation": { "id": {} } } }
{ "createJob":      { "$": { "locationId": "<locationId>", "name": "Pool Reno", "priceType": "fixed" }, "createdJob": { "id": {} } } }

Create a cost item on a job:
{
  "createCostItem": {
    "$": { "jobId": "<jobId>", "name": "Labor", "quantity": 10, "unitCost": 75 },
    "createdCostItem": { "id": {}, "name": {}, "quantity": {}, "unitCost": {} }
  }
}

Create a time entry:
{
  "createTimeEntry": {
    "$": {
      "organizationId": "<organizationId>",
      "userId": "<userId>",
      "jobId": "<jobId>",
      "startedAt": "2025-06-01T08:00:00Z",
      "endedAt": "2025-06-01T17:00:00Z",
      "type": "regular",
      "notes": "Framing work"
    },
    "createdTimeEntry": { "id": {}, "startedAt": {}, "endedAt": {} }
  }
}

Create a task assigned to a member:
{
  "createTask": {
    "$": {
      "targetType": "job",
      "targetId": "<jobId>",
      "name": "Inspect foundation",
      "startDate": "2025-06-10",
      "endDate": "2025-06-10",
      "assignees": [{ "membershipId": "<membershipId>" }]
    },
    "createdTask": { "id": {}, "name": {}, "startDate": {}, "endDate": {} }
  }
}

Create a daily log:
{
  "createDailyLog": {
    "$": { "jobId": "<jobId>", "date": "2025-06-01", "notes": "Poured concrete on west side." },
    "createdDailyLog": { "id": {}, "date": {}, "notes": {} }
  }
}

Update (pass only the fields you want to change; to read back updated data, nest the entity's root field inside the mutation):
{ "updateJob":      { "$": { "id": "<jobId>", "name": "Pool Renovation Phase 2", "status": "active" }, "job":      { "$": { "id": "<jobId>" },      "id": {}, "name": {}, "status": {} } } }
{ "updateAccount":  { "$": { "id": "<accountId>", "isTaxable": true },                               "account":  { "$": { "id": "<accountId>" },  "id": {}, "isTaxable": {} } } }
{ "updateDailyLog": { "$": { "id": "<dailyLogId>", "notes": "Updated notes." },                      "dailyLog": { "$": { "id": "<dailyLogId>" }, "id": {}, "notes": {} } } }

Delete:
{ "deleteJob":      { "$": { "id": "<jobId>" } } }
{ "deleteCostItem": { "$": { "id": "<costItemId>" } } }
{ "deleteTask":     { "$": { "id": "<taskId>" } } }

## CURL EXAMPLE
Queries are JSON, not GraphQL. Sample request:

curl https://api.jobtread.com/pave -d '{
  "query": {
    "$": { "grantKey": "<grantKey>" },
    "organization": {
      "$": { "id": "<organizationId>" },
      "jobs": {
        "$": { "where": { ">=": [{ "field": ["createdAt"] }, { "value": "2026-01-01" }] } },
        "sum": { "$": "projectedPriceWithTax" }
      }
    }
  }
}'

## TUTORIALS
Query JobTread tutorials to better understand how JobTread works and how to accomplish tasks:

{ "tutorials": { "$": { "search": "budget template" }, "id": {}, "description": {} } }

A specific tutorial can be retrieved by its ID:

{ "tutorial": { "$": { "id": "documents" } } }
