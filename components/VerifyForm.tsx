"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

export function VerifyForm() {
  const router=useRouter(); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const data=new FormData(e.currentTarget);try{await api("/api/auth/verify",{method:"POST",body:JSON.stringify({otp:data.get("otp")})});router.push("/admin/dashboard");router.refresh();}catch(err){setError(err instanceof Error?err.message:"Verification failed");}finally{setBusy(false)}}
  async function resend(){setMessage("");setError("");try{const result=await api<{sent:boolean}>("/api/auth/resend",{method:"POST"});setMessage(result.sent?"A new code has been sent.":"Code created, but SMTP is not configured. Ask an administrator to configure mail.");}catch(err){setError(err instanceof Error?err.message:"Could not resend code")}}
  return <form className="form-stack" onSubmit={submit}>{error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}<div className="field"><label htmlFor="otp">Verification code</label><input id="otp" name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus/></div><button className="button" disabled={busy}>{busy?"Verifying…":"Verify account"}</button><button type="button" className="text-button" onClick={resend}>Send a new code</button></form>;
}
