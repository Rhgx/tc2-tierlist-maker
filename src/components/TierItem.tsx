import { memo } from "react";
import { latestUpdate } from "../data/generated/tierlists.generated";
import { publicAssetUrl } from "../lib/tierlistHelpers";
import type { TierlistImage } from "../types";
import { Tooltip } from "./Tooltip";

export const TierItem = memo(function TierItem({ image }: { image?: TierlistImage }) {
  if (!image) return null;
  // The highlight is styled only inside the pool, so it disappears once the item is placed in a tier.
  const isNew = image.addedIn === latestUpdate;
  return (
    <Tooltip
      className="tier-item"
      label={image.name}
      detail={image.addedIn ? `Added in ${image.addedIn}` : undefined}
      data-id={image.id}
      data-name={image.name}
      data-new={isNew ? "" : undefined}
      role="img"
      aria-label={isNew ? `${image.name} (new in ${image.addedIn})` : image.name}
    >
      <img src={publicAssetUrl(image.src)} alt="" aria-hidden="true" width="70" height="70" loading="lazy" decoding="async" />
      {isNew && <span className="tier-item__new-tag" aria-hidden="true">New</span>}
    </Tooltip>
  );
});
