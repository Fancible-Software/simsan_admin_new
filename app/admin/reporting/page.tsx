import { requireUser } from "@/lib/auth";
import { Reporting } from "@/components/Reporting";
export default async function ReportingPage(){await requireUser("admin");return <Reporting/>}
