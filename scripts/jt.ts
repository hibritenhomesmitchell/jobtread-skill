#!/usr/bin/env -S npx tsx
/**
 * jt.ts — JobTread CLI dispatcher.
 *
 * Usage:
 *   export JT_GRANT_KEY="<your grant key>"
 *   npx tsx scripts/jt.ts <command> [flags]
 *   npx tsx scripts/jt.ts --help
 *
 * All commands print JSON to stdout. Errors print JSON to stderr and exit
 * non-zero. See SKILL.md and api-guide.md for the full guide.
 */
import { paveFetch, paveQuery, printJson, run } from './pave-client.js';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

export interface ParsedArgs {
    positional: string[];
    flags: Record<string, string | boolean | number>;
}

export function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = [];
    const flags: Record<string, string | boolean | number> = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--') {
            positional.push(...argv.slice(i + 1));
            break;
        }
        if (a.startsWith('--')) {
            const name = a.slice(2);
            const eq = name.indexOf('=');
            if (eq >= 0) {
                flags[name.slice(0, eq)] = name.slice(eq + 1);
            } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
                flags[name] = argv[++i];
            } else {
                flags[name] = true;
            }
        } else {
            positional.push(a);
        }
    }
    return { positional, flags };
}

export function str(flags: Record<string, unknown>, key: string): string | undefined {
    const v = flags[key];
    return typeof v === 'string' ? v : v === true ? 'true' : undefined;
}
export function num(flags: Record<string, unknown>, key: string, def: number): number {
    const v = flags[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v !== '') return Number(v);
    return def;
}
export function bool(flags: Record<string, unknown>, key: string): boolean | undefined {
    const v = flags[key];
    if (v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true' || v === '1';
    return Boolean(v);
}

// ---------------------------------------------------------------------------
// Where-clause helper
// ---------------------------------------------------------------------------

export type Condition = unknown;
export function buildWhere(conditions: Condition[]): unknown {
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { and: conditions };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export type Command = {
    name: string;
    help: string;
    run: (args: ParsedArgs) => Promise<unknown>;
};

export const commands: Command[] = [
    {
        name: 'get-organization',
        help: 'Fetch the organization ID(s) for the current grant. Run this first.',
        run: async () => {
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
            return orgs.length > 0
                ? { organizations: orgs, defaultOrganizationId: orgs[0].id }
                : { error: 'no_organizations', message: 'No organization memberships found for this grant.' };
        }
    },

    {
        name: 'list-jobs',
        help: 'List jobs for an org. Flags: --org-id, --status=active|closed, --search, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const status = str(a.flags, 'status') ?? 'active';
            const search = str(a.flags, 'search');
            const size = num(a.flags, 'size', 25);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (status === 'active') {
                conditions.push({
                    and: [
                        { '=': [{ field: ['closedOn'] }, { value: null }] },
                        { or: [
                            { '>=': [{ field: ['approvedCustomerOrders', 'priceWithTaxSum'] }, { value: 0 }] },
                            { '=': [{ field: ['priceType'] }, { value: null }] }
                        ] }
                    ]
                });
            } else if (status === 'closed') {
                conditions.push({ '!=': [{ field: ['closedOn'] }, { value: null }] });
            }
            if (search) conditions.push(['name', 'like', `%${search}%`]);
            const where = buildWhere(conditions);
            const result = await paveQuery<{ organization?: { jobs?: { nodes?: unknown[]; nextPage?: string | null } } }>({
                organization: {
                    $: { id: orgId },
                    jobs: {
                        $: {
                            size,
                            sortBy: [{ field: 'name', order: 'asc' }],
                            ...(page && { page }),
                            ...(where ? { where } : {}),
                            ...(status === 'active' && {
                                with: {
                                    approvedCustomerOrders: {
                                        _: 'documents',
                                        $: { where: { and: [['type', 'customerOrder'], ['status', 'approved'], ['includeInBudget', true]] } },
                                        priceWithTaxSum: { _: 'sum', $: 'priceWithTax' }
                                    }
                                }
                            })
                        },
                        nodes: { id: {}, name: {}, number: {}, status: {}, closedOn: {}, priceType: {} },
                        nextPage: {}
                    }
                }
            });
            return result.organization?.jobs;
        }
    },

    {
        name: 'get-job',
        help: 'Fetch a single job by ID. Flags: --job-id',
        run: async (a) => {
            const jobId = str(a.flags, 'job-id');
            if (!jobId) throw new Error('--job-id is required');
            const result = await paveQuery<{ job?: unknown }>({
                job: {
                    $: { id: jobId },
                    id: {}, name: {}, number: {}, status: {}, closedOn: {}, priceType: {},
                    location: { id: {}, name: {}, address: {}, account: { id: {}, name: {}, type: {} } }
                }
            });
            return result.job;
        }
    },

    {
        name: 'get-job-summary',
        help: 'Financial summary for a job (documents grouped by type/status). Flags: --job-id',
        run: async (a) => {
            const jobId = str(a.flags, 'job-id');
            if (!jobId) throw new Error('--job-id is required');
            const result = await paveQuery<{ job?: unknown }>({
                job: {
                    $: { id: jobId },
                    id: {},
                    documents: {
                        $: {
                            where: { or: [
                                { and: [['type', 'bidRequest'],      ['status', 'pending']] },
                                { and: [['type', 'vendorOrder'],     ['status', 'in', ['pending', 'approved']]] },
                                { and: [['type', 'customerOrder'],   ['status', 'in', ['pending', 'approved']], ['includeInBudget', true]] },
                                { and: [['type', 'vendorBill'],      ['status', 'in', ['draft', 'pending']]] },
                                { and: [['type', 'customerInvoice'], ['status', 'in', ['pending', 'approved']]] }
                            ]},
                            group: {
                                by: ['type', 'status'],
                                aggs: {
                                    amountPaid: { sum: 'amountPaid' },
                                    cost: { sum: 'cost' },
                                    count: { count: [] },
                                    priceWithTax: { sum: 'priceWithTax' }
                                }
                            }
                        },
                        withValues: {}
                    }
                }
            });
            return result.job;
        }
    },

    {
        name: 'list-documents',
        help: 'List documents for an org or job. Flags: --org-id|--job-id, --type, --status, --search, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            const jobId = str(a.flags, 'job-id');
            if (!orgId && !jobId) throw new Error('Either --org-id or --job-id is required');
            const type = str(a.flags, 'type');
            const status = str(a.flags, 'status');
            const search = str(a.flags, 'search');
            const size = num(a.flags, 'size', 25);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (type) conditions.push(['type', '=', type]);
            if (status) conditions.push(['status', '=', status]);
            if (search) conditions.push(['name', 'like', `%${search}%`]);
            const where = buildWhere(conditions);
            const connArgs = {
                size,
                sortBy: [{ field: 'createdAt', order: 'desc' }] as Array<{ field: string; order?: string }>,
                ...(page && { page }),
                ...(where ? { where } : {})
            };
            const docFields = {
                id: {}, name: {}, number: {}, type: {}, status: {},
                price: {}, cost: {}, tax: {}, balance: {}, priceWithTax: {},
                amountPaid: {}, issueDate: {}, dueDate: {},
                job: { id: {}, name: {}, number: {} }
            };
            if (jobId) {
                const result = await paveQuery<{ job?: { documents?: unknown } }>({
                    job: { $: { id: jobId }, documents: { $: connArgs, nodes: docFields, nextPage: {} } }
                });
                return result.job?.documents;
            }
            const result = await paveQuery<{ organization?: { documents?: unknown } }>({
                organization: { $: { id: orgId }, documents: { $: connArgs, nodes: docFields, nextPage: {} } }
            });
            return result.organization?.documents;
        }
    },

    {
        name: 'get-document',
        help: 'Fetch a single document by ID with payments and recipients. Flags: --document-id',
        run: async (a) => {
            const documentId = str(a.flags, 'document-id');
            if (!documentId) throw new Error('--document-id is required');
            const result = await paveQuery<{ document?: unknown }>({
                document: {
                    $: { id: documentId },
                    id: {}, name: {}, number: {}, type: {}, status: {},
                    price: {}, cost: {}, tax: {}, balance: {}, priceWithTax: {}, amountPaid: {},
                    issueDate: {}, dueDate: {},
                    job: { id: {}, name: {}, number: {} },
                    documentPayments: { $: { size: 25 }, nodes: { id: {}, amount: {}, payment: { id: {}, amount: {}, paidAt: {} } } },
                    documentRecipients: { $: { size: 10 }, nodes: { id: {}, requireSignature: {} } }
                }
            });
            return result.document;
        }
    },

    {
        name: 'get-document-pdf',
        help: 'Get a signed PDF URL for a document. Flags: --document-id, --download',
        run: async (a) => {
            const documentId = str(a.flags, 'document-id');
            if (!documentId) throw new Error('--document-id is required');
            const download = bool(a.flags, 'download') === true;
            const { PDF_BASE_URL } = await import('./pave-client.js');
            const result = await paveQuery<{ pdfToken?: unknown }>({
                pdfToken: {
                    _: 'signQuery',
                    $: {
                        query: {
                            pdf: {
                                $: { id: 'document', options: { id: documentId }, download }
                            }
                        }
                    }
                }
            });
            const token = result?.pdfToken;
            if (typeof token !== 'string' || token.length === 0) {
                return { error: 'no_token', message: 'Pave response did not contain a pdfToken string.', raw: result };
            }
            return { url: `${PDF_BASE_URL}${token}` };
        }
    },

    {
        name: 'get-open-invoices',
        help: 'Open customer invoices for an org (type=customerInvoice, status=pending, price>0). Flags: --org-id, --size',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const size = num(a.flags, 'size', 25);
            const result = await paveQuery<{ organization?: { documents?: unknown } }>({
                organization: {
                    $: { id: orgId },
                    documents: {
                        $: {
                            where: { and: [['type', 'customerInvoice'], ['status', 'pending'], ['price', '>', 0]] },
                            sortBy: [{ field: 'price', order: 'desc' }],
                            size
                        },
                        nodes: { id: {}, name: {}, number: {}, price: {}, balance: {}, dueDate: {}, job: { id: {}, name: {}, number: {} } },
                        nextPage: {}
                    }
                }
            });
            return result.organization?.documents;
        }
    },

    {
        name: 'list-accounts',
        help: 'List accounts (customers/vendors). Flags: --org-id, --type=customer|vendor, --search, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const type = str(a.flags, 'type');
            const search = str(a.flags, 'search');
            const size = num(a.flags, 'size', 25);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (type) conditions.push(['type', '=', type]);
            if (search) conditions.push(['name', 'like', `%${search}%`]);
            const where = buildWhere(conditions);
            const result = await paveQuery<{ organization?: { accounts?: unknown } }>({
                organization: {
                    $: { id: orgId },
                    accounts: {
                        $: { size, sortBy: [{ field: 'name' }], ...(page && { page }), ...(where ? { where } : {}) },
                        nodes: { id: {}, name: {}, type: {}, isTaxable: {}, createdAt: {} },
                        nextPage: {}
                    }
                }
            });
            return result.organization?.accounts;
        }
    },

    {
        name: 'get-account',
        help: 'Fetch a single account by ID with contacts, locations, custom fields. Flags: --account-id',
        run: async (a) => {
            const accountId = str(a.flags, 'account-id');
            if (!accountId) throw new Error('--account-id is required');
            const result = await paveQuery<{ account?: unknown }>({
                account: {
                    $: { id: accountId },
                    id: {}, name: {}, type: {}, isTaxable: {}, createdAt: {},
                    contacts: { $: { size: 50 }, nodes: { id: {}, name: {}, title: {} } },
                    locations: { $: { size: 50 }, nodes: { id: {}, name: {}, address: {} } },
                    customFieldValues: { $: { size: 25 }, nodes: { id: {}, value: {}, customField: { id: {}, name: {} } } }
                }
            });
            return result.account;
        }
    },

    {
        name: 'list-payments',
        help: 'List payments for an org, optionally filtered by account. Flags: --org-id, --account-id, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const accountId = str(a.flags, 'account-id');
            const size = num(a.flags, 'size', 25);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (accountId) conditions.push([['account', 'id'], accountId]);
            const where = buildWhere(conditions);
            const result = await paveQuery<{ organization?: { payments?: unknown } }>({
                organization: {
                    $: { id: orgId },
                    payments: {
                        $: {
                            size,
                            sortBy: [{ field: 'paidAt', order: 'desc' }] as Array<{ field: string; order?: string }>,
                            ...(page && { page }),
                            ...(where ? { where } : {})
                        },
                        nodes: { id: {}, amount: {}, paidAt: {}, source: {}, type: {}, description: {}, account: { id: {}, name: {} } },
                        nextPage: {}
                    }
                }
            });
            return result.organization?.payments;
        }
    },

    {
        name: 'get-payment',
        help: 'Fetch a single payment by ID with linked documents. Flags: --payment-id',
        run: async (a) => {
            const paymentId = str(a.flags, 'payment-id');
            if (!paymentId) throw new Error('--payment-id is required');
            const result = await paveQuery<{ payment?: unknown }>({
                payment: {
                    $: { id: paymentId },
                    id: {}, amount: {}, paidAt: {}, source: {}, type: {}, description: {},
                    account: { id: {}, name: {} },
                    documentPayments: {
                        $: { size: 25 },
                        nodes: { id: {}, amount: {}, document: { id: {}, name: {}, number: {}, type: {}, status: {} } }
                    }
                }
            });
            return result.payment;
        }
    },

    {
        name: 'list-tasks',
        help: 'List tasks for an org or job. Flags: --org-id|--job-id, --is-to-do, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            const jobId = str(a.flags, 'job-id');
            if (!orgId && !jobId) throw new Error('Either --org-id or --job-id is required');
            const isToDo = bool(a.flags, 'is-to-do');
            const size = num(a.flags, 'size', 50);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (isToDo !== undefined) conditions.push(['isToDo', isToDo]);
            const where = buildWhere(conditions);
            const connArgs = {
                size,
                sortBy: [{ field: 'startDate', order: 'desc' }] as Array<{ field: string; order?: string }>,
                ...(page && { page }),
                ...(where ? { where } : {})
            };
            const nodeFields = { id: {}, name: {}, progress: {}, startDate: {}, endDate: {}, isToDo: {}, completed: {} };
            if (jobId) {
                const result = await paveQuery<{ job?: { tasks?: unknown } }>({
                    job: { $: { id: jobId }, tasks: { $: connArgs, nodes: nodeFields, nextPage: {} } }
                });
                return result.job?.tasks;
            }
            const result = await paveQuery<{ organization?: { tasks?: unknown } }>({
                organization: { $: { id: orgId }, tasks: { $: connArgs, nodes: nodeFields, nextPage: {} } }
            });
            return result.organization?.tasks;
        }
    },

    {
        name: 'get-task',
        help: 'Fetch a single task by ID with subtasks and assignees. Flags: --task-id',
        run: async (a) => {
            const taskId = str(a.flags, 'task-id');
            if (!taskId) throw new Error('--task-id is required');
            const result = await paveQuery<{ task?: unknown }>({
                task: {
                    $: { id: taskId },
                    id: {}, name: {}, progress: {}, startDate: {}, endDate: {},
                    isToDo: {}, completed: {}, description: {},
                    parentTask: { id: {}, name: {} },
                    taskAssignments: { $: { size: 25 }, nodes: { id: {}, membership: { id: {}, user: { id: {}, name: {} } } } },
                    childTasks: { $: { size: 50 }, nodes: { id: {}, name: {}, progress: {}, completed: {} } }
                }
            });
            return result.task;
        }
    },

    {
        name: 'list-daily-logs',
        help: 'List daily logs for a job or org. Flags: --org-id|--job-id, --start-date, --end-date, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            const jobId = str(a.flags, 'job-id');
            if (!orgId && !jobId) throw new Error('Either --org-id or --job-id is required');
            const startDate = str(a.flags, 'start-date');
            const endDate = str(a.flags, 'end-date');
            const size = num(a.flags, 'size', 25);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (startDate) conditions.push(['date', '>=', startDate]);
            if (endDate) conditions.push(['date', '<', endDate]);
            const where = buildWhere(conditions);
            const connArgs = {
                size,
                sortBy: [{ field: 'date', order: 'desc' }] as Array<{ field: string; order?: string }>,
                ...(page && { page }),
                ...(where ? { where } : {})
            };
            const nodeFields = { id: {}, date: {}, notes: {}, job: { id: {}, name: {} } };
            if (jobId) {
                const result = await paveQuery<{ job?: { dailyLogs?: unknown } }>({
                    job: { $: { id: jobId }, dailyLogs: { $: connArgs, nodes: nodeFields, nextPage: {} } }
                });
                return result.job?.dailyLogs;
            }
            const result = await paveQuery<{ organization?: { dailyLogs?: unknown } }>({
                organization: { $: { id: orgId }, dailyLogs: { $: connArgs, nodes: nodeFields, nextPage: {} } }
            });
            return result.organization?.dailyLogs;
        }
    },

    {
        name: 'list-cost-items',
        help: 'List cost items (budget line items) for a job or org. Flags: --org-id|--job-id, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            const jobId = str(a.flags, 'job-id');
            if (!orgId && !jobId) throw new Error('Either --org-id or --job-id is required');
            const size = num(a.flags, 'size', 50);
            const page = str(a.flags, 'page');
            const connArgs = { size, ...(page && { page }) };
            const nodeFields = {
                id: {}, name: {}, quantity: {}, unitCost: {}, unitPrice: {},
                costCode: { id: {}, name: {} },
                costType: { id: {}, name: {} }
            };
            if (jobId) {
                const result = await paveQuery<{ job?: { costItems?: unknown } }>({
                    job: { $: { id: jobId }, costItems: { $: connArgs, nodes: nodeFields, nextPage: {} } }
                });
                return result.job?.costItems;
            }
            const result = await paveQuery<{ organization?: { costItems?: unknown } }>({
                organization: { $: { id: orgId }, costItems: { $: connArgs, nodes: nodeFields, nextPage: {} } }
            });
            return result.organization?.costItems;
        }
    },

    {
        name: 'list-time-entries',
        help: 'List time entries for an org or job. Flags: --org-id|--job-id, --user-id, --start-date, --end-date, --size, --page',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            const jobId = str(a.flags, 'job-id');
            if (!orgId && !jobId) throw new Error('Either --org-id or --job-id is required');
            const userId = str(a.flags, 'user-id');
            const startDate = str(a.flags, 'start-date');
            const endDate = str(a.flags, 'end-date');
            const size = num(a.flags, 'size', 50);
            const page = str(a.flags, 'page');
            const conditions: Condition[] = [];
            if (userId) conditions.push([['user', 'id'], userId]);
            if (startDate) conditions.push(['startedAt', '>=', startDate]);
            if (endDate) conditions.push(['startedAt', '<', endDate]);
            const where = buildWhere(conditions);
            const connArgs = {
                size,
                sortBy: [{ field: 'startedAt', order: 'desc' }] as Array<{ field: string; order?: string }>,
                ...(page && { page }),
                ...(where ? { where } : {})
            };
            const nodeFields = {
                id: {}, startedAt: {}, endedAt: {}, minutes: {}, type: {}, notes: {},
                user: { id: {}, name: {} },
                job: { id: {}, name: {} }
            };
            if (jobId) {
                const result = await paveQuery<{ job?: { timeEntries?: unknown } }>({
                    job: { $: { id: jobId }, timeEntries: { $: connArgs, nodes: nodeFields, nextPage: {} } }
                });
                return result.job?.timeEntries;
            }
            const result = await paveQuery<{ organization?: { timeEntries?: unknown } }>({
                organization: { $: { id: orgId }, timeEntries: { $: connArgs, nodes: nodeFields, nextPage: {} } }
            });
            return result.organization?.timeEntries;
        }
    },

    {
        name: 'list-custom-fields',
        help: 'List custom fields for an org. Flags: --org-id, --target-type',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const targetType = str(a.flags, 'target-type');
            const where = targetType ? { and: [[['customField', 'targetType'], targetType]] } : undefined;
            const result = await paveQuery<{ organization?: { customFields?: { nodes?: unknown[] } } }>({
                organization: {
                    $: { id: orgId },
                    customFields: {
                        $: { size: 100, sortBy: [{ field: 'targetType' }, { field: 'position' }], ...(where && { where }) },
                        nodes: { id: {}, name: {}, type: {}, targetType: {} }
                    }
                }
            });
            return result.organization?.customFields?.nodes;
        }
    },

    {
        name: 'list-webhooks',
        help: 'List webhooks for an org. Flags: --org-id',
        run: async (a) => {
            const orgId = str(a.flags, 'org-id');
            if (!orgId) throw new Error('--org-id is required');
            const result = await paveQuery<{ organization?: { webhooks?: { nodes?: unknown[] } } }>({
                organization: {
                    $: { id: orgId },
                    webhooks: { $: { size: 50 }, nodes: { id: {}, url: {}, eventTypes: {} } }
                }
            });
            return result.organization?.webhooks?.nodes;
        }
    },

    {
        name: 'search-tutorials',
        help: 'Search JobTread help tutorials. Flags: --search',
        run: async (a) => {
            const search = str(a.flags, 'search');
            if (!search) throw new Error('--search is required');
            const text = await paveFetch({
                tutorials: { $: { search }, id: {}, description: {} }
            });
            return JSON.parse(text);
        }
    },

    {
        name: 'get-tutorial',
        help: 'Retrieve a tutorial by ID. Flags: --id',
        run: async (a) => {
            const id = str(a.flags, 'id');
            if (!id) throw new Error('--id is required');
            const text = await paveFetch({ tutorial: { $: { id } } });
            return JSON.parse(text);
        }
    },

    {
        name: 'pave-introspect',
        help: 'Introspect the Pave schema. Flags: --path (default "root"), --search, --expand',
        run: async (a) => {
            const path = str(a.flags, 'path') ?? 'root';
            const search = str(a.flags, 'search');
            const expand = bool(a.flags, 'expand') === true;
            const schemaArgs: Record<string, unknown> = { path };
            if (search) schemaArgs.search = search;
            if (expand) schemaArgs.expand = true;
            const text = await paveFetch({ schema: { $: schemaArgs } });
            return JSON.parse(text);
        }
    },

    {
        name: 'pave-query',
        help: 'Escape hatch: run any raw Pave query. Flags: --query (JSON string) or --query-file (path to JSON)',
        run: async (a) => {
            let queryStr = str(a.flags, 'query');
            if (!queryStr) {
                const file = str(a.flags, 'query-file');
                if (!file) throw new Error('Either --query (JSON string) or --query-file (path) is required');
                const { readFileSync } = await import('node:fs');
                queryStr = readFileSync(file, 'utf8');
            }
            let query: Record<string, unknown>;
            try {
                query = JSON.parse(queryStr);
            } catch (e) {
                throw new Error(`Could not parse --query as JSON: ${(e as Error).message}`);
            }
            const text = await paveFetch(query);
            // Pave returns either JSON or plain text (schema/tutorial). Try JSON first.
            try {
                return JSON.parse(text);
            } catch {
                return { text };
            }
        }
    }
];

