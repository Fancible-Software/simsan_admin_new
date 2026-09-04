import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { logger } from "@/lib/logger";

const allowedTypes = new Map([["image/png", ".png"], ["image/jpeg", ".jpg"]]);
const filesystemMaxBytes = 80 * 1024 * 1024;
const serverlessMaxBytes = 3 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return fail("An image file is required", 400);
    const extension = allowedTypes.get(file.type);
    if (!extension) return fail("Only PNG and JPEG images are allowed", 400);
    const maxBytes = process.env.VERCEL ? serverlessMaxBytes : filesystemMaxBytes;
    if (file.size > maxBytes) return fail(`The image must be ${maxBytes / 1024 / 1024} MB or smaller`, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (process.env.VERCEL) {
      const url = `data:${file.type};base64,${bytes.toString("base64")}`;
      logger.info("configuration.image_uploaded", { actorId: auth.user.id, bytes: file.size, mimeType: file.type, storage: "inline" });
      return ok({ file_name: file.name, url }, "File uploaded successfully");
    }
    const directory = process.env.IMAGE_UPLOAD_PATH
      ? path.resolve(/* turbopackIgnore: true */ process.env.IMAGE_UPLOAD_PATH)
      : path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    await writeFile(path.join(directory, fileName), bytes, { flag: "wx" });
    const url = `/uploads/${fileName}`;
    logger.info("configuration.image_uploaded", { actorId: auth.user.id, fileName, bytes: file.size, mimeType: file.type, storage: "filesystem" });
    return ok({ file_name: fileName, url }, "File uploaded successfully");
  } catch (error) { return handleError(error); }
}
