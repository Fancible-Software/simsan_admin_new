import { requireUser } from "@/lib/auth";
import { FormEditor } from "@/components/FormEditor";
export default async function EditForm({params}:{params:Promise<{id:string}>}){await requireUser("admin");return <FormEditor type="FORM" id={Number((await params).id)}/>}
