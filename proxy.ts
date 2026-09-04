import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

function allowedOrigin(origin: string | null) {
  if (!origin) return null;
  const allowed = (process.env.CORS_DOMAINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function addCors(response: NextResponse, origin: string | null, path: string) {
  const allowed = allowedOrigin(origin);
  if (!allowed) {
    if (origin) logger.warn("cors.origin_denied", { origin, path });
    return response;
  }
  response.headers.set("access-control-allow-origin", allowed);
  response.headers.set("access-control-allow-credentials", "true");
  response.headers.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("access-control-allow-headers", "Content-Type,Authorization,X-Requested-With,X-Request-Id");
  response.headers.append("vary", "Origin");
  return response;
}

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const { pathname } = request.nextUrl;
  logger.info("http.request.received", { requestId, method: request.method, path: pathname });

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("x-request-id", requestId);
    return addCors(response, request.headers.get("origin"), pathname);
  }

  let response: NextResponse;
  if (pathname === "/auth/login" && request.method === "POST") {
    response = NextResponse.rewrite(new URL("/api/auth/login", request.url), { request: { headers } });
  } else if (/^\/invoice\/mark-as-invoice\/\d+\/[^/]+$/.test(pathname)) {
    const [, , , id, uuid] = pathname.split("/");
    const destination = new URL(`/api/forms/${id}/convert`, request.url);
    destination.searchParams.set("uuid", uuid);
    destination.searchParams.set("legacy", "true");
    response = NextResponse.rewrite(destination, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }
  response.headers.set("x-request-id", requestId);
  return addCors(response, request.headers.get("origin"), pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2)$).*)"],
};
