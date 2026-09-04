import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { campaignEmail, sendMail } from "@/lib/mail";
import { logger } from "@/lib/logger";

interface Context { params: Promise<{ campaign: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await authorized(request, true); if (auth.response) return auth.response;
  const campaign = campaignEmail((await params).campaign);
  return new Response(campaign.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const campaign = campaignEmail((await params).campaign);
    const customers = await query<{ customerEmail: string }>(`SELECT DISTINCT "customerEmail" FROM ${table("form")} WHERE type='FORM' AND "customerEmail"<>''`);
    let sent = 0;
    for (const customer of customers.rows) if (await sendMail({ to: customer.customerEmail, ...campaign })) sent++;
    logger.info("campaign.completed", { actorId: auth.user?.id, campaign: (await params).campaign, recipientCount: customers.rowCount || 0, deliveredCount: sent });
    return ok({ recipients: customers.rowCount || 0, sent }, sent ? "Campaign sent" : "Campaign processed; configure SMTP to deliver messages");
  } catch (error) { return handleError(error); }
}
