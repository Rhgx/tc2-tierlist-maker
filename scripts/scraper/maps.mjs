import { JSDOM } from "jsdom";
import { getImageUrl } from "./shared/assets.mjs";
import { cleanText, getHeadingText, normalizeName } from "./shared/text.mjs";

const MAPS_API_URL =
  "https://typicalcolors2.fandom.com/api.php?action=parse&page=Maps&prop=text&format=json&origin=*";
const WIKI_API_BASE = "https://typicalcolors2.fandom.com/api.php?action=parse&prop=text&format=json&origin=*&page=";
const WIKI_PAGE_BASE = "https://typicalcolors2.fandom.com";
const MAP_IMAGE_MODE_PRIORITY = [
  "Attack Defense",
  "Attack/Defense",
  "King of the Hill",
  "Payload",
  "Capture the Flag",
  "Control Points",
  "Player Destruction",
  "Arena",
  "Vs. Bosses",
  "Team Deathmatch",
  // Preserve the wiki's historical misspelling so scraped rows still rank correctly.
  "Medieaval",
  "Medieval",
  "Training",
  "Infection",
  "Prop Hunt",
  "None",
];
const GALLERY_FALLBACK_LABELS = new Set([
  "ad_atlantis",
  "bathroom",
  "none_bathroom",
  "koth_surf",
  "koth_surtf",
  "medieval_sfoth",
  "testmap",
]);

export async function scrapeMapsFromWiki() {
  const response = await fetch(MAPS_API_URL);
  if (!response.ok) throw new Error(`TC2 maps wiki request failed with ${response.status}`);
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) throw new Error("TC2 maps wiki API returned no rendered HTML.");
  const maps = await resolveMapIconUrls(parseMapsHtml(html));
  if (maps.length < 20) throw new Error(`Scrape returned only ${maps.length} maps.`);
  return maps;
}

function getCurrentMapGroup(text, currentGroup) {
  const heading = cleanText(text);
  if (/Standard game\s*mode/i.test(heading)) return "Standard";
  if (/Special game\s*mode/i.test(heading)) return "Special";
  return currentGroup;
}

function normalizeMapStatus(value) {
  const text = cleanText(value)
    .replace(/\u2b24/g, "")
    .replace(/\u25cf/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/active\s*\(console\/mobile only\)/i.test(text)) return "Active (Console/Mobile Only)";
  if (/active\s*\(rare\)/i.test(text)) return "Active (Rare)";
  if (/community server/i.test(text)) return "Community Server";
  if (/seasonal/i.test(text)) return "Seasonal";
  if (/^active$/i.test(text)) return "Active";
  return text;
}

function isAllowedMapStatus(status) {
  return ["Active", "Active (Console/Mobile Only)", "Active (Rare)", "Seasonal", "Community Server"].includes(status);
}

function isAllowedMapMode(gameMode) {
  return !/^(infection|prop hunt)$/i.test(cleanText(gameMode));
}

function extractMapItem(item, gameMode, group) {
  if (!isAllowedMapMode(gameMode)) return null;

  const caption = item.querySelector(".lightbox-caption");
  const link = caption?.querySelector("a[href*='/wiki/']");
  const name = normalizeName(link?.textContent || "");
  if (!name) return null;

  const captionText = cleanText(caption?.textContent || "");
  const status = normalizeMapStatus(captionText.slice(name.length));
  if (!isAllowedMapStatus(status)) return null;

  const image = item.querySelector("img[data-src], img[src]");
  const imageUrl = getImageUrl(image);
  return {
    name,
    page: decodeURIComponent((link?.getAttribute("href") || "").split("/wiki/")[1] || name).split("#")[0],
    pageUrl: link?.getAttribute("href")?.startsWith("http") ? link.getAttribute("href") : `${WIKI_PAGE_BASE}${link?.getAttribute("href") || `/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}`}`,
    gameMode: gameMode || "None",
    group: group || "Special",
    status,
    imageUrl,
  };
}

function dedupeMaps(rows) {
  const byMapMode = new Map();

  rows.forEach((row) => {
    const key = `${row.name.toLowerCase()}::${row.gameMode.toLowerCase()}`;
    if (!byMapMode.has(key)) {
      byMapMode.set(key, {
      name: row.name,
      page: row.page,
      pageUrl: row.pageUrl,
      gameMode: row.gameMode,
        imageUrl: row.imageUrl || "",
        groups: new Set(),
        statuses: new Set(),
      });
    }

    const item = byMapMode.get(key);
    if (!item.imageUrl && row.imageUrl) item.imageUrl = row.imageUrl;
    item.groups.add(row.group);
    item.statuses.add(row.status);
  });

  return keepUniqueMapNames([...byMapMode.values()])
    .map((item) => ({
      name: item.name,
      page: item.page,
      pageUrl: item.pageUrl,
      gameMode: item.gameMode,
      group: [...item.groups].sort((a, b) => a.localeCompare(b)).join(" / "),
      status: [...item.statuses].sort((a, b) => a.localeCompare(b)).join(" / "),
      imageUrl: item.imageUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.gameMode.localeCompare(b.gameMode));
}

async function resolveMapIconUrls(maps) {
  let cursor = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (cursor < maps.length) {
      const map = maps[cursor];
      cursor += 1;
      const iconUrl = await scrapeMapIconUrl(map);
      if (iconUrl) {
        map.imageUrl = iconUrl;
      } else if (!shouldUseGalleryFallback(map)) {
        console.warn(`[maps] Falling back to gallery image for ${map.name} (${map.gameMode}).`);
      }
    }
  });

  await Promise.all(workers);
  return maps;
}

