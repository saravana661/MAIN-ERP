const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function getToken() { return localStorage.getItem("main-erp-token"); }
export function setToken(token) { localStorage.setItem("main-erp-token", token); }
export function clearToken() { localStorage.removeItem("main-erp-token"); }

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body });
  if (response.status === 401) clearToken();
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || "The request could not be completed.");
  }
  return response.status === 204 ? null : response.json();
}

export async function downloadInvoice(id, invoiceNumber) {
  const response = await fetch(`${API_URL}/pdf/invoices/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!response.ok) throw new Error("Could not generate invoice PDF.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url; link.download = `${invoiceNumber}.pdf`; link.click();
  URL.revokeObjectURL(url);
}

