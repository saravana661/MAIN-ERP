# Main ERP

A grocery wholesale ERP foundation built from the supplied functional specification. It uses React for the browser UI, Express for the API, and MongoDB for transactional data.

## Included modules

- JWT authentication, administrator setup, roles, permissions, and user management.
- Dashboard with today’s sales/purchases, stock value, low-stock alerts, bills, and recent movements.
- Item, category, vendor, unit, and packaging master data.
- Purchase orders, goods receiving, purchase history, purchase expense report, and vendor report.
- Opening stock, current stock, stock adjustments, stock ledger, stock report, and transaction report.
- New bill, bill history, safe cancellation/stock restoration, invoice numbering, and PDF download/reprint.
- Company settings and configurable bill template settings.
- Sales reports, date filters, and CSV-ready report API responses.
- Audit logs for master, configuration, purchase, invoice, and stock actions.

The server and browser application are both implemented. The remaining scope is normal production hardening (backup automation, deployment credentials, and UX enhancements), not absent ERP modules. See [architecture notes](docs/ARCHITECTURE.md) and [API reference](docs/API.md).

## Prerequisites

- Node.js 20 or later
- MongoDB 7 or later (or a MongoDB Atlas connection string)

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. Run `npm install` in both `server` and `client`.
3. Seed the initial roles and administrator:

   ```powershell
   npm run seed --prefix server
   ```

4. Start both apps in separate terminals:

   ```powershell
   npm run dev --prefix server
   npm run dev --prefix client
   ```

5. Visit `http://localhost:5173` and log in with the seeded credentials from `server/.env.example`. Change that password immediately.

## Design rules

- Never edit `stockBalances` directly. Every change must go through `InventoryService`.
- Business quantities are converted to an item's base unit before storage.
- Final stock validation is performed on the API, never trusted to the browser.
- Completed transactions are retained for traceability; later phases should cancel, return, or reverse them rather than delete them.
