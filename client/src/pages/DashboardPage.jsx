import { api } from "../api.js";
import { Card, DataTable, ErrorMessage, Loading, PageHeader, useAsync } from "../components.jsx";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export function DashboardPage() {
  const { data, error, loading } = useAsync(() => api("/dashboard").then((result) => result.data), []);
  if (loading) return <Loading />; if (error) return <ErrorMessage message={error} />;
  const cards = [["Today's sales", currency(data.todaySales), "Completed invoices"], ["Today's purchase", currency(data.todayPurchase), "Goods received"], ["Stock value", currency(data.currentStockValue), `${data.totalItems} active items`], ["Low stock", data.lowStockItems, "Needs attention"], ["Today's bills", data.todayBills, "Sales transactions"]];
  return <><PageHeader title="Good morning" description="Here is a live view of your grocery business." /><div className="kpi-grid">{cards.map(([title, value, text]) => <div className="kpi-card" key={title}><span>{title}</span><strong>{value}</strong><small>{text}</small></div>)}</div><div className="two-column"><Card title="Recent stock movements"><DataTable rows={data.recentTransactions} columns={[{ key: "createdAt", label: "Time", render: (row) => new Date(row.createdAt).toLocaleString("en-IN") }, { key: "transactionType", label: "Type", render: (row) => <span className={`badge ${row.transactionType === "SALE" ? "sale" : "purchase"}`}>{row.transactionType.replaceAll("_", " ")}</span> }, { key: "referenceNumber", label: "Reference" }, { key: "item.name", label: "Item" }, { key: "baseQuantity", label: "Base quantity", render: (row) => `${row.baseQuantity} ${row.item?.baseUnit || ""}` }]} /></Card><Card title="Low-stock items"><DataTable rows={data.lowStock} columns={[{ key: "item.itemCode", label: "Code" }, { key: "item.name", label: "Item" }, { key: "currentBaseQty", label: "Current stock", render: (row) => `${row.currentBaseQty} ${row.baseUnit}` }, { key: "item.reorderLevel", label: "Reorder level" }]} empty="All items are above their reorder level." /></Card></div></>;
}

