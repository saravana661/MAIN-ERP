const sections = [
  { name: "Dashboard", icon: "⌂" },
  { heading: "Masters" },
  { name: "Items", icon: "▣" }, { name: "Vendors", icon: "♙" }, { name: "Categories", icon: "◇" }, { name: "Units", icon: "↔" }, { name: "Packaging", icon: "□" },
  { heading: "Purchase" },
  { name: "Purchase Orders", icon: "▤" }, { name: "Goods Receiving", icon: "↓" },
  { heading: "Inventory" },
  { name: "Current Stock", icon: "▦" }, { name: "Stock Ledger", icon: "☷" }, { name: "Opening Stock", icon: "↥" }, { name: "Stock Adjustment", icon: "±" },
  { heading: "Billing" },
  { name: "New Bill", icon: "+" }, { name: "Bill History", icon: "▤" },
  { heading: "Reports" },
  { name: "Reports", icon: "▥" }, { name: "Audit History", icon: "◴" },
  { heading: "Administration" },
  { name: "Users", icon: "♟" }, { name: "Roles", icon: "♙" }, { name: "Settings", icon: "⚙" }
];

export function Layout({ page, setPage, user, onLogout, children }) {
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">M</span><span>Main ERP<small>GROCERY WHOLESALE</small></span></div><nav>{sections.map((section, index) => section.heading ? <div className="nav-heading" key={`${section.heading}-${index}`}>{section.heading}</div> : <button key={section.name} className={`nav-item ${page === section.name ? "active" : ""}`} onClick={() => setPage(section.name)}><span>{section.icon}</span>{section.name}</button>)}</nav><div className="sidebar-footer"><strong>{user.name}</strong><span>{user.role?.replaceAll("_", " ")}</span><button onClick={onLogout}>Sign out</button></div></aside><main className="main"><header className="topbar"><div><span className="status-dot"/> System online</div><div>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div></header><div className="content">{children}</div></main></div>;
}
