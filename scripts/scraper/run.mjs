import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLASS_ORDER } from "../../src/constants.ts";
import { scrapeCosmeticsFromWiki } from "./cosmetics.mjs";
import { scrapeMapsFromWiki } from "./maps.mjs";
import { scrapeTauntsFromWiki } from "./taunts.mjs";
import { scrapeUnusualsFromWiki } from "./unusuals.mjs";
import { scrapeWeaponsFromWiki } from "./weapons.mjs";
import { addMapLabelToAsset, downloadAssets, formatBytes, summarizeAssetDirectory } from "./shared/assets.mjs";
import { cleanText } from "./shared/text.mjs";
import { renderManifestGeneratedFile, renderRawGeneratedFile, renderTierlistsGeneratedFile } from "./shared/render.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const generatedDataPath = path.join(projectRoot, "src", "data", "generated");
const publicAssetRoot = path.join(projectRoot, "public", "tc2-assets");
const outputPaths = {
  weapons: path.join(generatedDataPath, "weapons.generated.ts"),
  maps: path.join(generatedDataPath, "maps.generated.ts"),
  cosmetics: path.join(generatedDataPath, "cosmetics.generated.ts"),
  taunts: path.join(generatedDataPath, "taunts.generated.ts"),
  unusuals: path.join(generatedDataPath, "unusuals.generated.ts"),
  tierlists: path.join(generatedDataPath, "tierlists.generated.ts"),
  manifest: path.join(generatedDataPath, "manifest.generated.ts"),
};
const assetPaths = {
  weapons: path.join(publicAssetRoot, "weapons"),
  maps: path.join(publicAssetRoot, "maps"),
  cosmetics: path.join(publicAssetRoot, "cosmetics"),
  taunts: path.join(publicAssetRoot, "taunts"),
  unusuals: path.join(publicAssetRoot, "unusuals"),
};

const target = process.argv[2] || "all";
const validTargets = new Set(["all", "weapons", "maps", "cosmetics", "taunts", "unusuals"]);
if (!validTargets.has(target)) {
  console.error(`Unknown scrape target "${target}". Use one of: ${[...validTargets].join(", ")}.`);
  process.exit(1);
}

await mkdir(generatedDataPath, { recursive: true });

const existing = await readExistingGenerated();
const data = {
  weapons: existing.weapons,
  maps: existing.maps,
  cosmetics: existing.cosmetics,
  taunts: existing.taunts,
  unusuals: existing.unusuals,
};

if (target === "all" || target === "weapons") data.weapons = await scrapeWeapons();
if (target === "all" || target === "maps") data.maps = await scrapeMaps();
if (target === "all" || target === "cosmetics") data.cosmetics = await scrapeCosmetics();
if (target === "all" || target === "taunts") data.taunts = await scrapeTaunts();
if (target === "all" || target === "unusuals") data.unusuals = await scrapeUnusuals();

await writeFile(outputPaths.tierlists, renderTierlistsGeneratedFile(buildTierlists(data)), "utf8");
await writeManifest(data);

async function scrapeWeapons() {
  const weapons = await scrapeWeaponsFromWiki();
  const paths = await downloadAssets(
    weapons.map((weapon) => ({ name: weapon.name, url: weapon.iconUrl })),
    assetPaths.weapons,
    "tc2-assets/weapons",
    projectRoot,
  );
  const local = weapons.map((weapon) => ({ ...weapon, iconUrl: paths.get(weapon.iconUrl) || "" }));
  await writeFile(outputPaths.weapons, renderRawGeneratedFile("weapons", local), "utf8");
  await logSummary("Weapons", local.length, assetPaths.weapons);
  return local;
}

