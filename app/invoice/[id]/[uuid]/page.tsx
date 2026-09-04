import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import { getDocument } from "@/lib/invoice";
export default async function InvoicePage({params}:{params:Promise<{id:string;uuid:string}>}){const {id,uuid}=await params;const data=await getDocument(Number(id),uuid,"FORM");if(!data)notFound();return <DocumentView data={data} label="Invoice"/>}
