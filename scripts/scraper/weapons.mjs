import { JSDOM } from "jsdom";
import { getImageUrl } from "./shared/assets.mjs";
import { cellText, cleanText, getHeadingText, normalizeName, tableToGrid, textWithBreaks } from "./shared/text.mjs";

const WIKI_API_URL =
  "https://typicalcolors2.fandom.com/api.php?action=parse&page=Weapons&prop=text&format=json&origin=*";

const CLASSES = [
  "Flanker",
  "Trooper",
  "Arsonist",
  "Annihilator",
  "Brute",
  "Mechanic",
  "Doctor",
  "Marksman",
  "Agent",
  "All Classes",
];

const SOURCE_WORDS = [
  "Stock",
  "Shop",
  "Item Drop",
  "Battle Pass",
  "Distributed",
  "Achievement",
  "Intel Shop",
  "Contract",
  "Crate",
  "Event",
  "Exclusive",
  "Community",
];

const WEAPON_OVERRIDES = {
  "frying pan": {
    classNames: ["Flanker", "Trooper", "Arsonist", "Annihilator", "Brute", "Doctor", "Marksman"],
  },
  objector: {
    classNames: ["Flanker", "Trooper", "Arsonist", "Annihilator", "Brute", "Doctor", "Marksman"],
  },
};

export async function scrapeWeaponsFromWiki() {
  const response = await fetch(WIKI_API_URL);
  if (!response.ok) throw new Error(`TC2 wiki request failed with ${response.status}`);
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) throw new Error("TC2 wiki API returned no rendered HTML.");
  const weapons = parseWeaponsHtml(html);
  if (weapons.length < 50) throw new Error(`Scrape returned only ${weapons.length} weapons.`);
  return weapons;
}

function extractWeaponCell(cell) {
  const image = cell.querySelector("img");
  const iconUrl = getImageUrl(image);
  const links = [...cell.querySelectorAll("a[href*='/wiki/']")]
    .map((anchor) => ({
      href: anchor.getAttribute("href") || "",
      title: anchor.getAttribute("title") || "",
      text: cleanText(anchor.textContent || anchor.getAttribute("title") || ""),
    }))
    .filter((link) => {
      const value = `${link.href} ${link.title}`;
      return link.text && !/File:|Special:|Category:|Help:|Template:/i.test(value) && !/pictogram|render|transparent|image:/i.test(value);
    });

  const weaponLink = links[links.length - 1];
  const name = normalizeName(weaponLink?.text || weaponLink?.title || "");
  if (!name) return null;

  const lines = textWithBreaks(cell);
  const nameIndex = lines.findIndex((line) => normalizeName(line) === name);
  const sourceCandidate = nameIndex > 0 ? lines[nameIndex - 1] : "";
  const source =
    SOURCE_WORDS.find((word) => cleanText(sourceCandidate).toLowerCase().includes(word.toLowerCase())) || sourceCandidate || "Unknown";

  return { name, source: cleanText(source) || "Unknown", iconUrl };
}

function getCurrentClassFromHeading(text) {
  const heading = cleanText(text);
  if (/Community-Only Weapons/i.test(heading)) return "Community Only";
  return CLASSES.find((className) => heading.includes(className)) || null;
}

function getCurrentSlotFromHeading(text, currentSlot) {
  const heading = cleanText(text);
  return ["Primary", "Secondary", "Melee", "PDA"].find((slot) => heading.includes(slot)) || currentSlot || "Unknown";
}

function weaponAttribute(kind, text) {
  const labels = {
    positive: "Positive trait",
    negative: "Negative trait",
    neutral: "Neutral note",
    "vs-bosses-positive": "Vs. Bosses benefit",
    "vs-bosses-negative": "Vs. Bosses drawback",
  };

  return { kind, label: labels[kind], text };
}

