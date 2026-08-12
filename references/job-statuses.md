# JobTread Job Statuses

Jobs in JobTread have a `status` field and a `closedOn` date field that
together describe the job's lifecycle stage.

## Job Statuses

| Status | Description | `closedOn` |
| --- | --- | --- |
| `active` | Job is in progress | `null` |
| `closed` | Job has been completed and closed | Set to close date |

## Status Transitions

- **active → closed**: Set `closedOn` to a date (via `updateJob`)
- **closed → active**: Clear `closedOn` by setting it to `null` (via `updateJob`)

## Key Fields for Filtering

- `status` — `active` or `closed`
- `closedOn` — `null` for active jobs, a date string for closed jobs
- `name` — the job name
- `number` — the job number (auto-assigned or manual)
- `priceType` — `fixed` or `timeAndMaterials`

## Common Queries

Find all open (active) jobs:
```json
{ "where": ["closedOn", null] }
```

Find all closed jobs:
```json
{ "where": [["closedOn", "!=", null]] }
```

Find jobs closed after a date:
```json
{ "where": [["closedOn", ">", "2025-01-01"]] }
```
