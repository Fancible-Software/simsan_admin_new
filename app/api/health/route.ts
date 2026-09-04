import { handleError, ok } from "@/lib/api";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return ok({ database: "connected" }, "Healthy");
  } catch (error) { return handleError(error); }
}
