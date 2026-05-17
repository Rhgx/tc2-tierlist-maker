import type { SavedTierlistState } from "../appTypes";
import { DEFAULT_TIERS } from "../constants";
import type { Rankings, TierConfig, TierlistDefinition } from "../types";

const STORAGE_PREFIX = "tc2-tierlist-state:";
const CURRENT_STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSION = 1;

type CompactSavedTierlistState = {
  v: 2;
  t?: TierConfig[];
  r?: Record<string, string[]>;
  c?: number;
  s?: string;
};

type LegacySavedTierlistState = Partial<SavedTierlistState>;
type HydratableLegacySavedTierlistState = LegacySavedTierlistState & {
  tierConfig: TierConfig[];
  rankings: Rankings;
};

function storageKey(tierlistId: string, version = CURRENT_STORAGE_VERSION) {
  return `${STORAGE_PREFIX}${version}:${tierlistId}`;
}

function tierlistSourceSignature(tierlist: TierlistDefinition) {
  return tierlist.images.map((image) => image.id).join("|");
}

export function loadTierlistState(tierlist: TierlistDefinition): SavedTierlistState | null {
  try {
    const currentKey = storageKey(tierlist.id);
    const legacyKey = storageKey(tierlist.id, LEGACY_STORAGE_VERSION);
    let shouldMigrateLegacy = false;
    let raw = window.localStorage.getItem(currentKey);
    if (!raw) {
      raw = window.localStorage.getItem(legacyKey);
      shouldMigrateLegacy = Boolean(raw);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompactSavedTierlistState | LegacySavedTierlistState;
    const normalized = normalizeSavedState(parsed);
    if (!normalized) return null;

    const imageIds = new Set(tierlist.images.map((image) => image.id));
    const tierConfig = normalized.tierConfig
      .filter((tier): tier is TierConfig => Boolean(tier?.id && tier.label && tier.color))
      .map((tier) => ({ id: tier.id, label: tier.label, color: tier.color }));
    if (!tierConfig.length) return null;

    const rankings: Rankings = { pool: [] };
    const assignedIds = new Set<string>();
    const tierIds = new Set(["pool", ...tierConfig.map((tier) => tier.id)]);

    tierIds.forEach((tierId) => {
      if (tierId === "pool") return;
      const savedIds = Array.isArray(normalized.rankings?.[tierId]) ? normalized.rankings[tierId] : [];
      rankings[tierId] = savedIds.filter((id) => {
        if (!imageIds.has(id) || assignedIds.has(id)) return false;
        assignedIds.add(id);
        return true;
      });
    });

    tierlist.images.forEach((image) => {
      if (!assignedIds.has(image.id)) rankings.pool.push(image.id);
    });

    const loadedState = {
      tierConfig,
      rankings,
      tierIdCounter: Number.isFinite(normalized.tierIdCounter) ? Number(normalized.tierIdCounter) : tierConfig.length,
      sourceSignature: tierlistSourceSignature(tierlist),
    };

    if (shouldMigrateLegacy) {
      window.localStorage.setItem(currentKey, JSON.stringify(compactSavedState(tierlist, loadedState.tierConfig, loadedState.rankings, loadedState.tierIdCounter)));
      window.localStorage.removeItem(legacyKey);
    }

    return loadedState;
  } catch {
    return null;
  }
}

export function saveTierlistState(tierlist: TierlistDefinition, tierConfig: TierConfig[], rankings: Rankings, tierIdCounter: number) {
  try {
    window.localStorage.setItem(storageKey(tierlist.id), JSON.stringify(compactSavedState(tierlist, tierConfig, rankings, tierIdCounter)));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

function normalizeSavedState(saved: CompactSavedTierlistState | LegacySavedTierlistState): SavedTierlistState | null {
  if ("v" in saved && saved.v === CURRENT_STORAGE_VERSION) {
    const tierConfig = Array.isArray(saved.t) ? saved.t : cloneDefaultTiers();
    return {
      tierConfig,
      rankings: expandCompactRankings(saved.r),
      tierIdCounter: Number.isFinite(saved.c) ? Number(saved.c) : tierConfig.length,
      sourceSignature: saved.s,
    };
  }

  if (!isLegacySavedState(saved)) return null;
  return {
    tierConfig: saved.tierConfig,
    rankings: saved.rankings,
    tierIdCounter: Number.isFinite(saved.tierIdCounter) ? Number(saved.tierIdCounter) : saved.tierConfig.length,
    sourceSignature: saved.sourceSignature,
  };
}

function isLegacySavedState(saved: CompactSavedTierlistState | LegacySavedTierlistState): saved is HydratableLegacySavedTierlistState {
  return "tierConfig" in saved && Array.isArray(saved.tierConfig) && "rankings" in saved && Boolean(saved.rankings);
}

function compactSavedState(tierlist: TierlistDefinition, tierConfig: TierConfig[], rankings: Rankings, tierIdCounter: number): CompactSavedTierlistState {
  const compact: CompactSavedTierlistState = { v: CURRENT_STORAGE_VERSION };
  const compactRankings = compactRankingsWithoutPool(rankings);

  if (!isDefaultTierConfig(tierConfig)) compact.t = tierConfig;
  if (Object.keys(compactRankings).length) compact.r = compactRankings;
  if (tierIdCounter > 0) compact.c = tierIdCounter;
  compact.s = tierlistSourceSignature(tierlist);

  return compact;
}

function compactRankingsWithoutPool(rankings: Rankings) {
  return Object.fromEntries(
    Object.entries(rankings)
      .filter(([tierId, ids]) => tierId !== "pool" && Array.isArray(ids) && ids.length > 0)
      .map(([tierId, ids]) => [tierId, ids]),
  );
}

function expandCompactRankings(rankings: Record<string, string[]> | undefined): Rankings {
  const expanded: Rankings = { pool: [] };
  Object.entries(rankings || {}).forEach(([tierId, ids]) => {
    if (tierId === "pool" || !Array.isArray(ids)) return;
    expanded[tierId] = ids;
  });
  return expanded;
}

function isDefaultTierConfig(tierConfig: TierConfig[]) {
  return JSON.stringify(tierConfig) === JSON.stringify(DEFAULT_TIERS);
}

function cloneDefaultTiers() {
  return DEFAULT_TIERS.map((tier) => ({ ...tier }));
}
