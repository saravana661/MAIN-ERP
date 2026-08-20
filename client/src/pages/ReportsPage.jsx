import { useState } from "react";
import { api } from "../api.js";
import {
  Button,
  Card,
  DataTable,
  ErrorMessage,
  Field,
  Loading,
  PageHeader,
  useAsync,
} from "../components.jsx";

/* ---------------------------------------------------------
   Common Helpers
--------------------------------------------------------- */

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN");
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN");
};

/* ---------------------------------------------------------
   Safe Object Renderers
--------------------------------------------------------- */

const displayItem = (value) => {
  if (!value) return "—";

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.itemCode ||
      value.code ||
      "—"
    );
  }

  return "—";
};

const displayVendor = (value) => {
  if (!value) return "—";

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.vendorCode ||
      value.code ||
      "—"
    );
  }

  return "—";
};

const displayCustomer = (value) => {
  if (!value) return "Walk-in Customer";

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.mobile ||
      "Walk-in Customer"
    );
  }

  return "Walk-in Customer";
};

/* ---------------------------------------------------------
   Report Definitions
--------------------------------------------------------- */

const reports = {
  expense: {
    title: "Purchase Expense",
    endpoint: "expense",

    columns: [
      {
        key: "date",
        label: "Date",
        render: (row) => formatDate(row.date),
      },

      {
        key: "grnNumber",
        label: "GRN",
      },

      {
        key: "vendor",
        label: "Vendor",
        render: (row) => displayVendor(row.vendor),
      },

      {
        key: "item",
        label: "Item",
        render: (row) => displayItem(row.item),
      },

      {
        key: "quantity",
        label: "Qty",
      },

      {
        key: "rate",
        label: "Rate",
        render: (row) => currency(row.rate),
      },

      {
        key: "amount",
        label: "Amount",
        render: (row) => currency(row.amount),
      },
    ],
  },

  vendor: {
    title: "Vendor-wise",
    endpoint: "vendor",

    columns: [
      {
        key: "vendorCode",
        label: "Code",
        render: (row) =>
          row.vendorCode ||
          row.vendor?.vendorCode ||
          "—",
      },

      {
        key: "vendor",
        label: "Vendor",
        render: (row) => displayVendor(row.vendor),
      },

      {
        key: "purchaseCount",
        label: "Purchases",
      },

      {
        key: "totalQuantity",
        label: "Total Quantity",
      },

      {
        key: "totalPurchaseAmount",
        label: "Purchase Amount",
        render: (row) =>
          currency(row.totalPurchaseAmount),
      },

      {
        key: "averagePurchaseRate",
        label: "Average Rate",
        render: (row) =>
          currency(row.averagePurchaseRate),
      },
    ],
  },

  transactions: {
    title: "Transactions",
    endpoint: "transactions",

    columns: [
      {
        key: "createdAt",
        label: "Date",
        render: (row) =>
          formatDateTime(row.createdAt),
      },

      {
        key: "transactionType",
        label: "Type",
      },

      {
        key: "referenceNumber",
        label: "Reference",
      },

      {
        key: "item",
        label: "Item",
        render: (row) =>
          displayItem(row.item),
      },

      {
        key: "baseQuantity",
        label: "Base Quantity",
      },

      {
        key: "amount",
        label: "Amount",
        render: (row) =>
          currency(row.amount),
      },
    ],
  },

  stock: {
    title: "Stock",
    endpoint: "stock",

    columns: [
      {
        key: "itemCode",
        label: "Code",
        render: (row) =>
          row.itemCode ||
          row.item?.itemCode ||
          "—",
      },

      {
        key: "item",
        label: "Item",
        render: (row) =>
          displayItem(row.item),
      },

      {
        key: "openingStock",
        label: "Opening",
        render: (row) =>
          Number(row.openingStock || 0),
      },

      {
        key: "purchaseQty",
        label: "Purchase",
        render: (row) =>
          Number(row.purchaseQty || 0),
      },

      {
        key: "salesQty",
        label: "Sales",
        render: (row) =>
          Number(row.salesQty || 0),
      },

      {
        key: "salesReturnQty",
        label: "Sales Return",
        render: (row) =>
          Number(row.salesReturnQty || 0),
      },

      {
        key: "adjustmentInQty",
        label: "Adjust. In",
        render: (row) =>
          Number(row.adjustmentInQty || 0),
      },

      {
        key: "adjustmentOutQty",
        label: "Adjust. Out",
        render: (row) =>
          Number(row.adjustmentOutQty || 0),
      },

      {
        key: "currentBaseQty",
        label: "Closing Stock",
        render: (row) =>
          Number(row.currentBaseQty || 0),
      },

      {
        key: "baseUnit",
        label: "Unit",
        render: (row) =>
          row.baseUnit ||
          row.item?.baseUnit ||
          "—",
      },

      {
        key: "stockValue",
        label: "Stock Value",
        render: (row) =>
          currency(row.stockValue),
      },

      {
        key: "status",
        label: "Status",
        render: (row) => (
          <span className="badge">
            {row.status || "—"}
          </span>
        ),
      },
    ],
  },

  sales: {
    title: "Sales",
    endpoint: "sales",

    columns: [
      {
        key: "date",
        label: "Date",
        render: (row) =>
          formatDate(row.date),
      },

      {
        key: "invoiceNumber",
        label: "Invoice",
      },

      {
        key: "customer",
        label: "Customer",
        render: (row) =>
          displayCustomer(row.customer),
      },

      {
        key: "paymentMethod",
        label: "Payment",
      },

      {
        key: "grandTotal",
        label: "Total",
        render: (row) =>
          currency(row.grandTotal),
      },
    ],
  },
};

