# Workflow: Pave Schema Introspection

Introspect the JobTread Pave API schema at a given path. This is the
starting point whenever you need to discover what fields, inputs, or
mutations are available.

## Steps

1. **List all root fields.**
   - CLI: `npx tsx jt.ts pave-introspect --path=root`
   - Raw: `{ "schema": { "$": { "path": "root" } } }`

2. **Search by keyword.**
   - CLI: `npx tsx jt.ts pave-introspect --path=root --search=<keyword>`
   - Raw: `{ "schema": { "$": { "path": "root", "search": "<keyword>" } } }`

3. **Expand a specific field** to see its type, input, and sub-fields.
   - CLI: `npx tsx jt.ts pave-introspect --path=root.<fieldName> --expand`
   - Raw: `{ "schema": { "$": { "expand": true, "path": "root.<fieldName>" } } }`

## Schema Path Rules

Build a path by appending a segment for each layer encountered:
- object key     → `.<key>`
- input (`$`)    → `.$`
- oneOf variant  → `._on_<key>`

Example — `root` → `createFoo` → input → oneOf "bar" → "baz":
```
root.createFoo.$._on_bar.baz
```

Global types (returned as plain strings, e.g. `account`, `document`) can be
introspected by passing the type name as the path:
`{ "schema": { "$": { "path": "account" } } }`
