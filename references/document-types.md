# JobTread Document Types and Statuses

Documents in JobTread represent financial transactions tied to jobs and
accounts. Each document has a `type` and a `status` that determine its
lifecycle stage.

## Document Types

| Type | Description | Direction |
| --- | --- | --- |
| `bidRequest` | A request for bids/proposals sent to vendors | Outgoing |
| `customerOrder` | A proposal or order presented to a customer | Outgoing |
| `customerInvoice` | An invoice billed to a customer | Outgoing |
| `vendorOrder` | A purchase order sent to a vendor | Outgoing |
| `vendorBill` | A bill received from a vendor | Incoming |

## Document Statuses

| Status | Description |
| --- | --- |
| `draft` | Document is being edited, not yet sent |
| `pending` | Document has been sent/issued, awaiting response |
| `approved` | Document has been approved/accepted |
| `sent` | Document has been sent (used for some types) |
| `rejected` | Document was rejected by the recipient |
| `void` | Document has been voided |

## Common Lifecycle Patterns

### Customer Orders (Proposals)
`draft` → `pending` → `approved` (or `rejected`)

### Customer Invoices
`draft` → `pending` → `approved`

### Vendor Orders (Purchase Orders)
`draft` → `pending` → `approved`

### Vendor Bills
`draft` → `pending` → `approved`

## Key Fields for Filtering

- `type` — the document type (see table above)
- `status` — the lifecycle status
- `price` — the document total before tax
- `priceWithTax` — the document total including tax
- `tax` — the tax amount
- `cost` — the cost amount
- `balance` — the outstanding balance (price minus payments)
- `amountPaid` — the total amount paid against this document
- `includeInBudget` — whether this document is included in job budget calculations
- `issueDate` — the date the document was issued
- `dueDate` — the date payment is due