function extractAttributes(cell) {
  if (!cell) return [];
  const statBlocks = [...cell.querySelectorAll(".bannedgun, .bosspro, .pro, .con, .note")];
  if (statBlocks.length) {
    return statBlocks
      .map((block) => {
        const textNode = block.querySelector(".pro-text, .con-text, .note-text") || block;
        const text = cleanText(textNode.textContent)
          .replace(/This item always /gi, "Always ")
          .replace(/Image:/gi, "");
        if (!text) return null;

        if (block.classList.contains("bannedgun")) return weaponAttribute("vs-bosses-negative", text);
        if (block.classList.contains("bosspro")) return weaponAttribute("vs-bosses-positive", text);
        if (block.classList.contains("pro")) return weaponAttribute("positive", text);
        if (block.classList.contains("con")) return weaponAttribute("negative", text);
        return weaponAttribute("neutral", text);
      })
      .filter(Boolean);
  }

  const text = cellText(cell).replace(/This item always /gi, "Always ").replace(/Image:/gi, "").replace(/\s+/g, " ");
  return text
    .split(/\s*\u2022\s*|(?<=\.)\s+(?=[A-Z+\-0-9])/)
    .map(cleanText)
    .filter((note) => note && note.length > 2)
    .map((note) => weaponAttribute("neutral", note));
}

function headerText(cell) {
  return cleanText(cellText(cell)).toLowerCase();
}

function getTableColumnIndexes(grid) {
  const headerRowIndex = grid.findIndex((row) => row.some((cell) => cell?.tagName === "TH"));
  const headerRow = headerRowIndex >= 0 ? grid[headerRowIndex] : grid[0] || [];
  const headers = headerRow.map(headerText);

  const findHeader = (tests) => headers.findIndex((text) => tests.some((test) => test.test(text)));
  const weapon = Math.max(0, findHeader([/^weapon$/, /weapon name/, /^item$/]));
  const capacity = findHeader([/capacity/, /clip/, /magazine/, /loaded/]);
  const ammo = findHeader([/^ammo$/, /reserve/, /ammo carried/, /ammunition/]);
  let attributes = findHeader([/notes?/, /stats?/, /attributes?/, /description/, /information/, /info/, /effects?/]);

  if (attributes < 0) attributes = headers.findIndex((_, index) => index !== weapon && index !== capacity && index !== ammo);

  return {
    weapon,
    capacity,
    ammo,
    attributes,
    dataStart: headerRowIndex >= 0 ? headerRowIndex + 1 : 1,
  };
}

function normalizeStatCell(value) {
  const text = cleanText(value).replace(/^[^:|]+:\s*(?=(?:N\s*\/\s*A|\u221e|[0-9]))/i, "");
  if (!text || /^N\s*\/\s*A$/i.test(text)) return null;
  if (text === "\u221e") return Number.POSITIVE_INFINITY;
  if (text.length > 40 && !/^[0-9. /-]+$/.test(text) && text !== "\u221e") return null;
  if (/cloak type:|cannot attack|move speed|debuff|bosses|invisible|meter|regen/i.test(text)) return null;
  if (/^[0-9]+$/.test(text)) return Number(text);
  return text;
}

function extractRowAttributes(cells, indexes) {
  const attributesCell = indexes.attributes >= 0 ? cells[indexes.attributes] : null;
  const attributes = extractAttributes(attributesCell);
  if (attributes.length) return attributes;

  const fallbackCell = cells.find((cell, index) => {
    if (!cell || index === indexes.weapon || index === indexes.capacity || index === indexes.ammo) return false;
    if (cell.querySelector(".bannedgun, .bosspro, .pro, .con, .note")) return true;
    const text = cleanText(cell.textContent);
    return /(^|[.\s])[+\-][0-9]|always|on hit|on kill|alt-fire|wearer|damage|reload|speed/i.test(text);
  });

  return extractAttributes(fallbackCell);
}

function attributeKey(attribute) {
  return `${attribute.kind}\u0000${attribute.text}`;
}

function attributesText(attributes) {
  return attributes.map((attribute) => `${attribute.label}: ${attribute.text}`).join(" ");
}

function addSetValue(map, key, value) {
  if (value === null || value === undefined || value === "") return;
  if (!map[key]) map[key] = new Set();
  if (typeof value === "number") {
    map[key].add(value);
    return;
  }
  String(value)
    .split(/\s*\/\s*|\s*,\s*/)
    .map(cleanText)
    .filter(Boolean)
    .forEach((item) => map[key].add(item));
}

