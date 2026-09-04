import { requireUser } from "@/lib/auth";
import { FormEditor } from "@/components/FormEditor";
export default async function NewQuote(){await requireUser("admin");return <FormEditor type="QUOTE"/>}
