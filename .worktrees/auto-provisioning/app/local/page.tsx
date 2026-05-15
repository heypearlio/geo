import type { Metadata } from "next";
import LocalLandingPage from "@/app/templates/local-services/LocalLandingPage";
import config from "@/app/templates/local-services/configs/heylocal";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;

export default function LocalPage() {
  return <LocalLandingPage config={config} />;
}
