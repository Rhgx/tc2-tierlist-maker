export type TierId = string;

export type SourceKind = "weapon" | "map" | "cosmetic" | "taunt" | "unusual";

export interface TierConfig {
  id: TierId;
  label: string;
  color: string;
}

export interface TierlistImage {
  id: string;
  name: string;
  src: string;
  sourceKind: SourceKind;
  sourceId: string;
}

export interface TierlistDefinition {
  id: string;
  name: string;
  images: TierlistImage[];
}

export interface TierlistFolder {
  type: "folder";
  id: string;
  name: string;
  children: TierlistEntry[];
}

export type TierlistEntry = TierlistDefinition | TierlistFolder;

export type Rankings = Record<string, string[]> & {
  pool: string[];
};

export interface GeneratedManifestSection {
  count: number;
  assetCount: number;
  assetBytes: number;
}
