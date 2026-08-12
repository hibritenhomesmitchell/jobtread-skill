# Workflow: Explore a Domain

Explore the JobTread Pave API schema for a specific domain area
(jobs, documents, accounts, tasks, timeEntries, payments, costItems,
dailyLogs, webhooks, etc.).

## Steps

1. **Search the root schema for the domain keyword.**
   - With the CLI: `npx tsx jt.ts pave-introspect --path=root --search=<domain>`
   - With a raw query:
     ```json
     { "schema": { "$": { "path": "root", "search": "<domain>" } } }
     ```

2. **For each root field that matches, expand it to see its type and input.**
   - CLI: `npx tsx jt.ts pave-introspect --path=root.<fieldName> --expand`
   - Raw: `{ "schema": { "$": { "expand": true, "path": "root.<fieldName>" } } }`

3. **If the field returns an entity type** (e.g. `job`, `document`, `account`),
   look at the root field for that type (e.g. `root.job`, `root.document`) and
   expand it to see what fields are available on the entity.

4. **If the field is a mutation** (create/update/delete), expand it to see the
   required input fields.

5. **Check the organization connection for this domain.** Search for the plural
   form (e.g. `jobs`, `documents`, `accounts`) and expand `root.organization`
   to see the connection fields.

6. **Summarize what you found:**
   - Root fields for querying single entities (e.g. `job`, `document`)
   - Connection fields under organization for listing (e.g. `organization.jobs`)
   - Available filters (where clauses) and their field names
   - Mutation operations (create/update/delete) and their required inputs
   - Key relationships to other domains
