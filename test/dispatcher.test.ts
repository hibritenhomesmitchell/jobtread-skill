import { describe, it, expect } from 'vitest';
import { commands, printHelp, type Command, type ParsedArgs } from '../scripts/jt.ts';

describe('command registry', () => {
    it('has a non-empty list of commands', () => {
        expect(commands.length).toBeGreaterThan(15);
    });

    it('every command has a name, help, and run function', () => {
        for (const cmd of commands) {
            expect(typeof cmd.name).toBe('string');
            expect(cmd.name.length).toBeGreaterThan(0);
            expect(typeof cmd.help).toBe('string');
            expect(cmd.help.length).toBeGreaterThan(0);
            expect(typeof cmd.run).toBe('function');
        }
    });

    it('has unique command names', () => {
        const names = commands.map(c => c.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('uses kebab-case for all command names', () => {
        for (const cmd of commands) {
            expect(cmd.name).toMatch(/^[a-z][a-z0-9-]*$/);
        }
    });

    const expectedCommands = [
        'get-organization',
        'list-jobs',
        'get-job',
        'get-job-summary',
        'list-documents',
        'get-document',
        'get-document-pdf',
        'get-open-invoices',
        'list-accounts',
        'get-account',
        'list-payments',
        'get-payment',
        'list-tasks',
        'get-task',
        'list-daily-logs',
        'list-cost-items',
        'list-time-entries',
        'list-custom-fields',
        'list-webhooks',
        'search-tutorials',
        'get-tutorial',
        'pave-introspect',
        'pave-query',
    ];
    for (const name of expectedCommands) {
        it(`includes the "${name}" command`, () => {
            expect(commands.some(c => c.name === name)).toBe(true);
        });
    }
});

describe('printHelp', () => {
    it('writes help text to stdout including all command names', () => {
        const output: string[] = [];
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string | Uint8Array) => {
            output.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
            return true;
        }) as typeof process.stdout.write;
        try {
            printHelp();
        } finally {
            process.stdout.write = originalWrite;
        }
        const text = output.join('');
        expect(text).toContain('jt.ts — JobTread CLI');
        expect(text).toContain('Usage:');
        expect(text).toContain('JT_GRANT_KEY');
        for (const cmd of commands) {
            expect(text).toContain(cmd.name);
        }
    });
});

describe('command validation logic', () => {
    // These tests exercise the validation patterns used inside command.run
    // functions, without needing to call the API. We simulate the flag
    // extraction logic and check that the right errors would be thrown.

    function makeArgs(flags: Record<string, string | boolean | number>): ParsedArgs {
        return { positional: [], flags };
    }

    it('list-jobs requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'list-jobs') as Command;
        // No org-id flag → should throw
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('get-job requires job-id', async () => {
        const cmd = commands.find(c => c.name === 'get-job') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--job-id is required');
    });

    it('get-job-summary requires job-id', async () => {
        const cmd = commands.find(c => c.name === 'get-job-summary') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--job-id is required');
    });

    it('get-document requires document-id', async () => {
        const cmd = commands.find(c => c.name === 'get-document') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--document-id is required');
    });

    it('get-document-pdf requires document-id', async () => {
        const cmd = commands.find(c => c.name === 'get-document-pdf') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--document-id is required');
    });

    it('get-open-invoices requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'get-open-invoices') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('list-accounts requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'list-accounts') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('get-account requires account-id', async () => {
        const cmd = commands.find(c => c.name === 'get-account') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--account-id is required');
    });

    it('list-payments requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'list-payments') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('get-payment requires payment-id', async () => {
        const cmd = commands.find(c => c.name === 'get-payment') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--payment-id is required');
    });

    it('get-task requires task-id', async () => {
        const cmd = commands.find(c => c.name === 'get-task') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--task-id is required');
    });

    it('list-tasks requires org-id or job-id', async () => {
        const cmd = commands.find(c => c.name === 'list-tasks') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('Either --org-id or --job-id is required');
    });

    it('list-daily-logs requires org-id or job-id', async () => {
        const cmd = commands.find(c => c.name === 'list-daily-logs') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('Either --org-id or --job-id is required');
    });

    it('list-cost-items requires org-id or job-id', async () => {
        const cmd = commands.find(c => c.name === 'list-cost-items') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('Either --org-id or --job-id is required');
    });

    it('list-time-entries requires org-id or job-id', async () => {
        const cmd = commands.find(c => c.name === 'list-time-entries') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('Either --org-id or --job-id is required');
    });

    it('list-custom-fields requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'list-custom-fields') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('list-webhooks requires org-id', async () => {
        const cmd = commands.find(c => c.name === 'list-webhooks') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--org-id is required');
    });

    it('search-tutorials requires search', async () => {
        const cmd = commands.find(c => c.name === 'search-tutorials') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--search is required');
    });

    it('get-tutorial requires id', async () => {
        const cmd = commands.find(c => c.name === 'get-tutorial') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('--id is required');
    });

    it('pave-query requires --query or --query-file', async () => {
        const cmd = commands.find(c => c.name === 'pave-query') as Command;
        await expect(cmd.run(makeArgs({}))).rejects.toThrow('Either --query');
    });

    it('pave-query rejects invalid JSON', async () => {
        const cmd = commands.find(c => c.name === 'pave-query') as Command;
        await expect(cmd.run(makeArgs({ query: 'not json' }))).rejects.toThrow('Could not parse --query as JSON');
    });
});

describe('CLI subprocess end-to-end', () => {
    // These tests spawn the actual CLI process to verify exit codes and
    // output formatting. They don't need a grant key for the error paths.

    const { execSync } = require('node:child_process') as typeof import('node:child_process');

    function runCli(args: string[], env: Record<string, string> = {}): { stdout: string; stderr: string; status: number } {
        try {
            const stdout = execSync(`npx tsx scripts/jt.ts ${args.join(' ')}`, {
                cwd: __dirname + '/..',
                env: { ...process.env, ...env },
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

    it('--help exits 0 and prints command list', () => {
        const r = runCli(['--help']);
        expect(r.status).toBe(0);
        expect(r.stdout).toContain('jt.ts — JobTread CLI');
        expect(r.stdout).toContain('get-organization');
        expect(r.stdout).toContain('pave-query');
    });

    it('no args exits 0 and prints help', () => {
        const r = runCli([]);
        expect(r.status).toBe(0);
        expect(r.stdout).toContain('jt.ts — JobTread CLI');
    });

    it('unknown command exits 2', () => {
        const r = runCli(['frobnicate']);
        expect(r.status).toBe(2);
        expect(r.stderr).toContain('Unknown command: frobnicate');
    });

    it('get-organization without JT_GRANT_KEY exits 1 with JSON error', () => {
        const r = runCli(['get-organization'], { JT_GRANT_KEY: '' });
        expect(r.status).toBe(1);
        const parsed = JSON.parse(r.stdout);
        expect(parsed.error).toBe('PaveConfigError');
        expect(parsed.message).toContain('JT_GRANT_KEY');
    });

    it('list-jobs without --org-id exits 1 with error message', () => {
        const r = runCli(['list-jobs'], { JT_GRANT_KEY: 'test-key-12345' });
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('--org-id is required');
    });

    it('pave-query with invalid JSON exits 1 with parse error', () => {
        const r = runCli(['pave-query', '--query=not-json'], { JT_GRANT_KEY: 'test-key-12345' });
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('Could not parse --query as JSON');
    });
});
