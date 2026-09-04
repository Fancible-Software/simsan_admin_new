import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; status: string }> }) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const { id: rawId, status: rawStatus } = await params;
    const id = Number(rawId); const status = Number(rawStatus);
    if (![0, 1].includes(status)) return fail("Invalid status", 400);
    if (id === auth.user.id) return fail("You cannot deactivate your own account", 400);
    const protectedEmail = (process.env.PRIMARY_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || "admin@simsanfrasermain.com").toLowerCase();
    const result = await query(`UPDATE ${table("user")} SET is_active=$1,"updatedAt"=NOW() WHERE id=$2 AND is_deleted=0 AND lower(email)<>$3`, [status, id, protectedEmail]);
    if (!result.rowCount) return fail("User not found or protected", 404);
    logger.info("user.status_changed", { actorId: auth.user.id, userId: id, isActive: status });
    return ok(null, "User status updated");
  } catch (error) { return handleError(error); }
}
