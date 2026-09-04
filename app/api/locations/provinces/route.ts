import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const result = await query<{ province_id: string; province_name: string }>(`SELECT DISTINCT province_id,province_name FROM ${table("location")} ORDER BY province_name`);
    return ok(result.rows);
  } catch (error) { return handleError(error); }
}
