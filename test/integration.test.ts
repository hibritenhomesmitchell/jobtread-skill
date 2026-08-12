import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Live integration tests against the real JobTread Pave API.
 *
 * These only run when JT_GRANT_KEY is set in the environment. Without a
 * grant key, every test in this file is skipped — `npm test` works
 * out-of-the-box with no external dependencies.
 *
 * To run them:
 *   export JT_GRANT_KEY="<your grant key>"
 *   npm run test:integration
 */

const GRANT_KEY = process.env.JT_GRANT_KEY;
const HAS_KEY = typeof GRANT_KEY === 'string' && GRANT_KEY.length >= 10;

// Use a wrapper that skips when no key is available, so the test names
// still show up in the output as skipped rather than disappearing.
const itMaybe = HAS_KEY ? it : it.skip;

describe('Integration: live Pave API', () => {
    beforeAll(() => {
        if (!HAS_KEY) {
            // eslint-disable-next-line no-console
            console.warn('Skipping integration tests: JT_GRANT_KEY not set.');
        }
    });

    itMaybe('get-organization returns at least one organization', async () => {
        const { paveQuery } = await import('../scripts/pave-client.ts');
        const result = await paveQuery<{
            currentGrant?: { user?: { memberships?: { nodes?: Array<{ organization?: { id: string; name: string } }> } } };
        }>({
            currentGrant: {
                user: { memberships: { nodes: { organization: { id: {}, name: {} } } } }
            }
        });
        const orgs = (result.currentGrant?.user?.memberships?.nodes ?? [])
            .map(n => n.organization)
            .filter((o): o is { id: string; name: string } => !!o);
        expect(orgs.length).toBeGreaterThan(0);
        expect(typeof orgs[0].id).toBe('string');
        expect(typeof orgs[0].name).toBe('string');
    });

    itMaybe('pave-introspect root returns schema object', async () => {
        const { paveFetch } = await import('../scripts/pave-client.ts');
        const text = await paveFetch({ schema: { $: { path: 'root' } } });
        const parsed = JSON.parse(text);
        expect(parsed).toHaveProperty('schema');
    });

    itMaybe('pave-introspect with search returns matching fields', async () => {
        const { paveFetch } = await import('../scripts/pave-client.ts');
        const text = await paveFetch({ schema: { $: { path: 'root', search: 'invoice' } } });
        const parsed = JSON.parse(text);
        expect(parsed).toHaveProperty('schema');
    });

    itMaybe('list-jobs returns a connection with nodes and nextPage', async () => {
        const { paveQuery } = await import('../scripts/pave-client.ts');
        // First get the org ID.
        const orgResult = await paveQuery<{
            currentGrant?: { user?: { memberships?: { nodes?: Array<{ organization?: { id: string } }> } } };
        }>({
            currentGrant: { user: { memberships: { nodes: { organization: { id: {} } } } } }
        });
        const orgId = orgResult.currentGrant?.user?.memberships?.nodes?.[0]?.organization?.id;
        expect(orgId).toBeTruthy();

        const result = await paveQuery<{
            organization?: { jobs?: { nodes?: unknown[]; nextPage?: string | null } };
        }>({
            organization: {
                $: { id: orgId },
                jobs: {
                    $: { size: 5, where: ['closedOn', null], sortBy: [{ field: 'name' }] },
                    nodes: { id: {}, name: {}, status: {} },
                    nextPage: {}
                }
            }
        });
        const jobs = result.organization?.jobs;
        expect(jobs).toBeDefined();
        expect(Array.isArray(jobs?.nodes)).toBe(true);
        // nextPage may be null if fewer than 5 jobs, but the field should exist.
        expect('nextPage' in (jobs ?? {})).toBe(true);
    });

    itMaybe('search-tutorials returns array of results', async () => {
        const { paveFetch } = await import('../scripts/pave-client.ts');
        const text = await paveFetch({
            tutorials: { $: { search: 'budget' }, id: {}, description: {} }
        });
        const parsed = JSON.parse(text);
        expect(parsed).toHaveProperty('tutorials');
        expect(Array.isArray(parsed.tutorials)).toBe(true);
    });

    itMaybe('version query returns a version string', async () => {
        const { paveQuery } = await import('../scripts/pave-client.ts');
        const result = await paveQuery<{ version?: string }>({ version: {} });
        expect(typeof result.version).toBe('string');
        expect(result.version!.length).toBeGreaterThan(0);
    });
});

// Also test the CLI dispatcher end-to-end against the live API.
describe('Integration: CLI subprocess against live API', () => {
    const { execSync } = require('node:child_process') as typeof import('node:child_process');

    function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
        try {
            const stdout = execSync(`npx tsx scripts/jt.ts ${args.join(' ')}`, {
                cwd: __dirname + '/..',
                env: { ...process.env },
                encoding: 'utf8',
                timeout: 30000,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            return { stdout, stderr: '', status: 0 };
        } catch (err) {
            const e = err as { stdout?: string; stderr?: string; status?: number };
            return {
                stdout: e.stdout ?? '',
                stderr: e.stderr ?? '',
                status: e.status ?? 1,
            };
        }
    }

    itMaybe('CLI get-organization prints valid JSON with organizations array', () => {
        const r = runCli(['get-organization']);
        expect(r.status).toBe(0);
        const parsed = JSON.parse(r.stdout);
        expect(parsed.organizations).toBeInstanceOf(Array);
        expect(parsed.organizations.length).toBeGreaterThan(0);
        expect(parsed.defaultOrganizationId).toBeTruthy();
    });

    itMaybe('CLI pave-introspect prints schema JSON', () => {
        const r = runCli(['pave-introspect', '--path=root']);
        expect(r.status).toBe(0);
        const parsed = JSON.parse(r.stdout);
        expect(parsed).toHaveProperty('schema');
    });

    itMaybe('CLI pave-query escape hatch returns count of jobs', () => {
        const { writeFileSync, unlinkSync } = require('node:fs') as typeof import('node:fs');
        const { join } = require('node:path') as typeof import('node:path');

        // First get org ID
        const orgR = runCli(['get-organization']);
        const orgId = JSON.parse(orgR.stdout).defaultOrganizationId;
        expect(orgId).toBeTruthy();

        // Use --query-file to avoid shell-interpreting the $ characters in JSON.
        const queryFile = join(__dirname, 'tmp-query.json');
        const query = {
            organization: {
                $: { id: orgId },
                jobs: { $: { where: ['closedOn', null], size: 1 }, count: {} }
            }
        };
        writeFileSync(queryFile, JSON.stringify(query));
        try {
            const r = runCli(['pave-query', `--query-file=${queryFile}`]);
            expect(r.status).toBe(0);
            const parsed = JSON.parse(r.stdout);
            expect(parsed.organization.jobs.count).toBeGreaterThanOrEqual(0);
        } finally {
            unlinkSync(queryFile);
        }
    });
});
