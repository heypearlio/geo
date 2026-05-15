import type { Metadata } from "next";
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import config from "@/app/templates/local-services/configs/heylocal";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;

export default function LocalSchedulePageRoute() {
  return <LocalSchedulePage config={config} />;
}
