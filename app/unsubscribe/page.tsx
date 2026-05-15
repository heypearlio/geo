"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!email) return;
    setStatus("loading");
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(r => r.ok ? setStatus("done") : setStatus("error"))
      .catch(() => setStatus("error"));
  }, [email]);

  return (
    <main className="min-h-screen bg-[#F7F8FC] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Link href="https://geo.heypearl.io"><Image src="/geo-logo.png" alt="GEO by HeyPearl" width={100} height={42} className="mx-auto mb-8" /></Link>
        {status === "loading" && (
          <p className="text-[#4A5E7A]">Removing you from the list...</p>
        )}
        {status === "done" && (
          <>
            <h1 className="text-2xl font-bold text-[#0F1E3A] mb-3">You're unsubscribed.</h1>
            <p className="text-[#4A5E7A]">You won't receive any more emails from GEO by HeyPearl. If this was a mistake, reply to any previous email and we'll add you back.</p>
          </>
        )}
        {status === "error" && (
          <p className="text-[#4A5E7A]">Something went wrong. Reply to any of our emails to unsubscribe manually.</p>
        )}
        {!email && (
          <p className="text-[#4A5E7A]">No email address found. Reply to any of our emails to unsubscribe manually.</p>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