async function scrapeMaps() {
  const maps = await scrapeMapsFromWiki();
  const labeledMaps = maps.map((map) => ({ ...map, label: mapLabel(map, maps) }));
  const paths = await downloadAssets(
    labeledMaps.map((map) => ({ name: mapAssetName(map), dedupeKey: mapAssetName(map), url: map.imageUrl })),
    assetPaths.maps,
    "tc2-assets/maps",
    projectRoot,
    { force: true, resize: { width: 256, height: 256 } },
  );
  const local = labeledMaps.map((map) => ({ ...map, imageUrl: paths.get(mapAssetName(map)) || "" }));

  await Promise.all(local.map(async (map) => {
    if (!map.imageUrl) return;
    await addMapLabelToAsset(path.join(projectRoot, "public", map.imageUrl), map.label);
  }));

  await writeFile(outputPaths.maps, renderRawGeneratedFile("maps", local), "utf8");
  await logSummary("Maps", local.length, assetPaths.maps);
  return local;
}

async function scrapeCosmetics() {
  const cosmetics = await scrapeCosmeticsFromWiki();
  const normalized = cosmetics.map((cosmetic) => ({
    ...cosmetic,
    usedBy: cosmetic.usedBy.map(normalizeClassName).sort(sortClassNames),
  }));
  const paths = await downloadAssets(
    normalized.map((cosmetic) => ({ name: cosmetic.name, url: cosmetic.imageUrl })),
    assetPaths.cosmetics,
    "tc2-assets/cosmetics",
    projectRoot,
  );
  const local = normalized.map((cosmetic) => ({ ...cosmetic, imageUrl: paths.get(cosmetic.imageUrl) || "" }));
  await writeFile(outputPaths.cosmetics, renderRawGeneratedFile("cosmetics", local), "utf8");
  await logSummary("Cosmetics", local.length, assetPaths.cosmetics);
  return local;
}

async function scrapeTaunts() {
  const taunts = await scrapeTauntsFromWiki();
  const paths = await downloadAssets(
    taunts.map((taunt) => ({ name: taunt.name, url: taunt.imageUrl })),
    assetPaths.taunts,
    "tc2-assets/taunts",
    projectRoot,
  );
  const local = taunts.map((taunt) => ({ ...taunt, imageUrl: paths.get(taunt.imageUrl) || "" }));
  await writeFile(outputPaths.taunts, renderRawGeneratedFile("taunts", local), "utf8");
  await logSummary("Taunts", local.length, assetPaths.taunts);
  return local;
}

async function scrapeUnusuals() {
  const unusuals = await scrapeUnusualsFromWiki();
  const paths = await downloadAssets(
    unusuals.map((unusual) => ({ name: unusual.name, url: unusual.imageUrl })),
    assetPaths.unusuals,
    "tc2-assets/unusuals",
    projectRoot,
    { force: true, preserveGif: true },
  );
  const local = unusuals.map((unusual) => ({ ...unusual, imageUrl: paths.get(unusual.imageUrl) || "" }));
  await writeFile(outputPaths.unusuals, renderRawGeneratedFile("unusuals", local), "utf8");
  await logSummary("Unusuals", local.length, assetPaths.unusuals);
  return local;
}

function buildTierlists({ weapons, maps, cosmetics, taunts, unusuals }) {
  const cosmeticChildren = CLASS_ORDER.map((className) => {
    const images = cosmetics
      .filter((cosmetic) => cosmetic.usedBy.includes(className))
      .sort(sortByName)
      .map((cosmetic) => tierlistImage("cosmetic", cosmetic.name, cosmetic.imageUrl));
    return {
      id: `cosmetic-tierlists/${slugify(className)}-tierlist`,
      name: `${className} Tierlist`,
      images,
    };
  });

  return [
    { type: "folder", id: "cosmetic-tierlists", name: "Cosmetic Tierlists", children: cosmeticChildren },
    { id: "maps-tierlist", name: "Maps Tierlist", images: [...maps].sort(sortMapsByLabel).map((map) => tierlistImage("map", map.label || map.name, map.imageUrl)) },
    { id: "taunt-tierlist", name: "Taunt Tierlist", images: [...taunts].sort(sortByName).map((taunt) => tierlistImage("taunt", taunt.name, taunt.imageUrl)) },
    { id: "unusual-tierlist", name: "Unusual Tierlist", images: [...unusuals].sort(sortByName).map((unusual) => tierlistImage("unusual", unusual.name, unusual.imageUrl)) },
    { id: "weapons-tierlist", name: "Weapons Tierlist", images: [...weapons].sort(sortByName).map((weapon) => tierlistImage("weapon", weapon.name, weapon.iconUrl)) },
  ];
}

