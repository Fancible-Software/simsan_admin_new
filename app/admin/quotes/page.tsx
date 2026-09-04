import { requireUser } from "@/lib/auth";
import { RecordList } from "@/components/RecordList";
export default async function QuotesPage(){const user=await requireUser();return <RecordList type="QUOTE" role={user.roles}/>}
