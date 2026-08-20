import { useMemo, useState } from "react";
import { api } from "../api.js";
import { Button, Card, DataTable, ErrorMessage, Field, Loading, Modal, Notice, PageHeader, useAsync } from "../components.jsx";

const configurations = {
  Items: {
    resource: "items", title: "Item Master", description: "Define the products that flow through purchasing, stock, and billing.",
    fields: [["itemCode", "Item code", "text", true], ["name", "Item name", "text", true], ["category", "Category"], ["baseUnit", "Base unit", "text", true], ["purchaseUnit", "Purchase unit", "text", true], ["salesUnit", "Sales unit", "text", true], ["reorderLevel", "Reorder level", "number"], ["sellingPrice", "Selling price", "number"], ["taxRate", "Tax %", "number"]],
    columns: [["itemCode", "Code"], ["name", "Item"], ["category", "Category"], ["baseUnit", "Base unit"], ["sellingPrice", "Sell rate", (row) => `₹${Number(row.sellingPrice || 0).toFixed(2)}`], ["reorderLevel", "Reorder level"]]
  },
  Vendors: {
    resource: "vendors", title: "Vendor Master", description: "Maintain the wholesalers and suppliers you purchase from.",
    fields: [["vendorCode", "Vendor code", "text", true], ["name", "Vendor name", "text", true], ["contactPerson", "Contact person"], ["mobile", "Mobile"], ["email", "Email", "email"], ["city", "City"], ["gstNumber", "GST number"], ["creditDays", "Credit days", "number"]],
    columns: [["vendorCode", "Code"], ["name", "Vendor"], ["contactPerson", "Contact"], ["mobile", "Mobile"], ["city", "City"], ["creditDays", "Credit days"]]
  },
  Categories: {
    resource: "categories", title: "Category Master", description: "Group products for faster search and reporting.",
    fields: [["name", "Category name", "text", true], ["description", "Description"]], columns: [["name", "Category"], ["description", "Description"], ["active", "Active", (row) => row.active ? "Yes" : "No"]]
  },
  Units: {
    resource: "units", title: "Unit Master", description: "Set conversion factors to the smallest physical inventory unit.",
    fields: [["code", "Unit code", "text", true], ["name", "Unit name", "text", true], ["dimension", "Dimension", "select", true, ["WEIGHT", "VOLUME", "COUNT", "OTHER"]], ["conversionToBase", "Conversion to base", "number", true], ["baseUnit", "Base inventory unit", "select", true, [{ value: "true", label: "Yes" }, { value: "false", label: "No" }]]],
    columns: [["code", "Code"], ["name", "Unit"], ["dimension", "Dimension"], ["conversionToBase", "To base"], ["active", "Active", (row) => row.active ? "Yes" : "No"]]
  },
  Packaging: {
    resource: "packaging", title: "Packaging Master", description: "Connect sellable packs to the base quantity deducted from stock.",
    fields: [["item", "Item", "item", true], ["packageName", "Package name", "text", true], ["packageUnit", "Package unit", "text", true], ["baseQuantity", "Base quantity", "number", true], ["sellingRate", "Selling rate", "number", true], ["barcode", "Barcode"]],
    columns: [["item.name", "Item"], ["packageName", "Package"], ["packageUnit", "Unit"], ["baseQuantity", "Base qty"], ["sellingRate", "Selling rate", (row) => `₹${Number(row.sellingRate || 0).toFixed(2)}`]]
  },
  Roles: {
    resource: "roles", title: "Roles & Permissions", description: "Set the permitted ERP modules for each employee role.",
    fields: [["name", "Role name", "text", true], ["description", "Description"], ["permissions", "Permissions (comma separated)"]],
    columns: [["name", "Role"], ["description", "Description"], ["permissions", "Permissions", (row) => row.permissions?.join(", ")]]
  },
  Users: {
    resource: "users", title: "User Management", description: "Create employee accounts and give each one a role.",
    fields: [["name", "Full name", "text", true], ["email", "Email", "email", true], ["password", "Password", "password", true], ["role", "Role", "role", true]],
    columns: [["name", "Name"], ["email", "Email"], ["role.name", "Role"], ["active", "Active", (row) => row.active ? "Yes" : "No"]]
  }
};