function tierlistImage(kind, name, src) {
  const id = `${kind}-${slugify(name)}`;
  return {
    id,
    name,
    src,
    sourceKind: kind,
    sourceId: id,
  };
}

async function writeManifest(data) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    weapons: await manifestSection(data.weapons, assetPaths.weapons),
    maps: await manifestSection(data.maps, assetPaths.maps),
    cosmetics: await manifestSection(data.cosmetics, assetPaths.cosmetics),
    taunts: await manifestSection(data.taunts, assetPaths.taunts),
    unusuals: await manifestSection(data.unusuals, assetPaths.unusuals),
  };
  await writeFile(outputPaths.manifest, renderManifestGeneratedFile(manifest), "utf8");
}

async function manifestSection(items, assetsPath) {
  const assets = await summarizeAssetDirectory(assetsPath);
  return { count: items.length, assetCount: assets.count, assetBytes: assets.bytes };
}

async function logSummary(label, count, assetsPath) {
  const summary = await summarizeAssetDirectory(assetsPath);
  console.log(`${label}: ${count} items, ${summary.count} asset files, ${formatBytes(summary.bytes)}.`);
}

async function readExistingGenerated() {
  return {
    weapons: await readGeneratedArray("weapons"),
    maps: await readGeneratedArray("maps"),
    cosmetics: await readGeneratedArray("cosmetics"),
    taunts: await readGeneratedArray("taunts"),
    unusuals: await readGeneratedArray("unusuals"),
  };
}

async function readGeneratedArray(name) {
  try {
    const source = await readFile(outputPaths[name], "utf8");
    const match = source.match(new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`));
    return match ? JSON.parse(match[1]) : [];
  } catch {
    return [];
  }
}

function normalizeClassName(value) {
  const text = cleanText(value).replace(/^All-?Class(?:es)?$/i, "All Class").replace(/^All Classes$/i, "All Class");
  return text === "All-Class" || text === "All Classes" ? "All Class" : text;
}

function sortClassNames(a, b) {
  return classIndex(a) - classIndex(b) || a.localeCompare(b);
}

function classIndex(name) {
  const index = CLASS_ORDER.indexOf(name);
  return index >= 0 ? index : CLASS_ORDER.length;
}

function mapAssetName(map) {
  return map.label || mapLabel(map, [map]);
}

function mapLabel(map) {
  const mapName = slugifyMapName(map.name).replace(/-/g, "_");
  const mode = modePrefix(map.gameMode);
  return mode ? `${mode}_${mapName}` : mapName;
}

function modePrefix(gameMode) {
  const normalized = cleanText(gameMode).toLowerCase();
  if (!normalized || normalized === "none") return "";
  if (/attack/.test(normalized)) return "ad";
  if (/king of the hill/.test(normalized)) return "koth";
  if (/payload/.test(normalized)) return "pl";
  if (/capture the flag/.test(normalized)) return "ctf";
  if (/control points/.test(normalized)) return "cp";
  if (/player destruction/.test(normalized)) return "pd";
  if (/team deathmatch/.test(normalized)) return "tdm";
  if (/boss/.test(normalized)) return "vsb";
  if (/arena/.test(normalized)) return "arena";
  if (/medie?val/.test(normalized)) return "medieval";
  if (/training/.test(normalized)) return "tr";
  return slugify(gameMode).replace(/-/g, "_") || "map";
}

function slugify(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function slugifyMapName(value) {
  const cleaned = cleanText(value)
    .replace(/sword fights on the heights/i, "sfoth")
    .replace(/['’]/g, "");
  return slugify(cleaned);
}

function sortMapsByLabel(a, b) {
  return cleanText(a.label || a.name).localeCompare(cleanText(b.label || b.name), undefined, { sensitivity: "base", numeric: true });
}

function sortByName(a, b) {
  return cleanText(a.name).localeCompare(cleanText(b.name), undefined, { sensitivity: "base", numeric: true });
}
