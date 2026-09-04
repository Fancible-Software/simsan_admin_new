import { redirect } from "next/navigation";
export default async function LegacyEditor({searchParams}:{searchParams:Promise<{type?:string}>}){const type=(await searchParams).type;redirect(type==="QUOTE"?"/admin/quotes/new":"/admin/invoices/new")}
