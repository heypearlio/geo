import CashOfferSchedulePage from "@/app/templates/cashoffer/CashOfferSchedulePage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";

export default function CashOfferGodSchedulePage() {
  return <CashOfferSchedulePage config={cashOfferConfigs.demo} />;
}
