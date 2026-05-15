import type { Metadata } from "next";
import CashOfferLandingPage from "@/app/templates/cashoffer/CashOfferLandingPage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";
import { cashofferMeta } from "./meta";

export const metadata: Metadata = cashofferMeta;

export default function CashOfferGodPage() {
  return <CashOfferLandingPage config={cashOfferConfigs.demo} />;
}
