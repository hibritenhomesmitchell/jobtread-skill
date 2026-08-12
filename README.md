# JobTread Skill

A self-contained, shareable **agent skill** that teaches any LLM agent how
to interact with [JobTread](https://jobtread.com) (a construction
management platform) via the **Pave** JSON graph API.

It works in two modes:

1. **Execute mode** — a bundled Node.js CLI (`scripts/jt.ts`) wraps the
   most common operations. The agent runs commands and parses JSON output.
2. **Read-only / HTTP mode** — `api-guide.md` teaches the agent how to
   construct Pave queries and POST them to `https://api.jobtread.com/pave`
   with `curl` or any HTTP client, with no scripts required.

Both paths produce reliable, structured data.

---

## What's Inside

```
jobtread-skill/
├── SKILL.md                  ← the skill entry point (frontmatter + prompt)
├── README.md                 ← you are here
├── api-guide.md              ← how to do everything with raw HTTP (no scripts)
├── build.mjs                 ← zip build script (npm run build:zip)
├── .github/workflows/
│   ├── ci.yml                ← typecheck + tests + zip build on every push/PR
│   └── release.yml           ← creates a GitHub Release on tag push (v*)
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
├── scripts/
│   ├── jt.ts                 ← CLI dispatcher (run this)
│   └── pave-client.ts        ← shared HTTP client
└── test/
    ├── args.test.ts          ← parseArgs + flag helpers (31 tests)
    ├── pave-client.test.ts   ← grant key + fetch mocking (10 tests)
    ├── dispatcher.test.ts    ← command registry + subprocess exit codes (55 tests)
    └── integration.test.ts   ← live API tests (9 tests, skipped without JT_GRANT_KEY)
```

---

## Quick Start

### 1. Install the skill

Copy this folder into your agent's skills directory. For Devin CLI:

```
.devin/skills/jobtread/        # project-scoped (committed)
~/.config/devin/skills/jobtread/  # global (all projects)
```

The skill follows the `.agents/skills/<name>/SKILL.md` standard, so it
also works with any third-party skill loader that supports that standard.

### 2. Get a JobTread grant key

Generate one at <https://app.jobtread.com/grants>. Treat it like a secret.

### 3. Try the CLI

```bash
cd jobtread-skill
export JT_GRANT_KEY="<your grant key>"

npx tsx scripts/jt.ts --help
npx tsx scripts/jt.ts get-organization
npx tsx scripts/jt.ts list-jobs --org-id=<orgId> --status=active
npx tsx scripts/jt.ts get-open-invoices --org-id=<orgId>
npx tsx scripts/jt.ts get-job-summary --job-id=<jobId>
```

The first `npx tsx` run downloads `tsx` once; subsequent runs are instant.

### 4. Or use raw HTTP

See [`api-guide.md`](api-guide.md) for the full guide. The 30-second
version:

```bash
curl https://api.jobtread.com/pave -H 'Content-Type: application/json' -d '{
  "query": {
    "$": { "grantKey": "<grantKey>" },
    "currentGrant": { "user": { "memberships": { "nodes": { "organization": { "id": {}, "name": {} } } } } }
  }
}'
```

---

## Requirements

- **For execute mode:** Node.js 20+ and `npx` (ships with Node). The only
  dependency is `tsx`, fetched on demand by `npx`.
- **For read-only / HTTP mode:** Nothing. Any HTTP client (curl, fetch,
  webfetch tool) works.

---

## Available CLI Commands

| Command | Description |
| --- | --- |
| `get-organization` | Fetch the org ID(s) for the current grant. Run first. |
| `list-jobs` | List jobs for an org (filter by status, search by name). |
| `get-job` | Single job with location and account. |
| `get-job-summary` | Financial summary (documents grouped by type/status). |
| `list-documents` | List documents for an org or job (filter by type/status). |
| `get-document` | Single document with payments and recipients. |
| `get-document-pdf` | Signed PDF URL for a document. |
| `get-open-invoices` | Open customer invoices for an org. |
| `list-accounts` | List customers/vendors. |
| `get-account` | Single account with contacts, locations, custom fields. |
| `list-payments` | List payments for an org (optionally by account). |
| `get-payment` | Single payment with linked documents. |
| `list-tasks` | List tasks for an org or job. |
| `get-task` | Single task with subtasks and assignees. |
| `list-daily-logs` | Daily logs for a job or org (filter by date range). |
| `list-cost-items` | Budget line items for a job or org. |
| `list-time-entries` | Time entries for an org or job (filter by date/user). |
| `list-custom-fields` | Custom field definitions for an org. |
| `list-webhooks` | Webhooks configured for an org. |
| `search-tutorials` | Search JobTread help tutorials. |
| `get-tutorial` | Retrieve a tutorial by ID. |
| `pave-introspect` | Introspect the Pave schema (path, search, expand). |
| `pave-query` | Escape hatch: run any raw Pave query JSON. |

Run `npx tsx scripts/jt.ts --help` for the authoritative list.

