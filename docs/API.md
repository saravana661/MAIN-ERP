# REST API reference

All endpoints other than `POST /api/auth/login` require `Authorization: Bearer <JWT>`.

| Area | Endpoint | Purpose |
|---|---|---|
| Authentication | `POST /api/auth/login`, `GET /api/auth/me` | Sign in and validate session |
| Dashboard | `GET /api/dashboard` | KPI cards, low stock, recent movement |
| Masters | `/api/masters/{items,vendors,categories,units,packaging,users,roles}` | List/create/update/deactivate master data |
| Purchase | `GET/POST /api/transactions/purchase-orders` | Purchase order history and creation |
| Receiving | `GET/POST /api/transactions/purchase-receipts` | Goods receiving and stock increase |
| Billing | `GET/POST /api/transactions/invoices` | Invoice history and creation |
| Billing | `POST /api/transactions/invoices/:id/cancel` | Cancels invoice and restores stock |
| Inventory | `GET /api/inventory/stock`, `GET /api/inventory/ledger` | Current stock and traceable ledger |
| Inventory | `POST /api/transactions/opening-stock`, `POST /api/transactions/stock-adjustments` | Controlled stock corrections |
| Reports | `GET /api/reports/{expense,vendor,transactions,stock,sales}` | Report data; use `?fromDate=&toDate=&format=csv` where supported |
| Audit | `GET /api/audit` | Chronological business and configuration audit events |
| Settings | `GET/PUT /api/settings`, `/api/settings/bill-templates` | Company and print-layout configuration |
| PDF | `GET /api/pdf/invoices/:id` | Printable/reprintable invoice PDF |

Dates use ISO-8601 strings. IDs are MongoDB ObjectIds. The API calculates monetary totals and base quantities itself; browser-provided totals and stock claims are not trusted.
