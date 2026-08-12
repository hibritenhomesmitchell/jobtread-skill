---
name: jobtread
description: Query and mutate JobTread (construction management platform) data via the Pave JSON graph API. Bundles a Node.js CLI (jt.ts) for execution and a complete API guide for raw HTTP access. Use this whenever the user asks about JobTread — jobs, documents, invoices, payments, accounts, tasks, time entries, daily logs, cost items, webhooks, or tutorials.
---

# JobTread Skill

You are helping the user interact with **JobTread**, a construction
management platform. JobTread exposes a JSON graph API called **Pave** at
`https://api.jobtread.com/pave`. This skill gives you two complementary ways
to access it:

1. **CLI scripts** — a bundled Node.js dispatcher at `scripts/jt.ts` that
   wraps the most common operations. Use this when you can execute commands.
2. **Raw HTTP / Pave queries** — the `api-guide.md` file in this skill
   folder teaches you how to perform the same tasks with `curl` or any HTTP
   client, with no scripts required.

Both paths produce reliable, structured data. Pick whichever fits the
environment you are running in.

---

## Authentication

Every Pave request must include a **grant key**. The grant key is passed
inside the query body at `query.$.grantKey` (the CLI injects it
automatically).

- The CLI reads it from the `JT_GRANT_KEY` environment variable.
- For raw HTTP, set it in the JSON body (see `api-guide.md`).
- A user can generate a grant key at `https://app.jobtread.com/grants`.

**If `JT_GRANT_KEY` is not set, stop and ask the user to provide one before
making any call.** Never guess or invent a grant key.

---

## Repository Layout

```
jobtread-skill/
├── SKILL.md                  ← you are here
├── README.md                 ← human-facing overview
├── api-guide.md              ← how to do everything with raw HTTP (no scripts)
├── references/               ← reference documentation
│   ├── pave-docs.md          ← *the* canonical Pave query-language guide
│   ├── pave-query-guide.md   ← filtering, sorting, pagination, custom fields
│   ├── schema-root.md        ← every root field, input, and type
│   ├── document-types.md     ← proposal/order/invoice/bill types + statuses
│   ├── job-statuses.md       ← active/closed lifecycle
│   └── event-types.md        ← webhook event type list
├── workflows/                ← multi-step task playbooks
│   ├── explore-domain.md
│   ├── invoice-reconciliation.md
│   ├── job-financial-summary.md
│   ├── pave-introspect.md
│   └── time-entry-report.md
└── scripts/
    ├── jt.ts                 ← CLI dispatcher (run this)
    ├── pave-client.ts        ← shared HTTP client
    └── package.json          ← dependency manifest (only `tsx`)
```

Always read `references/pave-docs.md` and `api-guide.md` before writing your
own queries. They are short and dense.

---

## How to Use the CLI

The CLI is a single dispatcher: `scripts/jt.ts <command> [flags]`. Run it
with `npx tsx` so no global install is needed.

```bash
# From the skill folder:
export JT_GRANT_KEY="<the user's grant key>"
npx tsx scripts/jt.ts --help
npx tsx scripts/jt.ts get-organization
npx tsx scripts/jt.ts list-jobs --org-id=<orgId> --status=active
npx tsx scripts/jt.ts get-job --job-id=<jobId>
npx tsx scripts/jt.ts get-job-summary --job-id=<jobId>
npx tsx scripts/jt.ts list-documents --org-id=<orgId> --type=customerInvoice --status=pending
npx tsx scripts/jt.ts get-document --document-id=<docId>
npx tsx scripts/jt.ts get-document-pdf --document-id=<docId>
npx tsx scripts/jt.ts get-open-invoices --org-id=<orgId>
npx tsx scripts/jt.ts list-accounts --org-id=<orgId> --type=customer --search="Smith"
npx tsx scripts/jt.ts get-account --account-id=<accountId>
npx tsx scripts/jt.ts list-payments --org-id=<orgId>
npx tsx scripts/jt.ts get-payment --payment-id=<paymentId>
npx tsx scripts/jt.ts list-tasks --job-id=<jobId>
npx tsx scripts/jt.ts get-task --task-id=<taskId>
npx tsx scripts/jt.ts list-daily-logs --job-id=<jobId> --start-date=2025-01-01 --end-date=2025-02-01
npx tsx scripts/jt.ts list-cost-items --job-id=<jobId>
npx tsx scripts/jt.ts list-time-entries --org-id=<orgId> --start-date=2025-01-01 --end-date=2025-02-01
npx tsx scripts/jt.ts list-custom-fields --org-id=<orgId>
npx tsx scripts/jt.ts list-webhooks --org-id=<orgId>
npx tsx scripts/jt.ts search-tutorials --search="budget template"
npx tsx scripts/jt.ts get-tutorial --id=documents
npx tsx scripts/jt.ts pave-introspect --path=root
npx tsx scripts/jt.ts pave-introspect --path=root --search=invoice
npx tsx scripts/jt.ts pave-introspect --path=root.createAccount --expand
npx tsx scripts/jt.ts pave-query --query='{"organization":{"$":{"id":"<orgId>"},"jobs":{"nodes":{"id":{},"name":{}}}}}'
```