async function scrapeMapIconUrl(map) {
  if (!map.page) return "";
  if (shouldUseGalleryFallback(map)) return "";
  const response = await fetch(`${WIKI_API_BASE}${encodeURIComponent(map.page)}`);
  if (!response.ok) return "";
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) return "";

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const section = [...doc.querySelectorAll("aside.portable-infobox section.pi-item.pi-group")]
    .find((element) => cleanText(element.querySelector("h2")?.textContent || "").toLowerCase() === "map icon");
  const imageLink = selectMapIconLink(section, map);
  const href = imageLink?.getAttribute("href");
  if (href) return href.startsWith("http") ? href : `${WIKI_PAGE_BASE}${href}`;
  const sectionImage = getImageUrl(section?.querySelector("img[data-src], img[src]"));
  if (sectionImage) return sectionImage;

  const legacyImageLink = selectLegacyMapIconLink(doc);
  const legacyHref = legacyImageLink?.getAttribute("href");
  if (legacyHref) return legacyHref.startsWith("http") ? legacyHref : `${WIKI_PAGE_BASE}${legacyHref}`;
  return getImageUrl(legacyImageLink?.querySelector("img[data-src], img[src]"));
}

function shouldUseGalleryFallback(map) {
  return GALLERY_FALLBACK_LABELS.has(mapFallbackLabel(map));
}

function mapFallbackLabel(map) {
  const mapName = slugifyMapName(map.name).replace(/-/g, "_");
  const mode = modePrefix(map.gameMode);
  return mode ? `${mode}_${mapName}` : mapName;
}

function selectMapIconLink(section, map) {
  if (!section) return null;

  const contents = [...section.querySelectorAll(".wds-tab__content")];
  if (contents.length) {
    const tabs = [...section.querySelectorAll(".wds-tabs__tab")].map((tab) => cleanText(tab.textContent));
    const candidates = contents.map((content, index) => ({
      content,
      label: tabs[index] || cleanText(content.querySelector("a.image")?.getAttribute("title") || content.querySelector("img")?.getAttribute("alt") || ""),
    }));
    const match = candidates.find((candidate) => isMapIconTabMatch(candidate.label, map.gameMode));
    const content = match?.content || candidates[0]?.content;
    return content?.querySelector("figure.pi-item.pi-image a.image[href], .pi-image a.image[href]") || null;
  }

  return section.querySelector("figure.pi-item.pi-image a.image[href], .pi-image a.image[href]");
}

function selectLegacyMapIconLink(doc) {
  return [...doc.querySelectorAll("aside.portable-infobox figure.pi-item.pi-image a.image[href], aside.portable-infobox .pi-image a.image[href]")]
    .find((link) => {
      const image = link.querySelector("img[data-src], img[src]");
      const text = cleanText(`${link.getAttribute("title") || ""} ${image?.getAttribute("alt") || ""}`);
      return /^icon$/i.test(text) || /\bicon\b/i.test(text);
    }) || null;
}

function isMapIconTabMatch(label, gameMode) {
  const normalizedLabel = cleanText(label).toLowerCase();
  const normalizedMode = cleanText(gameMode).toLowerCase();
  const tokensByMode = [
    [/king of the hill/, ["koth", "king of the hill"]],
    [/arena/, ["arena"]],
    [/boss/, ["vsb", "vb", "boss"]],
    [/capture the flag/, ["ctf", "capture the flag"]],
    [/team deathmatch/, ["tdm", "team deathmatch"]],
    [/control points/, ["cp", "control point"]],
    [/payload/, ["pl", "payload"]],
    [/attack/, ["ad", "attack", "defense"]],
    [/medie?val/, ["medieval", "medieaval"]],
  ];
  const match = tokensByMode.find(([modePattern]) => modePattern.test(normalizedMode));
  if (!match) return false;
  return match[1].some((token) => normalizedLabel.includes(token));
}

function keepUniqueMapNames(rows) {
  const byName = new Map();
  rows
    .sort((a, b) => getMapModePriority(a.gameMode) - getMapModePriority(b.gameMode) || a.name.localeCompare(b.name))
    .forEach((row) => {
      const key = row.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, row);
    });
  return [...byName.values()];
}

function getMapModePriority(gameMode) {
  const normalized = cleanText(gameMode);
  const index = MAP_IMAGE_MODE_PRIORITY.findIndex((mode) => mode.toLowerCase() === normalized.toLowerCase());
  return index >= 0 ? index : MAP_IMAGE_MODE_PRIORITY.length;
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

function slugifyMapName(value) {
  const cleaned = cleanText(value)
    .replace(/sword fights on the heights/i, "sfoth")
    .replace(/['’]/g, "");
  return slugify(cleaned);
}

function slugify(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function parseMapsHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const output = doc.querySelector(".mw-parser-output") || doc.body;
  const parsed = [];
  let currentGroup = "";
  let currentMode = "";

  [...output.children].forEach((element) => {
    const tag = element.tagName;
    const headingText = getHeadingText(element);

    if (tag === "H2") {
      currentGroup = getCurrentMapGroup(headingText, currentGroup);
      return;
    }

    if (tag === "H3") {
      currentMode = headingText;
      return;
    }

    if (element.classList.contains("wikia-gallery")) {
      [...element.querySelectorAll(".wikia-gallery-item")]
        .map((item) => extractMapItem(item, currentMode, currentGroup))
        .filter(Boolean)
        .forEach((map) => parsed.push(map));
    }
  });

  return dedupeMaps(parsed);
}
