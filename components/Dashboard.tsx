"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { money } from "@/lib/format";

interface Data { activeServices:number; invoices:number; revenue:number; verifiedUsers:number; trend:{day:string;count:number;revenue:number}[] }

export function Dashboard(){
  const [data,setData]=useState<Data|null>(null); const [error,setError]=useState("");
  useEffect(()=>{api<Data>("/api/dashboard").then(setData).catch((e)=>setError(e.message))},[]);
  const max=Math.max(1,...(data?.trend.map(x=>x.count)||[]));
  return <><div className="page-head"><div><span className="eyebrow">Overview</span><h1>Dashboard</h1><p>A quick read on the business today.</p></div></div>{error&&<div className="error">{error}</div>}<section className="stats"><div className="stat-card"><span>Invoice revenue</span><strong>{data?money(data.revenue):"—"}</strong><small>All recorded invoices</small></div><div className="stat-card"><span>Total invoices</span><strong>{data?.invoices??"—"}</strong><small>Customer records</small></div><div className="stat-card"><span>Active services</span><strong>{data?.activeServices??"—"}</strong><small>Ready to quote</small></div><div className="stat-card"><span>Verified users</span><strong>{data?.verifiedUsers??"—"}</strong><small>Team access</small></div></section><section className="card activity-card"><h2>Invoice activity <span>Last 30 days</span></h2>{data?.trend.length?<div className="chart">{data.trend.map(item=><div key={item.day} className="chart-bar" style={{height:`${Math.max(3,item.count/max*100)}%`}} data-label={`${item.day} · ${item.count} invoice${item.count===1?"":"s"} · ${money(item.revenue)}`}/>)}</div>:<div className="empty">No invoice activity in the last 30 days.</div>}</section></>;
}
