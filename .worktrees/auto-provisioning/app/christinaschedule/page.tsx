import type { Metadata } from "next";
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import config from "@/app/templates/local-services/configs/christina";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;

export default function ChristinaSchedulePage() {
  return <LocalSchedulePage config={config} />;
}
