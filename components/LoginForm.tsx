"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import type { User } from "@/lib/types";

export function LoginForm() {
  const router = useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await api<User>("/api/auth/login", { method:"POST", body:JSON.stringify({email:form.get("email"),password:form.get("password")}) });
      router.push(user.is_verified ? (user.roles === "admin" ? "/admin/invoices" : "/admin/quotes") : "/verify"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in"); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack">{error&&<div className="error">{error}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required autoFocus/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required/></div><button className="button" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form>;
}
