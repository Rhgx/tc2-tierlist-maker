import type { Rankings, TierConfig } from "./types";

export type ViewName = "menu" | "folder" | "tierlist";
export type ModalName = "none" | "edit" | "reset" | "screenshot";

export type AppRoute =
  | { view: "menu" }
  | { view: "folder"; id: string }
  | { view: "tierlist"; id: string };

export type SavedTierlistState = {
  tierConfig: TierConfig[];
  rankings: Rankings;
  tierIdCounter: number;
  sourceSignature?: string;
};