All commands print JSON to stdout. Errors print to stderr and exit non-zero.
Run `npx tsx scripts/jt.ts --help` to see the full command list.

The first time `npx tsx` runs it may download the `tsx` package; this is
expected and only happens once.

---

## How to Use Raw HTTP (No Scripts)

Read `api-guide.md` in this folder. It explains how to construct Pave
queries and POST them to `https://api.jobtread.com/pave` with `curl` or any
HTTP client. The same query shapes work whether you use the CLI or raw HTTP
— the CLI is just a thin wrapper that injects the grant key and pretty-
prints the response.

The 30-second version:

```bash
curl https://api.jobtread.com/pave -H 'Content-Type: application/json' -d '{
  "query": {
    "$": { "grantKey": "<grantKey>" },
    "currentGrant": { "user": { "memberships": { "nodes": { "organization": { "id": {}, "name": {} } } } } }
  }
}'
```

---

## Standard Workflow

1. **Get the organization ID.** Almost every query needs one.
   - CLI: `npx tsx scripts/jt.ts get-organization`
   - The first organization in the response is the default; use its `id` as
     `<orgId>` for subsequent calls.

2. **For unfamiliar fields, introspect first.** Don't guess field names.
   - CLI: `npx tsx scripts/jt.ts pave-introspect --path=root --search=<keyword>`
   - Or read `references/schema-root.md` for the full static reference.

3. **Use specialized commands for common operations.** They handle
   pagination, filters, and field selection for you.

4. **Fall back to `pave-query` for anything else.** Pass any valid Pave
   query object as `--query='<json>'`. This is the escape hatch and is
   always available.

5. **Paginate when needed.** List commands return `nextPage` tokens; pass
   them back via `--page=<token>` to get the next page. Stop when `nextPage`
   is `null`.

---

## Common Tasks

| Task | Command |
| --- | --- |
| List active jobs | `list-jobs --org-id=<orgId> --status=active` |
| Job financial summary | `get-job-summary --job-id=<jobId>` |
| Open customer invoices | `get-open-invoices --org-id=<orgId>` |
| Invoice PDF URL | `get-document-pdf --document-id=<docId>` |
| Find a customer by name | `list-accounts --org-id=<orgId> --type=customer --search="Smith"` |
| Time entries for a date range | `list-time-entries --org-id=<orgId> --start-date=2025-01-01 --end-date=2025-02-01` |
| Tasks on a job | `list-tasks --job-id=<jobId>` |
| Discover available mutations | `pave-introspect --path=root --search=create` |

For multi-step analyses (invoice reconciliation, time entry reports, job
financial summaries, domain exploration), start with the matching playbook
in `workflows/`.

---

## Critical Rules

- **Never invent a grant key.** If `JT_GRANT_KEY` is unset, ask the user.
- **Never invent IDs.** Org IDs, job IDs, document IDs, etc. must come from
  a prior query response or the user.
- **Introspect before guessing.** If you are unsure whether a field exists,
  run `pave-introspect` or check `references/schema-root.md`.
- **Paginate large result sets.** Default page size is 25–50. If
  `nextPage` is non-null, keep paging.
- **Treat mutations as real writes.** `create*`, `update*`, and `delete*`
  operations modify production data. Confirm with the user before running
  a mutation unless they explicitly asked for it.
- **Don't commit the user's grant key.** It is a secret. The bundled
  `.gitignore` excludes `.env`.

---

## When You Don't Have Script Execution

If you are running in a read-only environment (no `exec` tool), use the
raw HTTP path: read `api-guide.md`, construct the Pave query JSON, and
hand the user a `curl` command they can run themselves, or use any
available HTTP-fetch tool to POST to `https://api.jobtread.com/pave`. The
response is JSON you can parse and summarize.

---

## Reference Files at a Glance

- `references/pave-docs.md` — read this first; it is the most complete
  guide to the Pave query language.
- `references/pave-query-guide.md` — quick reference for `where`, `sortBy`,
  pagination, custom fields, aggregations, mutations, and signed PDF URLs.
- `references/schema-root.md` — every root field with its input arguments.
- `references/document-types.md` — proposal/order/invoice/bill types and
  their status lifecycles.
- `references/job-statuses.md` — `active` / `closed` lifecycle.
- `references/event-types.md` — webhook event type list.
- `api-guide.md` — how to do everything with raw HTTP, no scripts.
- `workflows/*.md` — step-by-step playbooks for common multi-step tasks.
