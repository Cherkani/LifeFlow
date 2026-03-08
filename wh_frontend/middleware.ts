import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isDocumentNavigation = request.headers.get("sec-fetch-dest") === "document";
  const isRscRequest = request.headers.get("rsc") === "1";

  if (isDocumentNavigation && searchParams.has("_rsc") && !isRscRequest) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("_rsc");
    return NextResponse.redirect(url);
  }

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[^/]+$/.test(pathname);

  if (isAsset) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"]
};
