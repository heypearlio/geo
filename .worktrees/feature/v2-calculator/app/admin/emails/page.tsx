"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const view = searchParams.get("view") ?? searchParams.get("tab") ?? "pending";
    router.replace(`/admin/leads?view=${view}`);
  }, [router, searchParams]);
  return null;
}

export default function EmailsPage() {
  return <Suspense><Redirect /></Suspense>;
}