const numericFields = new Set(["reorderLevel", "sellingPrice", "taxRate", "creditDays", "conversionToBase", "baseQuantity", "sellingRate"]);

function FormModal({ configuration, record, items, roles, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const data = { ...(record || {}) };
    if (Array.isArray(data.permissions)) data.permissions = data.permissions.join(", ");
    if (data.item?._id) data.item = data.item._id;
    if (data.role?._id) data.role = data.role._id;
    return data;
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  function change(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError("");
    const body = { ...form };
    for (const field of numericFields) if (body[field] !== undefined && body[field] !== "") body[field] = Number(body[field]);
    if (configuration.resource === "roles") body.permissions = String(body.permissions || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (configuration.resource === "units") body.baseUnit = body.baseUnit === true || body.baseUnit === "true";
    try { await api(`/masters/${configuration.resource}${record ? `/${record._id}` : ""}`, { method: record ? "PUT" : "POST", body }); onSaved(); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return <Modal title={`${record ? "Edit" : "New"} ${configuration.title.replace(" Master", "")}`} onClose={onClose}><form className="form-grid" onSubmit={submit}>{error && <div className="span-2"><ErrorMessage message={error}/></div>}{configuration.fields.map(([name, label, type = "text", required, options]) => {
    const selectOptions = type === "item" ? items.map((item) => ({ value: item._id, label: `${item.itemCode} — ${item.name}` })) : type === "role" ? roles.map((role) => ({ value: role._id, label: role.name.replaceAll("_", " ") })) : type === "select" ? options : null;
    return <Field key={name} name={name} label={label} type={type === "item" || type === "role" || type === "select" ? "text" : type} value={form[name]} onChange={change} required={name === "password" && record ? false : required} options={selectOptions} />;
  })}<div className="form-actions span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div></form></Modal>;
}

export function MasterPage({ name }) {
  const configuration = configurations[name]; const [version, setVersion] = useState(0); const [editing, setEditing] = useState(null); const [message, setMessage] = useState("");
  const result = useAsync(() => api(`/masters/${configuration.resource}?limit=100`).then((response) => response.data), [configuration.resource, version]);
  const items = useAsync(() => api("/masters/items?limit=100").then((response) => response.data), []);
  const roles = useAsync(() => api("/masters/roles?limit=100").then((response) => response.data), []);
  const columns = useMemo(() => [...configuration.columns.map(([key, label, render]) => ({ key, label, render })), { key: "actions", label: "", render: (row) => <div className="row-actions"><button onClick={() => setEditing(row)}>Edit</button>{!["roles", "users"].includes(configuration.resource) && row.active && <button className="danger-link" onClick={() => deactivate(row)}>Deactivate</button>}</div> }], [configuration]);
  async function deactivate(row) { if (!window.confirm(`Deactivate ${row.name || row.itemCode || row.vendorCode}?`)) return; try { await api(`/masters/${configuration.resource}/${row._id}`, { method: "DELETE" }); setVersion((value) => value + 1); setMessage("Record deactivated."); } catch (error) { setMessage(error.message); } }
  if (result.loading) return <Loading />;
  return <><PageHeader title={configuration.title} description={configuration.description} action={<Button onClick={() => setEditing({})}>+ Add {configuration.title.replace(" Master", "")}</Button>} />{message && <Notice type={message.includes("deactivated") ? "success" : "error"}>{message}</Notice>}{result.error ? <ErrorMessage message={result.error} /> : <Card title={`${result.data.length} records`}><DataTable rows={result.data} columns={columns} /></Card>}{editing && <FormModal configuration={configuration} record={editing._id ? editing : null} items={items.data || []} roles={roles.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setVersion((value) => value + 1); setMessage("Saved successfully."); }} />}</>;
}
