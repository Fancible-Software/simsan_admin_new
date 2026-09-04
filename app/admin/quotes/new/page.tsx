import { requireUser } from "@/lib/auth";
import { FormEditor } from "@/components/FormEditor";
export default async function NewQuote(){const user=await requireUser();return <FormEditor type="QUOTE" canUseInvoices={user.roles === "admin"}/>}
