import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import { getDocument } from "@/lib/invoice";
export default async function QuotePage({params}:{params:Promise<{id:string;uuid:string}>}){const {id,uuid}=await params;const data=await getDocument(Number(id),uuid,"QUOTE");if(!data)notFound();return <DocumentView data={data} label="Quote"/>}
