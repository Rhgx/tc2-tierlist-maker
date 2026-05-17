import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const tierlistsPath = path.join(projectRoot, "src", "data", "generated", "tierlists.generated.ts");
const classOrder = ["Flanker", "Trooper", "Arsonist", "Annihilator", "Brute", "Mechanic", "Doctor", "Marksman", "Agent", "All Class"];

const tierlists = await readTierlists();
const flat = flattenTierlists(tierlists);
if (!flat.length) fail("No generated tierlists found. Run npm run scrape.");

for (const id of ["weapons-tierlist", "maps-tierlist", "taunt-tierlist", "unusual-tierlist"]) {
  const tierlist = flat.find((item) => item.id === id);
  if (!tierlist) fail(`Missing ${id}.`);
  if (!tierlist.images.length) fail(`${id} has no images.`);
}

const cosmeticFolder = tierlists.find((entry) => entry.type === "folder" && entry.id === "cosmetic-tierlists");
if (!cosmeticFolder) fail("Missing cosmetic-tierlists folder.");
const expectedNames = classOrder.map((name) => `${name} Tierlist`);
const actualNames = cosmeticFolder.children.map((child) => child.name);
if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) {
  fail(`Cosmetic tierlists are out of order. Got ${actualNames.join(", ")}.`);
}

for (const tierlist of flat) {
  const ids = new Set();
  for (const image of tierlist.images) {
    if (ids.has(image.id)) fail(`Duplicate image id ${image.id} in ${tierlist.id}.`);
    ids.add(image.id);
    if (!image.src) fail(`Image ${image.id} in ${tierlist.id} has no src.`);
    await access(path.join(projectRoot, "public", image.src)).catch(() => fail(`Missing asset for ${image.id}: ${image.src}`));
  }
}

console.log(`Validated ${flat.length} generated tierlists.`);

async function readTierlists() {
  const source = await readFile(tierlistsPath, "utf8");
  const match = source.match(/export const tierlists: TierlistEntry\[] = ([\s\S]*?);\s*$/);
  if (!match) fail("Unable to parse tierlists.generated.ts.");
  return JSON.parse(match[1]);
}

function flattenTierlists(entries) {
  return entries.flatMap((entry) => entry.type === "folder" ? flattenTierlists(entry.children) : [entry]);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
