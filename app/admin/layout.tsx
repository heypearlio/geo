"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A", pink: "#E8185C",
};

const NAV_LINKS = [
  { href: "/admin/activity",   label: "Activity"   },
  { href: "/admin/leads",      label: "Leads"      },
  { href: "/admin/campaigns",  label: "Campaigns"  },
  { href: "/admin/offers",     label: "Offers"     },
  { href: "/admin/affiliates",    label: "Affiliates"   },
  { href: "/admin/provisioning", label: "Provisioning" },
  { href: "/admin/v2",           label: "V2 Clients"   },
  { href: "/admin/v2-leads",   label: "V2 Leads"   },
  { href: "/admin/accounts",   label: "Accounts"   },
  { href: "/admin/upload",     label: "Upload"     },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#0F1E3A", minHeight: "100vh" }}>
      {/* Top nav */}
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <span style={{ color: S.pink, fontWeight: 800, fontSize: 15, marginRight: 40, letterSpacing: "-0.02em" }}>
          GEO Admin
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                style={{
                  color: active ? S.text : S.muted,
                  fontWeight: active ? 700 : 400,
                  fontSize: 14,
                  padding: "6px 14px",
                  borderRadius: 6,
                  textDecoration: "none",
                  background: active ? "#1a2d4a" : "transparent",
                  borderBottom: active ? `2px solid ${S.pink}` : "2px solid transparent",
                  transition: "background 0.1s",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