---

## Testing

The skill ships with a Vitest test suite (105 tests across 4 files).

```bash
# Unit tests only — no grant key needed (integration tests are skipped)
npm test

# Watch mode
npm run test:watch

# Unit tests only, explicitly
npm run test:unit

# Live integration tests against the real JobTread API (requires a grant key)
export JT_GRANT_KEY="<your grant key>"
npm run test:integration

# Full suite (unit + integration) with a grant key set
export JT_GRANT_KEY="<your grant key>"
npm test
```

### Test files

| File | What it covers |
| --- | --- |
| `test/args.test.ts` | `parseArgs`, `str`/`num`/`bool` flag helpers, `buildWhere` (31 tests) |
| `test/pave-client.test.ts` | Grant key resolution, `PaveConfigError`/`PaveApiError`, fetch mocking, env overrides (10 tests) |
| `test/dispatcher.test.ts` | Command registry shape, `printHelp`, every command's required-flag validation, CLI subprocess exit codes (55 tests) |
| `test/integration.test.ts` | Live API calls + CLI subprocess against live API — **skipped when `JT_GRANT_KEY` is unset** (9 tests) |

Integration tests use `it.skip` when no grant key is present, so `npm test`
works out-of-the-box with zero external dependencies.

---

## Building a Distributable Zip

A build script produces a clean, distributable zip that users can download
and feed directly to their chat app (Claude, ChatGPT, Cursor, Devin, etc.).

```bash
npm run build:zip
```

This produces:

```
dist/
├── jobtread-skill.zip         ← the skill (SKILL.md at the zip root)
└── jobtread-skill.zip.sha256  ← SHA-256 checksum
```

### What's in the zip

```
SKILL.md          ← skill entry point (at the zip root)
README.md
api-guide.md
.env.example
.gitignore
package.json
references/       ← 6 reference docs
workflows/        ← 5 workflow playbooks
scripts/          ← jt.ts + pave-client.ts (the CLI)
```

### What's excluded

`node_modules/`, `package-lock.json`, `test/`, `tsconfig.json`,
`vitest.config.ts`, `dist/`, `.git/`, `.env`, `build.mjs`.

### Build options

```bash
npm run build:zip              # build dist/jobtread-skill.zip
npm run build:zip -- --name=my-skill   # build as dist/my-skill.zip
npm run clean                  # just clean dist/
```

The build requires the `zip` command (preinstalled on macOS and most Linux
distros). The checksum file uses the standard `shasum -c` format:

```bash
cd dist && shasum -a 256 -c jobtread-skill.zip.sha256
```

### Distributing

Upload `dist/jobtread-skill.zip` anywhere users can download it. To install,
a user unzips it into their agent's skills directory:

```
# Devin CLI
unzip jobtread-skill.zip -d ~/.config/devin/skills/jobtread

# Claude / .agents standard
unzip jobtread-skill.zip -d .agents/skills/jobtread

# Cursor / Windsurf
unzip jobtread-skill.zip -d .windsurf/skills/jobtread
```

The zip is flat (`SKILL.md` at the root), so the target directory becomes
the skill folder directly.

---

## CI & Releases

Two GitHub Actions workflows live in `.github/workflows/`:

### `ci.yml` — runs on every push and PR

Typechecks, runs unit tests, builds the zip, verifies the checksum, asserts
the zip is flat (`SKILL.md` at root, no `node_modules`/`test/`/lockfiles
leaked), and uploads the zip as a 14-day artifact. Catches breakages before
they reach a release.

### `release.yml` — runs on tag push (`v*`) or manual dispatch

Same build pipeline as CI, plus creates a GitHub Release with the zip and
checksum attached as release assets. The release notes include the install
commands and the SHA-256 fingerprint.

### Cutting a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:

1. Install deps, typecheck, run unit tests
2. Build `jobtread-skill-1.0.0.zip` (versioned filename)
3. Generate `jobtread-skill-1.0.0.zip.sha256`
4. Create a GitHub Release titled "JobTread Skill v1.0.0" with:
   - The zip and checksum as downloadable assets
   - Auto-generated changelog notes from commits since the last tag
   - Install instructions and the SHA-256 fingerprint in the body

For manual runs (no tag), use the Actions tab → "Run workflow" and enter
a tag name like `v1.0.0`.

Users download the zip from the Releases page and unzip it into their
agent's skills directory (see "Distributing" above).

---

## Safety Notes

- **The grant key is a secret.** Never commit it. The bundled
  `.gitignore` excludes `.env`.
- **Mutations are real writes.** `create*`, `update*`, and `delete*`
  operations modify production data. The CLI exposes only read commands
  by default; for mutations, use `pave-query` with the JSON shape from
  `api-guide.md` §8, and confirm with the user first.
- **No organization-specific data is bundled.** This skill is generic
  and safe to share publicly.

---

## License

Released to the public domain. See [`LICENSE`](LICENSE) if present, or
treat as CC0 otherwise.
