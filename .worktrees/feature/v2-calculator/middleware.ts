import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";

  // Subdomain routing: local.heypearl.io
  // Root → /local. /pricing, /schedule served by host-aware app/pricing and app/schedule.
  // Everything else passes through to app/[slug]/ catalog.
  if (hostname.startsWith("local.")) {
    const url = req.nextUrl.clone();
    if (pathname === "/" || pathname === "/local") {
      url.pathname = "/local";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Subdomain routing: v2.heypearl.io
  // Root → /v2 (god landing). /pricing and /schedule served by host-aware app/pricing and app/schedule.
  // Affiliate slugs pass through directly to app/[slug]/ catalog — no rewrite needed.
  if (hostname.startsWith("v2.")) {
    const url = req.nextUrl.clone();
    if (pathname === "/" || pathname === "") {
      url.pathname = "/v2";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Subdomain routing: affiliate.heypearl.io → /affiliate (rewrite keeps URL clean)
  if (hostname.startsWith("affiliate.")) {
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/affiliate/opengraph-image") ||
      pathname.startsWith("/affiliate/twitter-image")
    ) {
      return NextResponse.next();
    }
    if (pathname === "/" || pathname === "/affiliate") {
      const url = req.nextUrl.clone();
      url.pathname = "/affiliate";
      return NextResponse.rewrite(url);
    }
  }

  // Wildcard affiliate card routing: [slug].heypearl.io → /card/[slug]
  const KNOWN_SUBDOMAINS = ["geo", "v2", "local", "affiliate", "www"];
  const hostParts = hostname.split(".");
  if (
    hostParts.length === 3 &&
    hostname.endsWith(".heypearl.io") &&
    !KNOWN_SUBDOMAINS.includes(hostParts[0]) &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/favicon") &&
    !/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf)$/i.test(pathname)
  ) {
    const affiliateSlug = hostParts[0];
    const url = req.nextUrl.clone();
    url.pathname = `/card/${affiliateSlug}`;
    return NextResponse.rewrite(url);
  }

  // Block direct access to /v2 on main domain — it lives at v2.heypearl.io now
  if (pathname === "/v2" || pathname === "/v2/") {
    return NextResponse.redirect("https://v2.heypearl.io");
  }

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow the login page through
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get("admin_auth")?.value;
  const validToken = process.env.ADMIN_TOKEN ?? "geo-admin-authenticated";

  if (token === validToken) return NextResponse.next();

  // Redirect to login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
