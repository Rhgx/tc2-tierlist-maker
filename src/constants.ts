import type { TierConfig } from "./types";

export const DEFAULT_TIERS: TierConfig[] = [
  { id: "S", label: "S", color: "#ff7f7e" },
  { id: "A", label: "A", color: "#ffbf7f" },
  { id: "B", label: "B", color: "#ffd180" },
  { id: "C", label: "C", color: "#feff7f" },
  { id: "D", label: "D", color: "#beff7f" },
  { id: "E", label: "E", color: "#7eff80" },
  { id: "F", label: "F", color: "#7fffff" },
];

export const COLOR_SWATCHES = [
  "#ff7f7e",
  "#ffbf7f",
  "#ffd180",
  "#feff7f",
  "#beff7f",
  "#97ef80",
  "#7fff7f",
  "#7fffff",
  "#7fbfff",
  "#807fff",
  "#ff7fbe",
  "#bf7fbe",
  "#3b3b3b",
  "#858585",
  "#c1c1c1",
  "#f7f7f7",
];

export const CLASS_ORDER = [
  "Flanker",
  "Trooper",
  "Arsonist",
  "Annihilator",
  "Brute",
  "Mechanic",
  "Doctor",
  "Marksman",
  "Agent",
  "All Class",
] as const;
