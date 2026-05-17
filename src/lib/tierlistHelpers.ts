import { DEFAULT_TIERS } from "../constants";
import type { Rankings, TierConfig, TierlistDefinition, TierlistEntry, TierlistFolder, TierlistImage } from "../types";

export function isFolder(entry: TierlistEntry): entry is TierlistFolder {
  return "type" in entry && entry.type === "folder";
}

export function cloneDefaultTiers() {
  return DEFAULT_TIERS.map((tier) => ({ ...tier }));
}

export function calculateLabelFontSize(label: string) {
  const len = label.length;
  if (len <= 2) return "2rem";
  if (len <= 4) return "1.5rem";
  if (len <= 8) return "1rem";
  if (len <= 12) return "0.8rem";
  if (len <= 18) return "0.65rem";
  return "0.55rem";
}

export function publicAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");
}

export function findTierlistById(id: string, entries: TierlistEntry[]): TierlistDefinition | null {
  for (const entry of entries) {
    if (isFolder(entry)) {
      const found = findTierlistById(id, entry.children);
      if (found) return found;
    } else if (entry.id === id) {
      return entry;
    }
  }
  return null;
}

export function findFolderById(id: string, entries: TierlistEntry[]): TierlistFolder | null {
  for (const entry of entries) {
    if (!isFolder(entry)) continue;
    if (entry.id === id) return entry;
    const found = findFolderById(id, entry.children);
    if (found) return found;
  }
  return null;
}

export function findParentFolderForTierlist(id: string, entries: TierlistEntry[], parent: TierlistFolder | null = null): TierlistFolder | null {
  for (const entry of entries) {
    if (isFolder(entry)) {
      const found = findParentFolderForTierlist(id, entry.children, entry);
      if (found) return found;
    } else if (entry.id === id) {
      return parent;
    }
  }
  return null;
}

export function buildInitialRankings(tierConfig: TierConfig[], images: TierlistImage[]): Rankings {
  const rankings: Rankings = { pool: images.map((image) => image.id) };
  tierConfig.forEach((tier) => {
    rankings[tier.id] = [];
  });
  return rankings;
}

export function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
