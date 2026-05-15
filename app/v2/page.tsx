import type { Metadata } from "next";
import V2LandingPage from "./V2LandingPage";
import { v2Meta } from "./meta";
import { HEYPEARL_SOCIALS } from "../../lib/social-config";

export const metadata: Metadata = v2Meta;

export default function V2Page() {
  return <V2LandingPage socialUrls={HEYPEARL_SOCIALS} />;
}
