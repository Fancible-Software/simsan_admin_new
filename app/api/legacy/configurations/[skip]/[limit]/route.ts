import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ skip: string; limit: string }> }) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const { skip: rawSkip, limit: rawLimit } = await params;
    const skip = Math.max(0, Number(rawSkip)); const limit = Math.min(100, Math.max(1, Number(rawLimit)));
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM ${table("configurations")} ORDER BY id OFFSET $1 LIMIT $2`, [skip, limit]),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table("configurations")}`),
    ]);
    return Response.json({ status: true, count: Number(count.rows[0].count), data: rows.rows });
  } catch (error) { return handleError(error); }
}
