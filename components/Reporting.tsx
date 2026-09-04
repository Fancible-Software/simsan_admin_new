"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client-api";
import { money, shortDate } from "@/lib/format";
import type { FormRecord, FormType } from "@/lib/types";
import { Icon } from "@/components/Icons";

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
    <form className="reporting-filter-card" onSubmit={run}>
      <div className="reporting-filter-intro">
        <span className="reporting-filter-mark"><Icon name="report"/></span>
        <div><strong>Build your report</strong><span>Choose a period and document type</span></div>
      </div>
      <div className="reporting-controls">
        <Field label="From" htmlFor="report-start">
          <div className="reporting-control-shell date-control"><span className="reporting-control-icon"><Icon name="calendar"/></span><input id="report-start" type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} required/></div>
        </Field>
        <Field label="To" htmlFor="report-end">
          <div className="reporting-control-shell date-control"><span className="reporting-control-icon"><Icon name="calendar"/></span><input id="report-end" type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required/></div>
        </Field>
        <Field label="Record type" htmlFor="report-type">
          <div className="reporting-control-shell select-control"><span className="reporting-control-icon"><Icon name="invoice"/></span><select id="report-type" value={type} onChange={(event) => setType(event.target.value as FormType)}><option value="FORM">Invoices</option><option value="QUOTE">Quotes</option></select><span className="reporting-select-arrow"><Icon name="chevron-down"/></span></div>
        </Field>
        <button className="button reporting-run-button" disabled={busy}>{busy ? "Running…" : "Run report"}</button>
      </div>
    </form>
    {data && <>
      <section className="stats"><div className="stat-card"><span>Records</span><strong>{data.numberOfSales}</strong></div><div className="stat-card"><span>Total</span><strong>{money(data.totalSales)}</strong></div><div className="stat-card"><span>Average</span><strong>{money(data.averageSale)}</strong></div><div className="stat-card"><span>Unique customers</span><strong>{data.uniqueCustomers}</strong></div></section>
      <section className="card"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Email</th><th>City</th><th>Total</th><th>Created by</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.formId}><td>{shortDate(row.createdAt)}</td><td>{row.customerName}</td><td>{row.customerEmail}</td><td>{row.customerCity}, {row.customerProvince}</td><td>{money(row.final_amount)}</td><td>{row.creatorName || "—"}</td></tr>)}</tbody></table>{!data.rows.length && <div className="empty">No records in this period.</div>}</div></section>
    </>}
  </>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="field reporting-field"><label htmlFor={htmlFor}>{label}</label>{children}</div>;
}
