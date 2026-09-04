import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError } from "@/lib/api";
import { query, table } from "@/lib/db";
import type { FormRecord } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ skip: string; limit: string }> }) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const { skip: rawSkip, limit: rawLimit } = await params;
    const skip = Math.max(0, Number(rawSkip)); const limit = Math.min(100, Math.max(1, Number(rawLimit)));
    const type = request.nextUrl.searchParams.get("type") === "QUOTE" ? "QUOTE" : "FORM";
    if (type === "FORM" && auth.user?.roles !== "admin") return Response.json({ status: false, message: "Administrator access required" }, { status: 403 });
    const search = (request.nextUrl.searchParams.get("searchTerm") || "").trim();
    const values: unknown[] = search ? [type, `%${search}%`, skip, limit] : [type, skip, limit];
    const offsetIndex = search ? 3 : 2;
    const where = search ? `f.type=$1 AND (f."customerName" ILIKE $2 OR f."customerEmail" ILIKE $2 OR coalesce(f."customerPhone",'') ILIKE $2 OR f."customerAddress" ILIKE $2 OR f."customerCity" ILIKE $2 OR f."customerPostalCode" ILIKE $2)` : "f.type=$1";
    const [rows, count] = await Promise.all([
      query<FormRecord>(`SELECT f.*,u.first_name,u.last_name FROM ${table("form")} f LEFT JOIN ${table("user")} u ON u.id::text=f."createdBy" WHERE ${where} ORDER BY f."formId" DESC OFFSET $${offsetIndex} LIMIT $${offsetIndex + 1}`, values),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table("form")} f WHERE ${where}`, search ? [type, `%${search}%`] : [type]),
    ]);
    return Response.json({ status: true, count: count.rows[0], data: rows.rows });
  } catch (error) { return handleError(error); }
}
