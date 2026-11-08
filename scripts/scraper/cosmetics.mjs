import { JSDOM } from "jsdom";
import { fetchInfoboxImageUrl, getImageUrl } from "./shared/assets.mjs";
import { cleanText, normalizeName } from "./shared/text.mjs";

const COSMETICS_API_URL =
  "https://typicalcolors2.fandom.com/api.php?action=parse&page=Cosmetics&prop=text&format=json&origin=*";
const CLASS_TABLE_PATTERN = /^(.+?) Cosmetics/i;
const ALLOWED_TABLES = new Set([
  "Flanker",
  "Trooper",
  "Arsonist",
  "Annihilator",
  "Brute",
  "Mechanic",
  "Doctor",
  "Marksman",
  "Agent",
  "All-Class",
]);

export async function scrapeCosmeticsFromWiki() {
  const response = await fetch(COSMETICS_API_URL);
  if (!response.ok) throw new Error(`TC2 cosmetics wiki request failed with ${response.status}`);
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) throw new Error("TC2 cosmetics wiki API returned no rendered HTML.");
  const cosmetics = parseCosmeticsHtml(html);
  if (cosmetics.length < 50) throw new Error(`Scrape returned only ${cosmetics.length} cosmetics.`);
  return addPendingWikiCosmetics(cosmetics);
}

// Typical Horrors VI cosmetics that the wiki's Cosmetics page does not list yet. Classes and slots come from
// each page's infobox (equip region Hat = Head, Misc = Misc, Outfit = Body). Each one is skipped once the
// Cosmetics page includes it, so entries can be removed after the wiki catches up.
const PENDING_WIKI_COSMETICS = [
  { name: "Pantheon Pacer", usedBy: ["Flanker"], slots: ["Body", "Head", "Misc"] },
  { name: "Asphodel Roamer", usedBy: ["Trooper"], slots: ["Body", "Head", "Misc"] },
  { name: "Bronze Bastion", usedBy: ["Arsonist"], slots: ["Body", "Head"] },
  { name: "Flame Grilled", usedBy: ["Arsonist"], slots: ["Body", "Head", "Misc"] },
  { name: "Shadow of Styx", usedBy: ["Arsonist"], slots: ["Body", "Head", "Misc"] },
  { name: "300th", usedBy: ["Annihilator"], slots: ["Body", "Head", "Misc"] },
  { name: "Flag Finish", usedBy: ["Brute"], slots: ["Body", "Head", "Misc"] },
  { name: "Olympian", usedBy: ["Brute"], slots: ["Body", "Head", "Misc"] },
  { name: "Godsmith", usedBy: ["Mechanic"], slots: ["Body", "Head", "Misc"] },
  { name: "Belvedere", usedBy: ["Doctor"], slots: ["Body", "Head", "Misc"] },
  { name: "Hypnus Somnus", usedBy: ["Doctor"], slots: ["Body", "Head"] },
  { name: "Humble Hunter", usedBy: ["Marksman"], slots: ["Head"] },
  { name: "Natural Instinct", usedBy: ["Marksman"], slots: ["Body", "Head", "Misc"] },
  { name: "Mamba Mori", usedBy: ["Agent"], slots: ["Head"] },
  { name: "Proud Vendetta", usedBy: ["Agent"], slots: ["Body", "Head"] },
];

async function addPendingWikiCosmetics(cosmetics) {
  const listed = new Set(cosmetics.map((cosmetic) => cosmetic.name.toLowerCase()));
  const pending = [];
  for (const cosmetic of PENDING_WIKI_COSMETICS) {
    if (listed.has(cosmetic.name.toLowerCase())) {
      console.log(`[scrape] Cosmetics: the Cosmetics page now lists ${cosmetic.name}; remove it from PENDING_WIKI_COSMETICS.`);
      continue;
    }
    pending.push({ ...cosmetic, imageUrl: await fetchInfoboxImageUrl(cosmetic.name) });
  }
  return [...cosmetics, ...pending].sort((a, b) => a.name.localeCompare(b.name));
}

function parseCosmeticsHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const cosmetics = [];

  doc.querySelectorAll("table.navbox__container").forEach((table) => {
    const tableName = getTableName(table);
    if (!tableName || !ALLOWED_TABLES.has(tableName)) return;

    const usedBy = tableName === "All-Class" ? "All Classes" : tableName;
    table.querySelectorAll("table.navbox__image-table").forEach((slotTable) => {
      const slot = normalizeSlot(slotTable.querySelector(".navbox__image-header-cell")?.textContent || "");
      if (!slot) return;

      slotTable.querySelectorAll(".navbox__image-item").forEach((item) => {
        const cosmetic = extractCosmeticItem(item, usedBy, slot);
        if (cosmetic) cosmetics.push(cosmetic);
      });
    });
  });

  return dedupeCosmetics(cosmetics);
}

function getTableName(table) {
  const headerText = cleanText(table.querySelector(".navbox__header-cell")?.childNodes?.[0]?.textContent || table.querySelector(".navbox__header-cell")?.textContent || "");
  const match = headerText.match(CLASS_TABLE_PATTERN);
  return match ? cleanText(match[1]) : "";
}

function normalizeSlot(value) {
  // Some wiki navboxes use a singular "Body Cosmetic" header.
  return cleanText(value).replace(/\s+Cosmetics?$/i, "");
}

function extractCosmeticItem(item, usedBy, slot) {
  const caption = item.querySelector(".navbox__image-item-caption a");
  const name = normalizeName(caption?.textContent || caption?.getAttribute("title") || "");
  if (!name) return null;

  const image = item.querySelector(".navbox__image-item-image img[data-src], .navbox__image-item-image img[src]");
  const imageUrl = getImageUrl(image);
  if (!imageUrl) return null;

  return { name, usedBy, slot, imageUrl };
}

function dedupeCosmetics(rows) {
  const byName = new Map();

  rows.forEach((row) => {
    const key = row.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        name: row.name,
        usedBy: new Set(),
        slots: new Set(),
        imageUrl: row.imageUrl,
      });
    }

    const item = byName.get(key);
    item.usedBy.add(row.usedBy);
    item.slots.add(row.slot);
    if (!item.imageUrl && row.imageUrl) item.imageUrl = row.imageUrl;
  });

  return [...byName.values()]
    .map((item) => ({
      name: item.name,
      usedBy: [...item.usedBy].sort(sortUsedBy),
      slots: [...item.slots].sort((a, b) => a.localeCompare(b)),
      imageUrl: item.imageUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sortUsedBy(a, b) {
  return getClassOrder(a) - getClassOrder(b) || a.localeCompare(b);
}

function getClassOrder(className) {
  const order = ["Flanker", "Trooper", "Arsonist", "Annihilator", "Brute", "Mechanic", "Doctor", "Marksman", "Agent", "All Classes"];
  const index = order.indexOf(className);
  return index >= 0 ? index : order.length;
}
