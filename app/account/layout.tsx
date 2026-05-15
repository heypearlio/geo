"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", pink: "#E8185C",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page needs no auth guard or nav
  const isLoginPage = pathname === "/account/login";

  useEffect(() => {
    if (isLoginPage) return;
    fetch("/api/account/me").then(r => {
      if (!r.ok) router.push("/account/login");
    });
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/account/login");
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#0F1E3A", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link
          href="/account/dashboard"
          style={{ color: S.pink, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", textDecoration: "none" }}
        >
          HeyPearl
        </Link>
        <button
          onClick={handleLogout}
          style={{
            background: "none", border: `1px solid ${S.border}`, color: S.muted,
            borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </nav>
      <div>{children}</div>
    </div>
  );
}
