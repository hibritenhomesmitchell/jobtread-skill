import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We import after setting env vars in beforeEach, but since ES modules are
// cached, we need to control the grant key via env before each test and
// re-import fresh. Vitest's vi.resetModules() + dynamic import handles this.

const ORIGINAL_ENV = { ...process.env };

async function importFresh<T>(modulePath: string): Promise<T> {
    vi.resetModules();
    return (await import(modulePath)) as T;
}

function setGrantKey(key: string | undefined) {
    if (key === undefined) {
        delete process.env.JT_GRANT_KEY;
    } else {
        process.env.JT_GRANT_KEY = key;
    }
}

function mockFetchResponse(body: string, ok = true, status = 200) {
    return vi.fn().mockResolvedValue({
        ok,
        status,
        text: () => Promise.resolve(body),
    } as unknown as Response);
}

describe('pave-client', () => {
    beforeEach(() => {
        // Clear grant key before each test; individual tests set it as needed.
        delete process.env.JT_GRANT_KEY;
    });

    afterEach(() => {
        // Restore env.
        for (const k of Object.keys(process.env)) {
            if (!(k in ORIGINAL_ENV)) delete process.env[k];
        }
        for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
            if (v !== undefined) process.env[k] = v;
        }
        vi.restoreAllMocks();
    });

    describe('PaveConfigError', () => {
        it('is thrown when JT_GRANT_KEY is not set', async () => {
            const { paveFetch, PaveConfigError } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
                PaveConfigError: new () => Error;
            }>('../scripts/pave-client.ts');
            setGrantKey(undefined);
            await expect(paveFetch({ organization: { $: { id: 'x' } } })).rejects.toThrow(PaveConfigError);
        });

        it('is thrown when JT_GRANT_KEY is too short (< 10 chars)', async () => {
            const { paveFetch, PaveConfigError } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
                PaveConfigError: new () => Error;
            }>('../scripts/pave-client.ts');
            setGrantKey('short');
            await expect(paveFetch({ organization: { $: { id: 'x' } } })).rejects.toThrow(PaveConfigError);
        });
    });

    describe('paveFetch', () => {
        it('injects grantKey into query.$ and POSTs to the API', async () => {
            const fetchMock = mockFetchResponse('{"ok":true}');
            vi.stubGlobal('fetch', fetchMock);
            setGrantKey('test-grant-key-12345');

            const { paveFetch } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
            }>('../scripts/pave-client.ts');

            const result = await paveFetch({ organization: { $: { id: 'ORG1' } } });
            expect(result).toBe('{"ok":true}');

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('https://api.jobtread.com/pave');
            expect(init).toMatchObject({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const body = JSON.parse((init as RequestInit).body as string);
            expect(body.query.$).toMatchObject({ grantKey: 'test-grant-key-12345' });
            expect(body.query.organization.$).toMatchObject({ id: 'ORG1' });
        });

        it('preserves existing $ args when injecting grantKey', async () => {
            const fetchMock = mockFetchResponse('{}');
            vi.stubGlobal('fetch', fetchMock);
            setGrantKey('test-grant-key-12345');

            const { paveFetch } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
            }>('../scripts/pave-client.ts');

            await paveFetch({
                $: { notify: false, timeZone: 'America/New_York' },
                organization: { $: { id: 'ORG1' } }
            });

            const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
            expect(body.query.$).toMatchObject({
                grantKey: 'test-grant-key-12345',
                notify: false,
                timeZone: 'America/New_York',
            });
        });

        it('throws PaveApiError on non-2xx response', async () => {
            vi.stubGlobal('fetch', mockFetchResponse('Forbidden', false, 403));
            setGrantKey('test-grant-key-12345');

            const { paveFetch, PaveApiError } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
                PaveApiError: new (status: number, body: string) => Error;
            }>('../scripts/pave-client.ts');

            try {
                await paveFetch({ organization: { $: { id: 'x' } } });
                expect.fail('should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(PaveApiError);
                expect((err as Error & { status: number }).status).toBe(403);
                expect((err as Error & { body: string }).body).toBe('Forbidden');
                expect((err as Error).message).toContain('403');
            }
        });

        it('respects JT_PAVE_API_URL env override', async () => {
            const fetchMock = mockFetchResponse('{}');
            vi.stubGlobal('fetch', fetchMock);
            setGrantKey('test-grant-key-12345');
            process.env.JT_PAVE_API_URL = 'https://staging.example.com/pave';

            const { paveFetch } = await importFresh<{
                paveFetch: (q: Record<string, unknown>) => Promise<string>;
            }>('../scripts/pave-client.ts');

            await paveFetch({ organization: { $: { id: 'x' } } });
            expect(fetchMock.mock.calls[0][0]).toBe('https://staging.example.com/pave');
        });
    });

    describe('paveQuery', () => {
        it('parses JSON response', async () => {
            vi.stubGlobal('fetch', mockFetchResponse('{"organization":{"id":"ORG1"}}'));
            setGrantKey('test-grant-key-12345');

            const { paveQuery } = await importFresh<{
                paveQuery: <T = unknown>(q: Record<string, unknown>) => Promise<T>;
            }>('../scripts/pave-client.ts');

            const result = await paveQuery<{ organization: { id: string } }>({
                organization: { $: { id: 'ORG1' }, id: {} }
            });
            expect(result.organization.id).toBe('ORG1');
        });

        it('propagates parse errors for invalid JSON', async () => {
            vi.stubGlobal('fetch', mockFetchResponse('not json'));
            setGrantKey('test-grant-key-12345');

            const { paveQuery } = await importFresh<{
                paveQuery: <T = unknown>(q: Record<string, unknown>) => Promise<T>;
            }>('../scripts/pave-client.ts');

            await expect(paveQuery({ organization: { $: { id: 'x' } } })).rejects.toThrow(SyntaxError);
        });
    });

    describe('PDF_BASE_URL', () => {
        it('defaults to https://api.jobtread.com/t/', async () => {
            delete process.env.JT_PDF_BASE_URL;
            const { PDF_BASE_URL } = await importFresh<{
                PDF_BASE_URL: string;
            }>('../scripts/pave-client.ts');
            expect(PDF_BASE_URL).toBe('https://api.jobtread.com/t/');
        });

        it('respects JT_PDF_BASE_URL env override', async () => {
            process.env.JT_PDF_BASE_URL = 'https://custom.example.com/pdf/';
            const { PDF_BASE_URL } = await importFresh<{
                PDF_BASE_URL: string;
            }>('../scripts/pave-client.ts');
            expect(PDF_BASE_URL).toBe('https://custom.example.com/pdf/');
        });
    });
});
