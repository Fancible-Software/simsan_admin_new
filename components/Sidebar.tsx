"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icons";

const links = [
  ["/admin/dashboard", "dashboard", "Dashboard"], ["/admin/invoices", "invoice", "Invoices"],
  ["/admin/quotes", "quote", "Quotes"], ["/admin/users", "users", "Users"],
  ["/admin/services", "services", "Services"], ["/admin/configurations", "settings", "Configurations"],
  ["/admin/email", "mail", "Email campaigns"], ["/admin/reporting", "report", "Reporting"],
] as const;

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname(); const router = useRouter();
  const [mobileOpen,setMobileOpen]=useState(false);
  const visible = user.roles === "admin" ? links : links.filter(([href]) => href === "/admin/quotes");
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || "SF";
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  return <aside className={`sidebar ${mobileOpen?"mobile-open":""}`}>
    <Link href={user.roles === "admin" ? "/admin/dashboard" : "/admin/quotes"} className="brand" aria-label="Simsan Fraser Maintenance home" onClick={()=>setMobileOpen(false)}><BrandLogo priority sizes="190px"/></Link>
    <button className="mobile-menu-toggle icon-tooltip" type="button" aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen?"Close navigation":"Open navigation"} onClick={()=>setMobileOpen(open=>!open)}><Icon name={mobileOpen?"close":"menu"}/></button>
    <div className="sidebar-menu" id="mobile-navigation">
      <nav className="sidebar-nav" aria-label="Main navigation">{visible.map(([href, icon, label]) => <Link key={href} href={href} title={label} data-label={label} aria-label={label} aria-current={pathname.startsWith(href) ? "page" : undefined} className={pathname.startsWith(href) ? "active" : ""} onClick={()=>setMobileOpen(false)}><Icon name={icon}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-footer"><div className="user-chip" title={`${user.first_name} ${user.last_name}`}><span className="user-avatar" aria-hidden="true">{initials}</span><span className="user-details"><strong>{user.first_name} {user.last_name}</strong><small>{user.roles.replace("_", " ")}</small></span></div><button onClick={logout} title="Sign out" aria-label="Sign out" data-label="Sign out"><Icon name="logout"/><span>Sign out</span></button></div>
    </div>
  </aside>;
}
