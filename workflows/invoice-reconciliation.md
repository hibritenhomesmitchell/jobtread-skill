# Workflow: Invoice Reconciliation

Find open invoices, match payments, and identify outstanding balances for a
JobTread organization.

## Steps

1. **Get the organization ID** (if not already known).
   - CLI: `npx tsx jt.ts get-organization`
   - Raw: `{ "currentGrant": { "user": { "memberships": { "nodes": { "organization": { "id": {}, "name": {} } } } } } }`

2. **List open customer invoices.**
   - CLI: `npx tsx jt.ts get-open-invoices --org-id=<orgId>`
   - This filters to `type=customerInvoice`, `status=pending`, `price>0`,
     sorted by price descending.

3. **For each open invoice, check its balance.**
   - CLI: `npx tsx jt.ts get-document --document-id=<docId>`
   - The `balance` field shows the remaining amount owed.
   - `documentPayments.nodes` lists payments already applied.

4. **Find payments that haven't been applied to any invoice.**
   - CLI: `npx tsx jt.ts list-payments --org-id=<orgId>`
   - For each payment: `npx tsx jt.ts get-payment --payment-id=<payId>`
   - Payments whose `documentPayments.nodes` is empty are unapplied.

5. **Present a summary:**
   - Total open invoices and their combined balance
   - Each invoice with its balance and last payment date
   - Any unapplied payments that could be applied to outstanding invoices

6. **Optional — get a PDF of any invoice.**
   - CLI: `npx tsx jt.ts get-document-pdf --document-id=<docId>`
   - Returns a signed, short-lived URL that resolves to the PDF.
