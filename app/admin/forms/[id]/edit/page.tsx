import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { FormEditor } from "@/components/FormEditor";
import { query, table } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { FormType } from "@/lib/types";

export default async function EditForm({params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const id=Number((await params).id);
  if(user.roles!=="admin"){
    const form=await query<{type:FormType}>(`SELECT type FROM ${table("form")} WHERE "formId"=$1`,[id]);
    if(form.rows[0]?.type!=="QUOTE"){
      logger.warn("authorization.page_denied",{userId:user.id,formId:id,reason:"quote_editor_required"});
      redirect("/admin/quotes");
    }
  }
  return <FormEditor type="FORM" id={id} canUseInvoices={user.roles==="admin"}/>;
}
