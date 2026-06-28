import { memo } from "react";
import { calculateLabelFontSize } from "../lib/tierlistHelpers";
import type { TierConfig, TierlistImage } from "../types";
import { TierItem } from "./TierItem";

export const TierRow = memo(function TierRow({ tier, itemIds, imagesById }: {
  tier: TierConfig;
  itemIds: string[];
  imagesById: Map<string, TierlistImage>;
}) {
  return (
    <div className="tier-row" data-tier={tier.id} role="group" aria-label={`${tier.label} tier`}>
      <div className="tier-label" data-tier={tier.id} style={{ background: tier.color, color: "#1a1a1a", fontSize: calculateLabelFontSize(tier.label) }}>
        {tier.label}
      </div>
      <div className="tier-items" aria-label={`${tier.label} tier items`}>
        {itemIds.map((id) => <TierItem key={id} image={imagesById.get(id)} />)}
      </div>
    </div>
  );
});
