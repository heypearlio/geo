"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A", pink: "#E8185C",
};

const DASHBOARD_PATHS = ["/leads", "/activity", "/change-password"];

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");

  const requiresAuth = DASHBOARD_PATHS.some(p => pathname.endsWith(p));

  useEffect(() => {
    if (!requiresAuth) return;
    fetch("/api/affiliate/me")
      .then(r => {
        if (!r.ok) { router.push(`/${slug}/login`); return null; }
        return r.json();
      })
      .then(data => { if (data?.name) setName(data.name); });
  }, [slug, requiresAuth, router]);

  if (!requiresAuth) return <>{children}</>;

  const NAV = [
    { href: `/${slug}/activity`, label: "Activity" },
    { href: `/${slug}/leads`, label: "Leads" },
  ];

  async function handleLogout() {
    await fetch("/api/affiliate/logout", { method: "POST" });
    router.push(`/${slug}/login`);
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#F0F2F8", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        display: "flex", alignItems: "center",
        padding: "0 16px", position: "sticky", top: 0, zIndex: 50,
        justifyContent: "space-between", minHeight: 52, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                color: active ? S.text : S.muted,
                fontWeight: active ? 700 : 400,
                fontSize: 14, padding: "6px 12px", borderRadius: 6,
                textDecoration: "none", background: active ? "#1a2d4a" : "transparent",
                borderBottom: active ? `2px solid ${S.pink}` : "2px solid transparent",
                whiteSpace: "nowrap",
              }}>
                {label}
              </Link>
            );
          })}
        </div>
        <span style={{ color: S.pink, fontWeight: 800, fontSize: 13, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
          {name ? `${name}` : "Dashboard"}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Link href={`/${slug}/change-password`} style={{ color: S.muted, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
            Settings
          </Link>
          <button onClick={handleLogout} style={{
            background: "none", border: `1px solid ${S.border}`, color: S.muted,
            borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Sign out
          </button>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
