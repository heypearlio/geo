import type { Metadata } from "next";
import { Suspense } from "react";
import LandingPage from "./components/LandingPage";
import { geoMeta } from "./config/geoMeta";

export const metadata: Metadata = geoMeta;

export default function Home() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
