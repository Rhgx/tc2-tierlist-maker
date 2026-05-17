import type { SavedTierlistState } from "../appTypes";
import type { Rankings, TierConfig, TierlistDefinition } from "../types";

const STORAGE_PREFIX = "tc2-tierlist-state:";
const STORAGE_VERSION = 1;

function storageKey(tierlistId: string) {
  return `${STORAGE_PREFIX}${STORAGE_VERSION}:${tierlistId}`;
}

function tierlistSourceSignature(tierlist: TierlistDefinition) {
  return tierlist.images.map((image) => image.id).join("|");
}

export function loadTierlistState(tierlist: TierlistDefinition): SavedTierlistState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tierlist.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedTierlistState>;
    if (!Array.isArray(parsed.tierConfig) || !parsed.rankings) return null;

    const imageIds = new Set(tierlist.images.map((image) => image.id));
    const tierConfig = parsed.tierConfig
      .filter((tier): tier is TierConfig => Boolean(tier?.id && tier.label && tier.color))
      .map((tier) => ({ id: tier.id, label: tier.label, color: tier.color }));
    if (!tierConfig.length) return null;

    const rankings: Rankings = { pool: [] };
    const assignedIds = new Set<string>();
    const tierIds = new Set(["pool", ...tierConfig.map((tier) => tier.id)]);

    tierIds.forEach((tierId) => {
      if (tierId === "pool") return;
      const savedIds = Array.isArray(parsed.rankings?.[tierId]) ? parsed.rankings[tierId] : [];
      rankings[tierId] = savedIds.filter((id) => {
        if (!imageIds.has(id) || assignedIds.has(id)) return false;
        assignedIds.add(id);
        return true;
      });
    });

    tierlist.images.forEach((image) => {
      if (!assignedIds.has(image.id)) rankings.pool.push(image.id);
    });

    return {
      tierConfig,
      rankings,
      tierIdCounter: Number.isFinite(parsed.tierIdCounter) ? Number(parsed.tierIdCounter) : tierConfig.length,
      sourceSignature: tierlistSourceSignature(tierlist),
    };
  } catch {
    return null;
  }
}

export function saveTierlistState(tierlist: TierlistDefinition, tierConfig: TierConfig[], rankings: Rankings, tierIdCounter: number) {
  try {
    window.localStorage.setItem(storageKey(tierlist.id), JSON.stringify({ tierConfig, rankings, tierIdCounter, sourceSignature: tierlistSourceSignature(tierlist) }));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}