// ---------------------------------------------------------------------------
// Help & dispatch
// ---------------------------------------------------------------------------

export function printHelp(): void {
    const lines: string[] = [];
    lines.push('jt.ts — JobTread CLI');
    lines.push('');
    lines.push('Usage:');
    lines.push('  npx tsx scripts/jt.ts <command> [flags]');
    lines.push('  npx tsx scripts/jt.ts --help');
    lines.push('');
    lines.push('Environment:');
    lines.push('  JT_GRANT_KEY   (required) JobTread grant key. Generate at https://app.jobtread.com/grants');
    lines.push('  JT_PAVE_API_URL (optional) Override the Pave endpoint (defaults to https://api.jobtread.com/pave)');
    lines.push('  JT_PDF_BASE_URL (optional) Override the signed-PDF base URL (defaults to https://api.jobtread.com/t/)');
    lines.push('');
    lines.push('Commands:');
    const maxName = Math.max(...commands.map(c => c.name.length));
    for (const c of commands) {
        lines.push(`  ${c.name.padEnd(maxName)}  ${c.help}`);
    }
    lines.push('');
    lines.push('All commands print JSON to stdout. Errors print JSON to stderr and exit non-zero.');
    lines.push('See SKILL.md and api-guide.md for the full guide.');
    process.stdout.write(lines.join('\n') + '\n');
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
        printHelp();
        return;
    }
    const { positional, flags } = parseArgs(argv);
    const name = positional[0];
    if (!name) {
        printHelp();
        return;
    }
    if (flags.help === true || flags.h === true) {
        const cmd = commands.find(c => c.name === name);
        if (cmd) {
            process.stdout.write(`${cmd.name}\n\n${cmd.help}\n`);
            return;
        }
        printHelp();
        return;
    }
    const cmd = commands.find(c => c.name === name);
    if (!cmd) {
        process.stderr.write(`Unknown command: ${name}\n\n`);
        printHelp();
        process.exit(2);
    }
    await run(() => cmd.run({ positional: positional.slice(1), flags }));
}

// Only run main() when this file is the entry point, not when imported by tests.
const isMainEntry = (() => {
    try {
        return process.argv[1] && (process.argv[1].endsWith('jt.ts') || process.argv[1].endsWith('jt.js'));
    } catch {
        return false;
    }
})();
if (isMainEntry) {
    void main();
}
