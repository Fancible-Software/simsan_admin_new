import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const province = request.nextUrl.searchParams.get("province") || request.nextUrl.searchParams.get("province_id") || "";
    const result = await query<{ city: string; province_id: string }>(`SELECT DISTINCT city,province_id FROM ${table("location")} WHERE province_id=$1 ORDER BY city`, [province]);
    return ok(result.rows);
  } catch (error) { return handleError(error); }
}
