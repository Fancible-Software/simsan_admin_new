import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError } from "@/lib/api";
import { query, table } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const rows = await query(`SELECT * FROM ${table("service")} WHERE "isActive"=1 AND "isDeleted"=FALSE ORDER BY priority ASC NULLS LAST,"serviceId" ASC`);
    return Response.json({ status: true, data: rows.rows });
  } catch (error) { return handleError(error); }
}
