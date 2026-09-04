import { requireUser } from "@/lib/auth";
import { FormEditor } from "@/components/FormEditor";
export default async function NewInvoice(){await requireUser("admin");return <FormEditor type="FORM"/>}
