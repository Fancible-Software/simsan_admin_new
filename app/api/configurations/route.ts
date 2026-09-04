import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { configurationSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const result = await query(`SELECT * FROM ${table("configurations")} ORDER BY id`);
    return ok(result.rows);
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const input = configurationSchema.parse(await request.json());
    const exists = await query(`SELECT 1 FROM ${table("configurations")} WHERE lower(key)=$1`, [input.key]);
    if (exists.rowCount) return fail("A configuration with this key already exists", 409);
    const result = await query(`INSERT INTO ${table("configurations")} (key,value,"isImage","createdBy") VALUES ($1,$2,$3,$4) RETURNING *`, [input.key, input.value, input.isImage, String(auth.user.id)]);
    logger.info("configuration.created", { actorId: auth.user.id, configurationId: result.rows[0]?.id, key: input.key, isImage: input.isImage });
    return ok(result.rows[0], "Configuration created", 201);
  } catch (error) { return handleError(error); }
}
