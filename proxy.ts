import { NextResponse, type NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 128 * 1024;

function isSameOrigin(request: NextRequest, origin: string) {
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
    return originUrl.host === requestHost && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}

export function proxy(request: NextRequest) {
  if (MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && !isSameOrigin(request, origin)) {
      return jsonError("Origen de solicitud no permitido.", 403);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonError("La solicitud es demasiado grande.", 413);
    }

    const hasBody = contentLength > 0 || request.headers.has("transfer-encoding");
    const contentType = request.headers.get("content-type") ?? "";
    if (hasBody && !contentType.toLowerCase().startsWith("application/json")) {
      return jsonError("El contenido debe enviarse como JSON.", 415);
    }
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: "/api/:path*" };
