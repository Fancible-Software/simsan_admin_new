import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { logger } from "@/lib/logger";
import { configurationSchema } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const body = await request.json();
    const id = Number(body.id);
    const input = configurationSchema.parse(body);
    const result = await query(`UPDATE ${table("configurations")} SET value=$1,"isImage"=$2,"updatedAt"=NOW() WHERE id=$3 RETURNING *`, [input.value, input.isImage, id]);
    if (!result.rows[0]) return fail("Configuration not found", 404);
    logger.info("configuration.updated", { actorId: auth.user?.id, configurationId: id, legacy: true });
    return ok(result.rows[0], "Configuration updated");
  } catch (error) { return handleError(error); }
}
