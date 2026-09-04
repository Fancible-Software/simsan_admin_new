"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { money, shortDate } from "@/lib/format";
import { canCreateForm, canEditForm } from "@/lib/permissions";
import type { FormRecord, FormType, Role } from "@/lib/types";

interface PageData {
  rows: FormRecord[];
  total: number;
  summary: { totalValue: number; averageValue: number; uniqueCustomers: number };
}

const emptyData: PageData = {
  rows: [],
  total: 0,
  summary: { totalValue: 0, averageValue: 0, uniqueCustomers: 0 },
};

export function RecordList({ type, role }: { type: FormType; role: Role }) {
  const [data, setData] = useState<PageData>(emptyData);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const label = type === "FORM" ? "Invoice" : "Quote";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<PageData>(`/api/forms?type=${type}&skip=${page * 10}&limit=10&search=${encodeURIComponent(search)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load records");
    } finally {
      setLoading(false);
    }
  }, [page, search, type]);

  useEffect(() => {
    const id = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  async function remove(id: number) {
    if (!confirm(`Delete this ${label.toLowerCase()}?`)) return;
    try {
      await api(`/api/forms/${id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed");
    }
  }

  async function convert(id: number) {
    if (!confirm("Convert this quote to an invoice?")) return;
    try {
      await api(`/api/forms/${id}/convert`, { method: "POST" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Conversion failed");
    }
  }

  return <>
    <div className="page-head">
      <div>
        <span className="eyebrow">Customer records</span>
        <h1>{label}s</h1>
        <p>{data.total} {label.toLowerCase()}{data.total === 1 ? "" : "s"} on record.</p>
      </div>
      {canCreateForm(role, type) && <Link className="button" href={`/admin/${type === "FORM" ? "invoices" : "quotes"}/new`}>New {label.toLowerCase()}</Link>}
    </div>

    {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

    <section className="dashboard-kpis record-stats" style={{ marginBottom: 18 }} aria-label={`${label} summary`}>
      <article className="kpi-card kpi-primary">
        <div className="kpi-label"><span>{label}s on record</span></div>
        <strong>{data.total.toLocaleString()}</strong>
        <p>{search ? "Matching current search" : "All time"}</p>
      </article>
      <article className={`kpi-card ${type === "QUOTE" ? "quote" : ""}`}>
        <div className="kpi-label"><span>Total {type === "FORM" ? "billed" : "quoted"} value</span></div>
        <strong>{money(data.summary.totalValue)}</strong>
        <p>{search ? "Across matching records" : "All-time value"}</p>
      </article>
      <article className="kpi-card">
        <div className="kpi-label"><span>Average {label.toLowerCase()}</span></div>
        <strong>{money(data.summary.averageValue)}</strong>
        <p>Per {label.toLowerCase()}</p>
      </article>
      <article className="kpi-card">
        <div className="kpi-label"><span>Unique customers</span></div>
        <strong>{data.summary.uniqueCustomers.toLocaleString()}</strong>
        <p>By email address</p>
      </article>
    </section>

    <section className="card">
      <div className="toolbar">
        <input className="search" aria-label="Search records" placeholder="Search customer, email, phone or address…" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }}/>
        <span className="muted">Page {page + 1} of {Math.max(1, Math.ceil(data.total / 10))}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Total</th><th>Created</th><th>Created by</th><th>Actions</th></tr></thead>
          <tbody>{data.rows.map((row) => <tr key={row.formId}>
            <td><strong>{row.customerName}</strong><br/><span className={`badge ${type === "QUOTE" ? "quote" : ""}`}>{label} #{row.invoiceNumber}</span></td>
            <td>{row.customerEmail}<br/><span className="muted">{row.customerPhone || "—"}</span></td>
            <td>{row.customerCity}, {row.customerProvince}<br/><span className="muted">{row.customerPostalCode}</span></td>
            <td><strong>{money(row.final_amount)}</strong><br/><span className="muted">Before discount {money(row.total)}</span></td>
            <td>{shortDate(row.createdAt)}</td>
            <td>{row.creatorName || "—"}</td>
            <td><div className="actions">
              <a className="button small secondary" target="_blank" href={`/${type === "FORM" ? "invoice" : "quote"}/${row.formId}/${row.invoiceUuid}`}>View</a>
              {canEditForm(role, type) && <Link className="button small secondary" href={`/admin/forms/${row.formId}/edit`}>Edit</Link>}
              {role === "admin" && <>
                {type === "QUOTE" && <button className="button small secondary" onClick={() => convert(row.formId)}>Convert</button>}
                <button className="button small secondary danger" onClick={() => remove(row.formId)}>Delete</button>
              </>}
            </div></td>
          </tr>)}</tbody>
        </table>
        {!loading && !data.rows.length && <div className="empty">No {label.toLowerCase()}s found.</div>}
        {loading && <div className="empty">Loading…</div>}
      </div>
      <div className="pagination">
        <button className="button small secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <button className="button small secondary" disabled={(page + 1) * 10 >= data.total} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
    </section>
  </>;
}
