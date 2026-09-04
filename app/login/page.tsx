import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/admin/invoices");
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-card"><div className="brand auth-brand"><BrandLogo priority sizes="290px"/></div><p className="eyebrow" style={{marginTop:42}}>Secure operations</p><h2>Clock in.</h2><p className="muted">Your working ledger for estimates, invoices, crews and customer care.</p><LoginForm/></div></section><section className="auth-art"><h1>Every property,<br/>properly kept.</h1><p>A focused command post for the people and details behind Simsan Fraser Maintenance.</p></section></main>;
}
