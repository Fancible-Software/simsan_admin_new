import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const result = await query<{ x: string; y: string }>(`SELECT COUNT("formId")::text AS x,to_char(date_trunc('day',"createdAt"),'DD-MM-YYYY') AS y FROM ${table("form")} WHERE "createdAt">=CURRENT_DATE-INTERVAL '29 days' GROUP BY date_trunc('day',"createdAt") ORDER BY date_trunc('day',"createdAt")`);
    return ok(result.rows.map((row) => ({ x: Number(row.x), y: row.y })));
  } catch (error) { return handleError(error); }
}
