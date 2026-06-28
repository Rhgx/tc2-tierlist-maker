import { memo } from "react";
import { publicAssetUrl } from "../lib/tierlistHelpers";
import type { TierlistImage } from "../types";
import { Tooltip } from "./Tooltip";

export const TierItem = memo(function TierItem({ image }: { image?: TierlistImage }) {
  if (!image) return null;
  return (
    <Tooltip className="tier-item" label={image.name} data-id={image.id} data-name={image.name} role="img" aria-label={image.name}>
      <img src={publicAssetUrl(image.src)} alt="" aria-hidden="true" width="70" height="70" loading="lazy" decoding="async" />
    </Tooltip>
  );
});
