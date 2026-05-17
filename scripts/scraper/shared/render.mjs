export function renderRawGeneratedFile(exportName, items) {
  const generatedAtName = `${exportName}GeneratedAt`;
  return `export const ${generatedAtName} = ${JSON.stringify(new Date().toISOString())};
export const ${exportName} = ${JSON.stringify(items, null, 2)} as const;
`;
}

export function renderTierlistsGeneratedFile(tierlists) {
  return `import type { TierlistEntry } from "../../types";

export const tierlistsGeneratedAt = ${JSON.stringify(new Date().toISOString())};
export const tierlists: TierlistEntry[] = ${JSON.stringify(tierlists, null, 2)};
`;
}

export function renderManifestGeneratedFile(manifest) {
  return `export const generatedManifest = ${JSON.stringify(manifest, null, 2)} as const;
`;
}
