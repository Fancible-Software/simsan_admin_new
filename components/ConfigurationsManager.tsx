"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { shortDate } from "@/lib/format";

interface Config { id: number; key: string; value: string; isImage: boolean; createdBy: string; createdAt: string }

export function ConfigurationsManager() {
  const [rows, setRows] = useState<Config[]>([]);
  const [editing, setEditing] = useState<Config | null | "new">(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Config[]>("/api/configurations").then(setRows).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load configurations")), []);
  useEffect(() => { load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const current = editing !== "new" ? editing : null;
    try {
      const file = form.get("file");
      let value = String(form.get("value") || "").trim();
      let isImage = form.get("isImage") === "on";
      if (file instanceof File && file.size > 0) {
        const upload = new FormData();
        upload.set("file", file);
        const uploaded = await api<{ file_name: string; url: string }>("/api/configurations/upload", { method: "POST", body: upload });
        value = uploaded.url;
        isImage = true;
      }
      if (!value) throw new Error("Enter a value or select an image to upload.");
      await api(current ? `/api/configurations/${current.id}` : "/api/configurations", {
        method: current ? "PUT" : "POST",
        body: JSON.stringify({ key: form.get("key"), value, isImage }),
      });
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const current = editing !== "new" ? editing : null;
  return <>
    <div className="page-head"><div><span className="eyebrow">Business details</span><h1>Configurations</h1><p>Values used on customer-facing invoices and quotes.</p></div><button className="button" onClick={() => setEditing(editing ? null : "new")}>{editing ? "Close form" : "Add configuration"}</button></div>
    {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
    {editing && <form className="card form-stack" onSubmit={save} style={{ marginBottom: 20 }}>
      <h2>{current ? "Edit" : "Create"} configuration</h2>
      <div className="form-grid">
        <Field label="Key"><input name="key" defaultValue={current?.key} placeholder="company_name" required/></Field>
        <Field label="Value or image URL"><input name="value" defaultValue={current?.value} placeholder="Text, URL, or upload below"/></Field>
        <Field label="Upload image"><input name="file" type="file" accept="image/png,image/jpeg"/></Field>
        <div className="field"><label><input type="checkbox" name="isImage" defaultChecked={current?.isImage}/> Treat the value as an image URL</label></div>
      </div>
      <div><button className="button" disabled={busy}>{busy ? "Saving…" : "Save configuration"}</button></div>
    </form>}
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Key</th><th>Value</th><th>Kind</th><th>Created</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.key}</strong></td><td style={{ maxWidth: 520, wordBreak: "break-word" }}>{row.isImage ? <a href={row.value} target="_blank" rel="noreferrer" style={{ color: "var(--spruce)" }}>View image</a> : row.value}</td><td><span className="badge">{row.isImage ? "Image" : "Text"}</span></td><td>{shortDate(row.createdAt)}</td><td><button className="button small secondary" onClick={() => setEditing(row)}>Edit</button></td></tr>)}</tbody></table>{!rows.length && <div className="empty">No configurations yet. Recommended keys: company_name, company_address, company_city, company_country, company_zip, gst and logo.</div>}</div></section>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
