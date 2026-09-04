import { requireUser } from "@/lib/auth";
import { EmailCampaigns } from "@/components/EmailCampaigns";
export default async function EmailPage(){await requireUser("admin");return <EmailCampaigns/>}
