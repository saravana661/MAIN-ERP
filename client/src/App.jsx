import { useEffect, useState } from "react";
import { api, clearToken, getToken } from "./api.js";
import { Layout } from "./Layout.jsx";
import { Loading } from "./components.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MasterPage } from "./pages/MasterPage.jsx";
import { BillingPage, PurchasePage } from "./pages/OperationsPages.jsx";
import { AuditPage, ReportsPage } from "./pages/ReportsPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

const masterPages = new Set(["Items", "Vendors", "Categories", "Units", "Packaging", "Users", "Roles"]);

function Page({ page }) {
  if (page === "Dashboard") return <DashboardPage />;
  if (masterPages.has(page)) return <MasterPage name={page} />;
  if (page === "Purchase Orders") return <PurchasePage />;
  if (page === "Goods Receiving") return <PurchasePage receipt />;
  if (page === "Current Stock") return <InventoryPage />;
  if (page === "Stock Ledger") return <InventoryPage ledger />;
  if (page === "Opening Stock") return <InventoryPage opening />;
  if (page === "Stock Adjustment") return <InventoryPage adjustment />;
  if (page === "New Bill") return <BillingPage />;
  if (page === "Bill History") return <BillingPage history />;
  if (page === "Reports") return <ReportsPage />;
  if (page === "Audit History") return <AuditPage />;
  if (page === "Settings") return <SettingsPage />;
  return <DashboardPage />;
}

export function App() {
  const [user, setUser] = useState(null); const [page, setPage] = useState("Dashboard"); const [checking, setChecking] = useState(Boolean(getToken()));
  useEffect(() => { if (!getToken()) return; api("/auth/me").then((result) => setUser(result.user)).catch(() => clearToken()).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="app-loading"><Loading message="Opening Main ERP…" /></div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <Layout page={page} setPage={setPage} user={user} onLogout={() => { clearToken(); setUser(null); }}><Page page={page} /></Layout>;
}
