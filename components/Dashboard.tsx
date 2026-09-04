"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client-api";
import { money, shortDate } from "@/lib/format";
import type { DashboardGranularity, DashboardRange, DashboardRangePreset } from "@/lib/dashboard";

interface Summary {
  activeServices: number;
  totalServices: number;
  verifiedUsers: number;
  invoices: number;
  revenue: number;
  quotes: number;
  quoteValue: number;
  averageInvoice: number;
  uniqueCustomers: number;
  returningCustomers: number;
  discounts: number;
  staleQuotes: number;
  allInvoices: number;
  allRevenue: number;
}

interface RankedItem { name: string; invoiceCount: number; quoteCount: number; revenue: number }
interface LocationItem extends Omit<RankedItem, "name"> { location: string }
interface TrendItem { period: string; invoiceCount: number; quoteCount: number; revenue: number; quoteValue: number }
interface RecentItem { formId: number; type: "FORM" | "QUOTE"; customerName: string; customerCity: string; finalAmount: string; createdAt: string }
interface DashboardData {
  range: DashboardRange;
  summary: Summary;
  comparison: { invoices: number | null; revenue: number | null; quotes: number | null; quoteValue: number | null };
  trend: TrendItem[];
  topServices: (RankedItem & { serviceId: number })[];
  topLocations: LocationItem[];
  team: RankedItem[];
  recent: RecentItem[];
}

const presets: { value: DashboardRangePreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Delta({ value }: { value: number | null }) {
  const positive = value === null || value >= 0;
  return <span className={`metric-delta ${positive ? "up" : "down"}`}>{value === null ? "New" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}<small> vs prior</small></span>;
}

function formatRange(range?: DashboardRange) {
  if (!range) return "Loading period";
  const formatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: range.days > 300 ? "numeric" : undefined, timeZone: "UTC" });
  return `${formatter.format(new Date(`${range.start}T00:00:00Z`))} – ${formatter.format(new Date(`${range.end}T00:00:00Z`))}`;
}

