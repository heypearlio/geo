import type { Metadata } from "next";
import { Suspense } from "react";
import LandingPage from "./components/LandingPage";
import { geoMeta } from "./config/geoMeta";
import { HEYPEARL_SOCIALS } from "../lib/social-config";

export const metadata: Metadata = geoMeta;

export default function Home() {
  return (
    <Suspense>
      <LandingPage overrides={{ socialUrls: HEYPEARL_SOCIALS }} />
    </Suspense>
  );
}
