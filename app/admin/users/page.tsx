import { requireUser } from "@/lib/auth";
import { UsersManager } from "@/components/UsersManager";
export default async function UsersPage(){await requireUser("admin");return <UsersManager/>}
