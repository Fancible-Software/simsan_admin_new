import { requireUser } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";

export default async function DashboardPage() { await requireUser("admin"); return <Dashboard/>; }
