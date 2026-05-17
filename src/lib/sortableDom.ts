import type { Rankings } from "../types";

export function restoreSortableDom(rankings: Rankings, fromTier: string, toTier: string) {
  const nodeById = new Map(
    [...document.querySelectorAll<HTMLElement>(".tier-item")]
      .map((node) => [node.dataset.id || "", node] as const)
      .filter(([id]) => Boolean(id)),
  );

  new Set([fromTier, toTier]).forEach((tierId) => {
    const container = getSortableContainer(tierId);
    if (!container) return;
    (rankings[tierId] || []).forEach((id) => {
      const node = nodeById.get(id);
      if (node) container.appendChild(node);
    });
  });
}

function getSortableContainer(tierId: string) {
  if (tierId === "pool") return document.querySelector<HTMLElement>(".pool-items");
  return document.querySelector<HTMLElement>(`[data-tier="${CSS.escape(tierId)}"] .tier-items`);
}
