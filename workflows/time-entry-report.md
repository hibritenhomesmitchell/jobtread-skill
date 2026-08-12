# Workflow: Time Entry Report

Generate a time entry report for a date range, optionally filtered by user
or job, with group aggregation by date and user.

## Steps

1. **Get the organization ID** (if not already known).
   - CLI: `npx tsx jt.ts get-organization`

2. **List raw time entries.**
   - CLI:
     ```
     npx tsx jt.ts list-time-entries \
       --org-id=<orgId> \
       --start-date=2025-01-01 \
       --end-date=2025-02-01 \
       --size=100
     ```
   - Add `--user-id=<userId>` to filter by a specific user.
   - Add `--job-id=<jobId>` to filter by a specific job (instead of `--org-id`).

3. **For a grouped summary by date and user**, use a raw `pave_query` with
   `expressions` + `group`:
   ```json
   {
     "organization": {
       "$": { "id": "<orgId>" },
       "timeEntries": {
         "$": {
           "where": { "and": [
             ["startedAt", ">=", "2025-01-01"],
             ["startedAt", "<",  "2025-02-01"]
           ]},
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
   - With the CLI escape hatch:
     ```
     npx tsx jt.ts pave-query --query='<the JSON above, with orgId filled in>'
     ```

4. **Present the results** as a table with columns:
   Date | User | Minutes (or Hours) | First Clock-in | Last Clock-out
