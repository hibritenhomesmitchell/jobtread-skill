/**
 * Shared Pave API client for the JobTread skill CLI.
 *
 * Reads the grant key from the JT_GRANT_KEY environment variable, injects
 * it into `query.$`, POSTs to https://api.jobtread.com/pave, and returns
 * the raw response text. Callers that want structured output should use
 * `paveQuery` (parsed JSON); callers that want the raw text (e.g. schema
 * introspection, tutorials) should use `paveFetch`.
 */
const PAVE_API_URL = process.env.JT_PAVE_API_URL ?? 'https://api.jobtread.com/pave';
export const PDF_BASE_URL = process.env.JT_PDF_BASE_URL ?? 'https://api.jobtread.com/t/';

export class PaveApiError extends Error {
    readonly status: number;
    readonly body: string;
    constructor(status: number, body: string) {
        super(`Pave API error ${status}: ${body}`);
        this.name = 'PaveApiError';
        this.status = status;
        this.body = body;
    }
}

export class PaveConfigError extends Error {
    constructor() {
        super('No JobTread grant key provided. Set JT_GRANT_KEY env var (generate one at https://app.jobtread.com/grants).');
        this.name = 'PaveConfigError';
    }
}

function resolveGrantKey(): string {
    const key = process.env.JT_GRANT_KEY;
    if (!key || key.length < 10) throw new PaveConfigError();
    return key;
}

/** Inject `grantKey` into `query.$` and POST to the Pave API. Returns raw text. */
export async function paveFetch(query: Record<string, unknown>): Promise<string> {
    const grantKey = resolveGrantKey();
    const enriched: Record<string, unknown> = { ...query };
    const existingArgs = (enriched.$ as Record<string, unknown> | undefined) ?? {};
    enriched.$ = { ...existingArgs, grantKey };

    const response = await fetch(PAVE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: enriched })
    });

    const text = await response.text();
    if (!response.ok) throw new PaveApiError(response.status, text);
    return text;
}

/** Execute a Pave query and return parsed JSON. */
export async function paveQuery<T = unknown>(query: Record<string, unknown>): Promise<T> {
    return JSON.parse(await paveFetch(query)) as T;
}

/** Print a value as pretty JSON to stdout. */
export function printJson(value: unknown): void {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

/** Print an error to stderr and exit non-zero. */
export function fail(err: unknown): never {
    const text = err instanceof Error ? err.message : String(err);
    process.stderr.write(text + '\n');
    process.exit(1);
}

/** Run an async handler, catching Pave errors and printing them as JSON. */
export async function run(handler: () => Promise<unknown>): Promise<void> {
    try {
        const result = await handler();
        printJson(result);
    } catch (err) {
        if (err instanceof PaveConfigError || err instanceof PaveApiError) {
            printJson({ error: err.name, message: err.message, ...(err instanceof PaveApiError ? { status: err.status } : {}) });
            process.exit(1);
        }
        fail(err);
    }
}
