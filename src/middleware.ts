import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth-edge";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

const adminPaths = ["/admin", "/api/admin"];

const viewerPaths = ["/profiles", "/watch", "/intro", "/api/media"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths, Next.js static assets, API health checks, and the
  // Telegram webhook (Telegram can't send our session cookie — this route
  // is secured by its own secret path segment + chat-id check instead).
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/telegram/webhook/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;
  const payload = await decrypt(session);

  // No session — redirect to login
  if (!payload) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // For API routes that need auth, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Has session — root redirect
  if (pathname === "/") {
    const redirectPath = payload.role === "admin" ? "/admin" : "/profiles";
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  // Admin-only routes
  const isAdminPath = adminPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isAdminPath && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/profiles", req.url));
  }

  // Viewer paths — both viewer and admin can access
  const isViewerPath = viewerPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isViewerPath) {
    return NextResponse.next();
  }

  // Admin paths — already handled above, but also allow admin
  if (isAdminPath && payload.role === "admin") {
    return NextResponse.next();
  }

  // Default: allow
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
