import { useEffect, useState } from "react";

export function useAsync(load, dependencies = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    load().then((data) => alive && setState({ loading: false, data, error: "" })).catch((error) => alive && setState({ loading: false, data: null, error: error.message }));
    return () => { alive = false; };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export function Loading({ message = "Loading…" }) { return <div className="empty-state">{message}</div>; }
export function ErrorMessage({ message }) { return <div className="alert error">{message}</div>; }

export function PageHeader({ title, description, action }) {
  return <div className="page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function Card({ title, children, className = "" }) { return <section className={`card ${className}`}><h2>{title}</h2>{children}</section>; }

export function Button({ children, variant = "primary", className = "", ...props }) { return <button className={`button ${variant} ${className}`} {...props}>{children}</button>; }

export function DataTable({ columns, rows, empty = "No records found." }) {
  if (!rows?.length) return <div className="empty-state">{empty}</div>;
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row._id || row.id || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : (column.key.split(".").reduce((value, key) => value?.[key], row) ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}

export function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;
}

export function Field({ label, name, value, onChange, type = "text", required, options, placeholder, step = "any" }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{options ? <select name={name} value={value ?? ""} onChange={onChange} required={required}><option value="">Select {label}</option>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input name={name} type={type} value={value ?? ""} onChange={onChange} required={required} placeholder={placeholder} step={step} />}</label>;
}

export function Notice({ children, type = "success" }) { return <div className={`alert ${type}`}>{children}</div>; }

