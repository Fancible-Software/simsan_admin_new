import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { configurationSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

interface Context { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const result = await query(`SELECT * FROM ${table("configurations")} WHERE id=$1`, [Number((await params).id)]);
    return result.rows[0] ? ok(result.rows[0]) : fail("Configuration not found", 404);
  } catch (error) { return handleError(error); }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const id = Number((await params).id);
    const input = configurationSchema.parse(await request.json());
    const duplicate = await query(`SELECT 1 FROM ${table("configurations")} WHERE lower(key)=$1 AND id<>$2`, [input.key, id]);
    if (duplicate.rowCount) return fail("A configuration with this key already exists", 409);
    const result = await query(`UPDATE ${table("configurations")} SET key=$1,value=$2,"isImage"=$3,"updatedAt"=NOW() WHERE id=$4 RETURNING *`, [input.key, input.value, input.isImage, id]);
    if (!result.rows[0]) return fail("Configuration not found", 404);
    logger.info("configuration.updated", { actorId: auth.user?.id, configurationId: id, key: input.key, isImage: input.isImage });
    return ok(result.rows[0], "Configuration updated");
  } catch (error) { return handleError(error); }
}
