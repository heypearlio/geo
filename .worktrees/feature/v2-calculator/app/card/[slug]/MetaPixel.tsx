"use client";

import { useEffect } from "react";

export function MetaPixel({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); return; }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    w.fbq = n; w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}