/* ---------------------------------------------------------
   Reports Page
--------------------------------------------------------- */

export function ReportsPage() {
  const [report, setReport] = useState("transactions");

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  const definition = reports[report];

  const result = useAsync(
    () => {
      const params = new URLSearchParams();

      if (filters.fromDate) {
        params.append(
          "fromDate",
          filters.fromDate
        );
      }

      if (filters.toDate) {
        params.append(
          "toDate",
          filters.toDate
        );
      }

      const queryString = params.toString();

      const url =
        `/reports/${definition.endpoint}` +
        (queryString
          ? `?${queryString}`
          : "");

      return api(url).then((response) => {
        if (Array.isArray(response.data)) {
          return response.data;
        }

        return [];
      });
    },
    [
      report,
      filters.fromDate,
      filters.toDate,
    ]
  );

  function changeReport(key) {
    setReport(key);

    // Clear filters when switching reports
    setFilters({
      fromDate: "",
      toDate: "",
    });
  }

  function clearFilters() {
    setFilters({
      fromDate: "",
      toDate: "",
    });
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Use date filters for daily, monthly, or custom analysis."
      />

      {/* -------------------------------------------------
          Report Tabs
      ------------------------------------------------- */}

      <div className="report-tabs">
        {Object.entries(reports).map(
          ([key, value]) => (
            <button
              key={key}
              type="button"
              className={
                report === key
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeReport(key)
              }
            >
              {value.title}
            </button>
          )
        )}
      </div>

      {/* -------------------------------------------------
          Report Card
      ------------------------------------------------- */}

      <Card
        title={`${definition.title} Report`}
      >
        {/* Filters */}

        <div className="filters">
          <Field
            label="From date"
            name="fromDate"
            type="date"
            value={filters.fromDate}
            onChange={(event) =>
              setFilters({
                ...filters,
                fromDate:
                  event.target.value,
              })
            }
          />

          <Field
            label="To date"
            name="toDate"
            type="date"
            value={filters.toDate}
            onChange={(event) =>
              setFilters({
                ...filters,
                toDate:
                  event.target.value,
              })
            }
          />

          <Button
            type="button"
            variant="secondary"
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>

        {/* Loading */}

        {result.loading && (
          <Loading />
        )}

        {/* Error */}

        {!result.loading &&
          result.error && (
            <ErrorMessage
              message={result.error}
            />
          )}

        {/* Data */}

        {!result.loading &&
          !result.error && (
            <>
              {result.data &&
              result.data.length > 0 ? (
                <DataTable
                  rows={result.data}
                  columns={
                    definition.columns
                  }
                />
              ) : (
                <div className="empty-state">
                  No{" "}
                  {definition.title.toLowerCase()}{" "}
                  data found
                  {filters.fromDate ||
                  filters.toDate
                    ? " for the selected date range."
                    : "."}
                </div>
              )}
            </>
          )}
      </Card>
    </>
  );
}

/* ---------------------------------------------------------
   Audit Page
--------------------------------------------------------- */

export function AuditPage() {
  const result = useAsync(
    () =>
      api("/audit?limit=200").then(
        (response) =>
          response.data
      ),
    []
  );

  return (
    <>
      <PageHeader
        title="Audit History"
        description="Security and business events are retained as a chronological trace."
      />

      <Card title="Latest audit events">
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorMessage
            message={result.error}
          />
        ) : (
          <DataTable
            rows={result.data || []}
            columns={[
              {
                key: "createdAt",
                label: "When",
                render: (row) =>
                  formatDateTime(
                    row.createdAt
                  ),
              },

              {
                key: "actor",
                label: "User",
                render: (row) =>
                  row.actor?.name ||
                  row.actor?.email ||
                  "System",
              },

              {
                key: "action",
                label: "Action",
              },

              {
                key: "entityType",
                label: "Module",
              },

              {
                key: "entityId",
                label: "Record",
              },

              {
                key: "metadata",
                label: "Details",
                render: (row) =>
                  row.metadata
                    ? JSON.stringify(
                        row.metadata
                      )
                    : "—",
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}