import { requireUser } from "@/lib/auth";
import { ServicesManager } from "@/components/ServicesManager";
export default async function ServicesPage(){await requireUser("admin");return <ServicesManager/>}
