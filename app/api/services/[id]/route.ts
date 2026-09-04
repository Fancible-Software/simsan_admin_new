import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import type { Service } from "@/lib/types";
import { serviceSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

interface Context { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const result = await query<Service>(`SELECT * FROM ${table("service")} WHERE "serviceId"=$1`, [Number((await params).id)]);
    return result.rows[0] ? ok(result.rows[0]) : fail("Service not found", 404);
  } catch (error) { return handleError(error); }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const id = Number((await params).id);
    const input = serviceSchema.parse(await request.json());
    const duplicate = await query(`SELECT 1 FROM ${table("service")} WHERE lower("serviceName")=lower($1) AND "serviceId"<>$2`, [input.serviceName, id]);
    if (duplicate.rowCount) return fail("A service with this name already exists", 409);
    const result = await query<Service>(`UPDATE ${table("service")} SET "serviceName"=$1,price=$2,"isActive"=$3,priority=$4,"updatedAt"=NOW() WHERE "serviceId"=$5 RETURNING *`, [input.serviceName, String(input.price), input.isActive, input.priority, id]);
    if (!result.rows[0]) return fail("Service not found", 404);
    logger.info("service.updated", { actorId: auth.user?.id, serviceId: id });
    return ok(result.rows[0], "Service updated");
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const result = await query<Service>(`UPDATE ${table("service")} SET "isDeleted"=NOT "isDeleted","deletedBy"=$1,"updatedAt"=NOW() WHERE "serviceId"=$2 RETURNING *`, [auth.user.email, Number((await params).id)]);
    if (!result.rows[0]) return fail("Service not found", 404);
    logger.info(result.rows[0].isDeleted ? "service.deleted" : "service.restored", { actorId: auth.user.id, serviceId: result.rows[0].serviceId });
    return ok(result.rows[0], result.rows[0].isDeleted ? "Service deleted" : "Service restored");
  } catch (error) { return handleError(error); }
}
