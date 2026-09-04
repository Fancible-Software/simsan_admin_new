import { requireUser } from "@/lib/auth";
import { RecordList } from "@/components/RecordList";
export default async function InvoicesPage(){const user=await requireUser("admin");return <RecordList type="FORM" role={user.roles}/>}
