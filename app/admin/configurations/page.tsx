import { requireUser } from "@/lib/auth";
import { ConfigurationsManager } from "@/components/ConfigurationsManager";
export default async function ConfigurationsPage(){await requireUser("admin");return <ConfigurationsManager/>}
