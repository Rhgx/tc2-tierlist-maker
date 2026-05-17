import { memo } from "react";
import { publicAssetUrl } from "../lib/tierlistHelpers";
import type { TierlistImage } from "../types";

export const TierItem = memo(function TierItem({ image }: { image?: TierlistImage }) {
  if (!image) return null;
  return (
    <div className="tier-item" data-id={image.id} data-name={image.name}>
      <img src={publicAssetUrl(image.src)} alt={image.name} width="70" height="70" loading="lazy" decoding="async" />
    </div>
  );
});
