import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requestUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requestUser(request);
  return user ? ok(user) : fail("Authentication required", 401);
}
