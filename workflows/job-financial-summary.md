# Workflow: Job Financial Summary

Produce a financial summary for a JobTread job, aggregating documents by
type and status.

## Steps

1. **Run the summary aggregation.**
   - CLI: `npx tsx jt.ts get-job-summary --job-id=<jobId>`
   - Returns documents grouped by `type` and `status` with sums for
     `amountPaid`, `cost`, `count`, and `priceWithTax`.

2. **Optional — fetch the job's basic info** (name, number, status).
   - CLI: `npx tsx jt.ts get-job --job-id=<jobId>`

3. **Interpret the groups:**
   - `customerOrder` — proposals/orders sent to the customer
   - `vendorOrder` — purchase orders to vendors
   - `vendorBill` — bills from vendors
   - `customerInvoice` — invoices billed to the customer
   - `bidRequest` — bid requests sent to vendors

4. **For each group, report:**
   - `count`, total `priceWithTax`, total `cost`, `amountPaid`
   - Profit = `priceWithTax - cost` where applicable

5. **Optional — PDF any document.**
   - CLI: `npx tsx jt.ts get-document-pdf --document-id=<docId>`
