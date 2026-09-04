import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import type { Service } from "@/lib/types";
import { serviceSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const active = request.nextUrl.searchParams.get("active") === "true";
    const skip = Math.max(0, Number(request.nextUrl.searchParams.get("skip") || 0));
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || (active ? 200 : 10))));
    const where = active ? `WHERE "isActive"=1 AND "isDeleted"=FALSE` : "";
    const [rows, count] = await Promise.all([
      query<Service>(`SELECT * FROM ${table("service")} ${where} ORDER BY priority ASC NULLS LAST,"serviceId" ASC OFFSET $1 LIMIT $2`, [skip, limit]),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table("service")} ${where}`),
    ]);
    return ok({ rows: rows.rows, total: Number(count.rows[0].count) });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const input = serviceSchema.parse(await request.json());
    const result = await query<Service>(
      `INSERT INTO ${table("service")} ("serviceName",price,"isActive",priority,"createdBy") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("serviceName") DO NOTHING RETURNING *`,
      [input.serviceName, String(input.price), input.isActive, input.priority, `${auth.user.first_name} ${auth.user.last_name}`],
    );
    if (!result.rows[0]) return fail("A service with this name already exists", 409);
    logger.info("service.created", { actorId: auth.user.id, serviceId: result.rows[0].serviceId });
    return ok(result.rows[0], "Service created", 201);
  } catch (error) { return handleError(error); }
}