function normalizeSlotSet(slotSet) {
  const slots = slotSet.filter((slot) => slot && slot !== "Unknown");
  return slots.length ? slots : slotSet;
}

function dedupeWeapons(rows) {
  const byName = new Map();

  rows.forEach((row) => {
    const key = row.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        ...row,
        classSet: new Set(),
        slotSet: new Set(),
        sourceSet: new Set(),
        capacitySet: new Set(),
        ammoSet: new Set(),
        attributesByKey: new Map(),
        iconUrl: row.iconUrl || "",
      });
    }
    const item = byName.get(key);
    if (!item.iconUrl && row.iconUrl) item.iconUrl = row.iconUrl;
    addSetValue(item, "classSet", row.className);
    addSetValue(item, "slotSet", row.slot);
    addSetValue(item, "sourceSet", row.source);
    addSetValue(item, "capacitySet", row.capacity);
    addSetValue(item, "ammoSet", row.ammo);
    row.attributes.forEach((attribute) => item.attributesByKey.set(attributeKey(attribute), attribute));
  });

  return [...byName.values()]
    .map((item) => {
      const classSet = [...item.classSet];
      const slotSet = normalizeSlotSet([...item.slotSet]);
      const sourceSet = [...item.sourceSet];
      const capacitySet = [...item.capacitySet].filter(Boolean);
      const ammoSet = [...item.ammoSet].filter(Boolean);
      const attributes = [...item.attributesByKey.values()];
      const override = WEAPON_OVERRIDES[item.name.toLowerCase()] || {};
      const classNames = normalizeClassSet(override.classNames || classSet);
      return {
        name: item.name,
        classNames,
        slot: slotSet.join(" / ") || "Unknown",
        source: sourceSet.join(" / ") || "Unknown",
        capacity: joinStatSet(capacitySet),
        ammo: joinStatSet(ammoSet),
        attributes,
        iconUrl: item.iconUrl || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeClassSet(classSet) {
  if (classSet.includes("All Classes")) return ["All Classes"];
  return classSet.filter(Boolean).length ? classSet.filter(Boolean) : ["Unknown"];
}

function joinStatSet(values) {
  if (!values.length) return null;
  if (values.length === 1) return values[0];
  return values.map((value) => (value === Number.POSITIVE_INFINITY ? "\u221e" : value)).join(" / ");
}

function parseWeaponsHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const output = doc.querySelector(".mw-parser-output") || doc.body;
  const parsed = [];
  let currentClass = "";
  let currentSlot = "";
  let withinWeapons = false;

  [...output.children].forEach((element) => {
    const tag = element.tagName;
    const headingText = getHeadingText(element);

    if (tag === "H2") {
      if (/Weapons List/i.test(headingText)) {
        withinWeapons = true;
        return;
      }
      if (/Trivia/i.test(headingText)) {
        withinWeapons = false;
        return;
      }
      const className = getCurrentClassFromHeading(headingText);
      if (className) {
        withinWeapons = className !== "Community Only";
        currentClass = className;
        currentSlot = "Unknown";
      }
    }

    if (!withinWeapons) return;
    if (tag === "H3") currentSlot = getCurrentSlotFromHeading(headingText, currentSlot);

    if (tag === "TABLE" && element.classList.contains("wikitable")) {
      const grid = tableToGrid(element);
      const indexes = getTableColumnIndexes(grid);

      grid.slice(indexes.dataStart).forEach((cells) => {
        const weaponCell = cells[indexes.weapon];
        if (!weaponCell) return;
        const weapon = extractWeaponCell(weaponCell);
        if (!weapon) return;

        const capacityCell = indexes.capacity >= 0 ? cells[indexes.capacity] : null;
        const ammoCell = indexes.ammo >= 0 ? cells[indexes.ammo] : null;
        parsed.push({
          ...weapon,
          className: currentClass || "Unknown",
          slot: currentSlot || "Unknown",
          capacity: normalizeStatCell(cellText(capacityCell)),
          ammo: normalizeStatCell(cellText(ammoCell)),
          attributes: extractRowAttributes(cells, indexes),
        });
      });
    }
  });

  return dedupeWeapons(parsed);
}
