import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";

  // Subdomain routing: local.heypearl.io
  // Root → /local. Everything else passes through — affiliate auth is enforced
  // by [slug]/layout.tsx (redirects to login) and the API (validates cookie + filters by tag).
  // No slug hardcoding needed — any new affiliate works automatically.
  if (hostname.startsWith("local.")) {
    const url = req.nextUrl.clone();
    if (pathname === "/" || pathname === "/local") {
      url.pathname = "/local";
      return NextResponse.rewrite(url);
    }
    if (pathname === "/prices" || pathname === "/pricing") {
      url.pathname = "/localpricing";
      return NextResponse.rewrite(url);
    }
    if (pathname === "/schedule") {
      url.pathname = "/localschedule";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Subdomain routing: v2.heypearl.io → root rewrites to /v2 (sales page), /schedule → /v2schedule
  if (hostname.startsWith("v2.")) {
    const url = req.nextUrl.clone();
    if (pathname === "/" || pathname === "") {
      url.pathname = "/v2";
      return NextResponse.rewrite(url);
    }
    if (pathname === "/schedule") {
      url.pathname = "/v2schedule";
      return NextResponse.rewrite(url);
    }
    // Single-segment slugs: /[slug] → /v2/[slug] (affiliate landing pages)
    // Excludes cashoffer client routes and known internal paths
    const parts = pathname.split("/").filter(Boolean);
    const EXCLUDED = ["cashoffer", "v2", "v2schedule", "api", "_next", "favicon", "opengraph-image", "twitter-image"];
    if (parts.length === 1 && !EXCLUDED.includes(parts[0])) {
      url.pathname = `/v2/${parts[0]}`;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
