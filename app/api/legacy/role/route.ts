import type { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requestUser(request);
  return user ? Response.json({ role: user.roles }) : Response.json({ status: false, message: "Authentication required" }, { status: 401 });
}
