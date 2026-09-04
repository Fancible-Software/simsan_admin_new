import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { VerifyForm } from "@/components/VerifyForm";

export default async function VerifyPage() {
  const user = await currentUser(); if (!user) redirect("/login"); if (user.is_verified) redirect("/admin/invoices");
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-card"><div className="brand auth-brand"><BrandLogo priority sizes="290px"/></div><p className="eyebrow" style={{marginTop:42}}>Identity check</p><h2>Confirm it’s you.</h2><p className="muted">Enter the six-digit code sent to {user.email}.</p><VerifyForm/></div></section><section className="auth-art"><h1>Access,<br/>accounted for.</h1><p>Verification codes expire after 15 minutes and can only be used once.</p></section></main>;
}
