import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { logger } from "@/lib/logger";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const id = Number((await params).id);
    const { is_active } = z.object({ is_active: z.coerce.number().int().min(0).max(1) }).parse(await request.json());
    if (id === auth.user.id && is_active === 0) return fail("You cannot deactivate your own account", 400);
    const protectedEmail = (process.env.PRIMARY_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || "admin@simsanfrasermain.com").toLowerCase();
    const result = await query(`UPDATE ${table("user")} SET is_active=$1,"updatedAt"=NOW() WHERE id=$2 AND is_deleted=0 AND lower(email)<>$3`, [is_active, id, protectedEmail]);
    if (result.rowCount) logger.info("user.status_changed", { actorId: auth.user.id, userId: id, isActive: is_active });
    return result.rowCount ? ok(null, "User status updated") : fail("User not found", 404);
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const id = Number((await params).id);
    if (id === auth.user.id) return fail("You cannot delete your own account", 400);
    const protectedEmail = (process.env.PRIMARY_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || "admin@simsanfrasermain.com").toLowerCase();
    const result = await query(`UPDATE ${table("user")} SET is_deleted=1,deleted_at=NOW(),deleted_by=$1,"updatedAt"=NOW() WHERE id=$2 AND is_deleted=0 AND lower(email)<>$3`, [auth.user.id, id, protectedEmail]);
    if (result.rowCount) logger.info("user.deleted", { actorId: auth.user.id, userId: id });
    return result.rowCount ? ok(null, "User deleted") : fail("User not found", 404);
  } catch (error) { return handleError(error); }
}
