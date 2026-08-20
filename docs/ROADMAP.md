# Production hardening roadmap

The functional ERP modules described in the supplied document are represented in this project. The follow-up work below is for production deployment and optional extensions.

1. Set up daily encrypted MongoDB backups, a restore drill, and environment-secret management.
2. Deploy the React build and API behind HTTPS, with a production MongoDB replica set.
3. Add barcode-scanner, GST-accounting, batch/expiry, customer-credit, multi-warehouse, and multi-branch extensions as business needs require.
4. Expand automated integration tests around the production MongoDB topology and permission matrix.

## Core business invariant

`stockBalances.currentBaseQty` is only a cached current-state projection. The stock ledger is the traceable record of every inventory movement. A balance update and its ledger entry are committed in one MongoDB transaction.

