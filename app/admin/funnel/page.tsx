"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FunnelRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/campaigns"); }, [router]);
  return null;
}
