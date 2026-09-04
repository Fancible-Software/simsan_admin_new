import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const [counts, trend] = await Promise.all([
      query<{ activeServices: string; forms: string; revenue: string; users: string }>(
        `SELECT
          (SELECT COUNT(*) FROM ${table("service")} WHERE "isActive"=1 AND "isDeleted"=FALSE)::text AS "activeServices",
          (SELECT COUNT(*) FROM ${table("form")} WHERE type='FORM')::text AS forms,
          coalesce((SELECT SUM(final_amount::numeric) FROM ${table("form")} WHERE type='FORM'),0)::text AS revenue,
          (SELECT COUNT(*) FROM ${table("user")} WHERE is_deleted=0 AND is_verified=TRUE)::text AS users`,
      ),
      query<{ day: string; count: string; revenue: string }>(
        `SELECT to_char(date_trunc('day',"createdAt"),'YYYY-MM-DD') AS day,COUNT(*)::text AS count,coalesce(SUM(final_amount::numeric),0)::text AS revenue FROM ${table("form")} WHERE type='FORM' AND "createdAt">=CURRENT_DATE-INTERVAL '29 days' GROUP BY 1 ORDER BY 1`,
      ),
    ]);
    const row = counts.rows[0];
    const data = { activeServices: Number(row.activeServices), invoices: Number(row.forms), revenue: Number(row.revenue), verifiedUsers: Number(row.users), trend: trend.rows.map((item) => ({ ...item, count: Number(item.count), revenue: Number(item.revenue) })) };
    return ok({ ...data, active_services_count: data.activeServices, feedback_count: data.invoices, revenue_count: data.revenue, verified_admin_count: data.verifiedUsers });
  } catch (error) { return handleError(error); }
}
