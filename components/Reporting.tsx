"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client-api";
import { money, shortDate } from "@/lib/format";
import type { FormRecord, FormType } from "@/lib/types";

interface Result { rows: FormRecord[]; numberOfSales: number; totalSales: number; averageSale: number; uniqueCustomers: number }

export function Reporting() {
  const now = new Date();
  const ago = new Date(now);
  ago.setMonth(now.getMonth() - 1);
  const [start, setStart] = useState(ago.toISOString().slice(0, 10));
  const [end, setEnd] = useState(now.toISOString().slice(0, 10));
  const [type, setType] = useState<FormType>("FORM");
  const [data, setData] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function run(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setData(await api<Result>("/api/analytics", { method: "POST", body: JSON.stringify({ startDate: start, endDate: end, type }) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!data?.rows.length) return;
    setExporting(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/export?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&type=${type}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(payload.message || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Report_Simsan_${start}_To_${end}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return <>
    <div className="page-head"><div><span className="eyebrow">Business intelligence</span><h1>Reporting</h1><p>Review a period and export a native Excel workbook with Sales and Analytics sheets.</p></div>{data && <button className="button" disabled={!data.rows.length || exporting} onClick={download}>{exporting ? "Preparing…" : "Download Excel"}</button>}</div>
    {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
    <form className="card form-grid" onSubmit={run} style={{ marginBottom: 20 }}>
      <Field label="From"><input type="date" value={start} onChange={(event) => setStart(event.target.value)} required/></Field>
      <Field label="To"><input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required/></Field>
      <Field label="Record type"><select value={type} onChange={(event) => setType(event.target.value as FormType)}><option value="FORM">Invoices</option><option value="QUOTE">Quotes</option></select></Field>
      <div className="field" style={{ justifyContent: "end" }}><button className="button" disabled={busy}>{busy ? "Running…" : "Run report"}</button></div>
    </form>
    {data && <>
      <section className="stats"><div className="stat-card"><span>Records</span><strong>{data.numberOfSales}</strong></div><div className="stat-card"><span>Total</span><strong>{money(data.totalSales)}</strong></div><div className="stat-card"><span>Average</span><strong>{money(data.averageSale)}</strong></div><div className="stat-card"><span>Unique customers</span><strong>{data.uniqueCustomers}</strong></div></section>
      <section className="card"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Email</th><th>City</th><th>Total</th><th>Created by</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.formId}><td>{shortDate(row.createdAt)}</td><td>{row.customerName}</td><td>{row.customerEmail}</td><td>{row.customerCity}, {row.customerProvince}</td><td>{money(row.final_amount)}</td><td>{row.creatorName || "—"}</td></tr>)}</tbody></table>{!data.rows.length && <div className="empty">No records in this period.</div>}</div></section>
    </>}
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
