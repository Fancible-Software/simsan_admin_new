import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || "SF";
  return <div className="app-stage"><div className="app-shell"><Sidebar user={user}/><main className="main"><header className="topbar"><div className="topbar-context"><strong>Operations hub</strong><span>Property services · Canada</span></div><div className="topbar-user"><span className="live-dot">Live</span><div className="topbar-identity"><strong>{user.first_name} {user.last_name}</strong><span>{user.email}</span></div><span className="user-avatar" aria-hidden="true">{initials}</span></div></header><div className="content">{children}</div></main></div></div>;
}