export function Dashboard() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => { const date = new Date(today); date.setDate(date.getDate() - 29); return date; }, [today]);
  const [preset, setPreset] = useState<DashboardRangePreset>("30d");
  const [customStart, setCustomStart] = useState(localIso(monthAgo));
  const [customEnd, setCustomEnd] = useState(localIso(today));
  const [appliedCustom, setAppliedCustom] = useState({ start: localIso(monthAgo), end: localIso(today) });
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range: preset });
    if (preset === "custom") {
      params.set("start", appliedCustom.start);
      params.set("end", appliedCustom.end);
    }
    api<DashboardData>(`/api/dashboard?${params}`, { signal: controller.signal })
      .then(setData)
      .catch((reason) => { if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [preset, appliedCustom]);

  function applyCustom(event: FormEvent) {
    event.preventDefault();
    if (customStart && customEnd) {
      setLoading(true);
      setError("");
      setAppliedCustom({ start: customStart, end: customEnd });
    }
  }

  function selectPreset(value: DashboardRangePreset) {
    if (value === preset) return;
    setLoading(true);
    setError("");
    setPreset(value);
  }

  const summary = data?.summary;
  const returnRate = summary?.uniqueCustomers ? summary.returningCustomers / summary.uniqueCustomers * 100 : 0;

  return <div className={`dashboard ${loading ? "is-loading" : ""}`}>
    <div className="page-head dashboard-head">
      <div><h1>Dashboard</h1><p>Revenue, demand and team activity—one clear view of what is moving the company.</p></div>
      <div className="dashboard-head-actions"><Link className="button dashboard-action-primary" href="/admin/quotes/new"><span aria-hidden="true">＋</span> New quote</Link><Link className="button secondary" href="/admin/invoices/new">New invoice</Link></div>
    </div>

    <section className="dashboard-filter" aria-label="Dashboard time range">
      <div className="range-presets">{presets.map((item) => <button key={item.value} type="button" aria-pressed={preset === item.value} className={preset === item.value ? "active" : ""} onClick={() => selectPreset(item.value)}>{item.label}</button>)}</div>
      {preset === "custom" && <form className="custom-range" onSubmit={applyCustom}>
        <label><span>From</span><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} required/></label>
        <label><span>To</span><input type="date" value={customEnd} min={customStart} max={localIso(today)} onChange={(event) => setCustomEnd(event.target.value)} required/></label>
        <button className="button small" type="submit">Apply dates</button>
      </form>}
      <div className="dashboard-filter-status"><span>{formatRange(data?.range)}</span><strong className="dashboard-loading" role="status" aria-live="polite">{loading ? "Refreshing…" : "Up to date"}</strong></div>
    </section>

    {error && <div className="error dashboard-error">{error}</div>}

    <section className="dashboard-kpis" aria-label="Key performance indicators">
      <article className="kpi-card kpi-primary"><div className="kpi-label"><span>Billed revenue</span><Delta value={data ? data.comparison.revenue : 0}/></div><strong>{summary ? money(summary.revenue) : "—"}</strong><p>{summary ? `${summary.allInvoices.toLocaleString()} invoices · ${money(summary.allRevenue)} all time` : "Loading revenue"}</p><div className="kpi-orbit" aria-hidden="true"/></article>
      <article className="kpi-card"><div className="kpi-label"><span>Invoices issued</span><Delta value={data ? data.comparison.invoices : 0}/></div><strong>{summary?.invoices.toLocaleString() ?? "—"}</strong><p>Completed customer records</p></article>
      <article className="kpi-card quote"><div className="kpi-label"><span>Open quote value</span><Delta value={data ? data.comparison.quoteValue : 0}/></div><strong>{summary ? money(summary.quoteValue) : "—"}</strong><p>{summary?.quotes.toLocaleString() ?? "—"} active opportunities</p></article>
      <article className="kpi-card"><div className="kpi-label"><span>Quotes created</span><Delta value={data ? data.comparison.quotes : 0}/></div><strong>{summary?.quotes.toLocaleString() ?? "—"}</strong><p>New work under consideration</p></article>
    </section>

    <section className="dashboard-metrics" aria-label="Supporting metrics">
      <div><span>Average invoice</span><strong>{summary ? money(summary.averageInvoice) : "—"}</strong><small>Typical completed job</small></div>
      <div><span>Unique customers</span><strong>{summary?.uniqueCustomers.toLocaleString() ?? "—"}</strong><small>Customers billed in period</small></div>
      <div><span>Returning customers</span><strong>{summary ? `${returnRate.toFixed(0)}%` : "—"}</strong><small>{summary?.returningCustomers ?? "—"} with repeat business</small></div>
      <div><span>Discounts granted</span><strong>{summary ? money(summary.discounts) : "—"}</strong><small>Invoice value adjusted</small></div>
    </section>

    <section className="dashboard-main-grid">
      <article className="dashboard-panel trend-panel">
        <div className="panel-head"><div><span className="panel-kicker">Momentum</span><h2>Revenue & pipeline</h2></div><div className="chart-legend"><span className="invoice">Billed</span><span className="quote">Quoted</span></div></div>
        {data?.trend.length ? <RevenueChart data={data.trend} granularity={data.range.granularity}/> : <div className="empty">No activity in this period.</div>}
      </article>
      <article className="dashboard-panel pulse-panel">
        <div className="panel-head"><div><span className="panel-kicker">Capacity</span><h2>Operations pulse</h2></div></div>
        <div className="capacity-ring" style={{ "--capacity": `${summary?.totalServices ? summary.activeServices / summary.totalServices * 100 : 0}%` } as React.CSSProperties}><div><strong>{summary?.activeServices ?? "—"}</strong><span>of {summary?.totalServices ?? "—"} services active</span></div></div>
        <div className="pulse-list"><div><span>Verified team access</span><strong>{summary?.verifiedUsers ?? "—"}</strong></div><div className={summary?.staleQuotes ? "attention" : ""}><span>Quotes older than 30 days</span><strong>{summary?.staleQuotes ?? "—"}</strong></div></div>
        <p className="pulse-note">{summary?.staleQuotes ? `${summary.staleQuotes} quote${summary.staleQuotes === 1 ? " needs" : "s need"} a follow-up.` : "Quote follow-ups are currently clear."}</p>
      </article>
    </section>

    <section className="dashboard-insights-grid">
      <RankedPanel title="Services driving work" kicker="Demand" rows={data?.topServices || []}/>
      <LocationPanel rows={data?.topLocations || []}/>
      <TeamPanel rows={data?.team || []}/>
    </section>

    <section className="dashboard-panel recent-panel">
      <div className="panel-head"><div><span className="panel-kicker">Latest movement</span><h2>Recent activity</h2></div><Link href="/admin/invoices" className="panel-link">View all invoices</Link></div>
      {data?.recent.length ? <div className="recent-list">{data.recent.map((item) => <Link href={`/admin/forms/${item.formId}/edit`} key={item.formId} className="recent-row"><span className={`recent-icon ${item.type === "QUOTE" ? "quote" : "invoice"}`}>{item.type === "QUOTE" ? "Q" : "I"}</span><span className="recent-customer"><strong>{item.customerName}</strong><small>{item.customerCity || "Location not set"}</small></span><span className={`badge ${item.type === "QUOTE" ? "quote" : ""}`}>{item.type === "QUOTE" ? "Quote" : "Invoice"}</span><strong className="recent-value">{money(item.finalAmount)}</strong><time>{shortDate(item.createdAt)}</time><span className="recent-arrow">→</span></Link>)}</div> : <div className="empty">No records in this period.</div>}
    </section>
  </div>;
}

