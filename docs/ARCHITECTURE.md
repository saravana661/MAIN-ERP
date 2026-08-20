# Architecture and data rules

## Services

- `client/`: React/Vite responsive ERP interface.
- `server/`: Express REST API, JWT authorization, PDF billing, and business services.
- MongoDB: source of truth for masters, documents, ledger, balances, settings, and audit events.

## Main collections

`users`, `roles`, `categories`, `units`, `items`, `packaging`, `vendors`, `purchaseOrders`, `purchaseReceipts`, `invoices`, `stockBalances`, `stockTransactions`, `settings`, `billTemplates`, and `auditLogs`.

## Inventory design

Every item declares a base unit. Weight items normally use `GRAM`, volume items `ML`, and countable items `PIECE`. Units store a conversion factor; packages store the quantity already expressed in the item’s base unit.

For example, a 50 KG Toor Dal receipt becomes `50,000 GRAM`. A billed line of 50 × 200 g packages becomes `10,000 GRAM`; the central `InventoryService` produces a final balance of `40,000 GRAM` and writes the ledger record alongside it.

Only the following server operations can move stock: opening stock, purchase receipt, invoice, invoice cancellation/sales return, and stock adjustment. The `stockBalances` collection must never be edited directly.

## Atomicity

Goods receipts, invoices, cancellations, opening stock, and adjustments use MongoDB transactions. Run MongoDB as a replica set; the provided `docker-compose.yml` starts a development single-node replica set for this reason.

