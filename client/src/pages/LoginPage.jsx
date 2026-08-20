import { useState } from "react";
import { api, setToken } from "../api.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "admin@example.com", password: "ChangeMe!123" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError("");
    try { const result = await api("/auth/login", { method: "POST", body: form }); setToken(result.token); onLogin(result.user); }
    catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="login-brand"><span className="brand-mark">M</span><div><h1>Main ERP</h1><p>Grocery Wholesale & Inventory</p></div></div><h2>Welcome back</h2><p className="muted">Sign in to manage your business.</p>{error && <div className="alert error">{error}</div>}<label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label className="field"><span>Password</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><button className="button primary login-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button><p className="login-help">Initial credentials are prefilled for the seeded administrator.</p></form></div>;
}

