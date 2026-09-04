import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Sidebar } from "@/components/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || "SF";
  return <div className="app-stage"><div className="app-shell"><Sidebar user={user}/><main className="main"><header className="topbar"><div className="topbar-context"><span className="topbar-mark"><Icon name="dashboard"/></span><div><strong>Field operations</strong><span>Keep every property and customer moving</span></div></div><div className="topbar-user"><Link className="topbar-shortcut icon-tooltip" href="/admin/quotes" aria-label="Open quotes"><Icon name="quote"/></Link>{user.roles === "admin"&&<Link className="topbar-shortcut icon-tooltip" href="/admin/email" aria-label="Open email campaigns"><Icon name="mail"/></Link>}<span className="live-dot">Live</span><div className="topbar-identity"><strong>{user.first_name} {user.last_name}</strong><span>{user.email}</span></div><span className="user-avatar" aria-hidden="true">{initials}</span></div></header><div className="content">{children}</div></main></div></div>;
}
