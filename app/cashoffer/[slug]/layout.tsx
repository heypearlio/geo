"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A", pink: "#16A34A",
};

const DASHBOARD_PATHS = ["/leads", "/change-password"];

export default function V2ClientLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);

  const requiresAuth = DASHBOARD_PATHS.some(p => pathname.endsWith(p));

  useEffect(() => {
    if (!requiresAuth) return;
    fetch("/api/v2client/me")
      .then(r => {
        if (!r.ok) { router.push(`/cashoffer/${slug}/login`); return null; }
        return r.json();
      })
      .then(data => {
        if (data?.name) setName(data.name);
        if (data?.isAffiliate) setIsAffiliate(true);
      });
  }, [slug, requiresAuth, router]);

  if (!requiresAuth) return <>{children}</>;

  const NAV = [
    { href: `/cashoffer/${slug}/leads`, label: "Leads" },
  ];

  async function handleLogout() {
    await fetch("/api/v2client/logout", { method: "POST" });
    router.push(`/cashoffer/${slug}/login`);
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#F0F2F8", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ color: S.pink, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
            {name ? `${name}'s Dashboard` : "Cash Offers Dashboard"}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  color: active ? S.text : S.muted,
                  fontWeight: active ? 700 : 400,
                  fontSize: 14, padding: "6px 14px", borderRadius: 6,
                  textDecoration: "none", background: active ? "#1a2d4a" : "transparent",
                  borderBottom: active ? `2px solid ${S.pink}` : "2px solid transparent",
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!isAffiliate && (
            <Link href={`/cashoffer/${slug}/change-password`} style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>
              Settings
            </Link>
          )}
          {isAffiliate ? (
            <a
              href={`https://${process.env.NEXT_PUBLIC_GEO_HOST ?? "geo.heypearl.io"}/${slug}/leads`}
              style={{
                background: "none", border: `1px solid ${S.border}`, color: S.muted,
                borderRadius: 6, padding: "5px 12px", fontSize: 13, textDecoration: "none",
                display: "inline-block",
              }}
            >
              ← My Portal
            </a>
          ) : (
            <button onClick={handleLogout} style={{
              background: "none", border: `1px solid ${S.border}`, color: S.muted,
              borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer",
            }}>
              Sign out
            </button>
          )}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