function RevenueChart({ data, granularity }: { data: TrendItem[]; granularity: DashboardGranularity }) {
  const width = 760; const height = 250; const padX = 20; const padTop = 18; const padBottom = 32;
  const max = Math.max(1, ...data.flatMap((item) => [item.revenue, item.quoteValue]));
  const point = (value: number, index: number) => ({ x: data.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (data.length - 1)), y: padTop + (1 - value / max) * (height - padTop - padBottom) });
  const invoicePoints = data.map((item, index) => point(item.revenue, index));
  const quotePoints = data.map((item, index) => point(item.quoteValue, index));
  const path = (points: { x: number; y: number }[]) => points.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  const area = `${path(invoicePoints)} L${invoicePoints.at(-1)?.x || 0},${height - padBottom} L${invoicePoints[0]?.x || 0},${height - padBottom} Z`;
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];
  const formatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: granularity === "month" ? undefined : "numeric", timeZone: "UTC" });
  return <div className="revenue-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Billed and quoted value over the selected period">
    <defs><linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff755b" stopOpacity=".3"/><stop offset="1" stopColor="#ff755b" stopOpacity="0"/></linearGradient></defs>
    {[0, .25, .5, .75, 1].map((value) => <line key={value} x1={padX} x2={width - padX} y1={padTop + value * (height - padTop - padBottom)} y2={padTop + value * (height - padTop - padBottom)} className="chart-gridline"/>)}
    <path d={area} fill="url(#revenueArea)"/><path d={path(invoicePoints)} className="chart-line invoice"/><path d={path(quotePoints)} className="chart-line quote"/>
    {invoicePoints.map((item, index) => <g key={data[index].period}><circle cx={item.x} cy={item.y} r="4" className="chart-dot invoice"/><title>{`${data[index].period}: ${money(data[index].revenue)} billed, ${money(data[index].quoteValue)} quoted`}</title></g>)}
    {labelIndexes.map((index) => <text key={index} x={invoicePoints[index]?.x} y={height - 7} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}>{formatter.format(new Date(`${data[index].period}T00:00:00Z`))}</text>)}
  </svg></div>;
}

function RankedPanel({ title, kicker, rows }: { title: string; kicker: string; rows: RankedItem[] }) {
  const max = Math.max(1, ...rows.map((row) => row.invoiceCount + row.quoteCount));
  return <article className="dashboard-panel ranked-panel"><div className="panel-head"><div><span className="panel-kicker">{kicker}</span><h2>{title}</h2></div></div>{rows.length ? <div className="ranked-list">{rows.map((row, index) => <div className="ranked-row" key={row.name}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.name}</strong><span className="rank-track"><i style={{ width: `${(row.invoiceCount + row.quoteCount) / max * 100}%` }}/></span><small>{row.invoiceCount} invoiced · {row.quoteCount} quoted</small></div><strong>{money(row.revenue)}</strong></div>)}</div> : <div className="empty compact">No service activity.</div>}</article>;
}

function LocationPanel({ rows }: { rows: LocationItem[] }) {
  return <article className="dashboard-panel location-panel"><div className="panel-head"><div><span className="panel-kicker">Markets</span><h2>Where revenue lands</h2></div></div>{rows.length ? <div className="location-list">{rows.map((row) => <div key={row.location}><span className="location-pin">⌖</span><div><strong>{row.location || "Unknown location"}</strong><small>{row.invoiceCount} invoices · {row.quoteCount} quotes</small></div><strong>{money(row.revenue)}</strong></div>)}</div> : <div className="empty compact">No location activity.</div>}</article>;
}

function TeamPanel({ rows }: { rows: RankedItem[] }) {
  return <article className="dashboard-panel team-panel"><div className="panel-head"><div><span className="panel-kicker">People</span><h2>Team output</h2></div></div>{rows.length ? <div className="team-list">{rows.map((row, index) => <div key={`${row.name}-${index}`}><span className="team-avatar">{row.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{row.name}</strong><small>{row.invoiceCount} invoices · {row.quoteCount} quotes</small></div><strong>{money(row.revenue)}</strong></div>)}</div> : <div className="empty compact">No team activity.</div>}</article>;
}
