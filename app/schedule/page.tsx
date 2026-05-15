import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoSchedulePage from "@/app/components/GeoSchedulePage";
import V2SchedulePage from "@/app/components/V2SchedulePage";
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import { geoMeta } from "@/app/config/geoMeta";
import { localMeta } from "@/app/templates/local-services/meta";
import { v2Meta } from "@/app/v2/meta";

const GEO_CALENDLY_URL = process.env.NEXT_PUBLIC_GEO_CALENDLY_URL ?? "https://calendly.com/hey-pearl/meet";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (host.includes("local.")) return localMeta;
  if (host.includes("v2.")) return v2Meta;
  return geoMeta;
}

export default async function GodSchedulePage() {
  const host = (await headers()).get("host") ?? "";

  if (host.includes("local.")) {
    return <LocalSchedulePage config={heylocal} />;
  }

  if (host.includes("v2.")) {
    return <V2SchedulePage />;
  }

  if (host.includes("geo.")) {
    return <GeoSchedulePage calendlyUrl={GEO_CALENDLY_URL} />;
  }

  notFound();
}
