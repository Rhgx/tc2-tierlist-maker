import { JSDOM } from "jsdom";
import { getRawImageUrl } from "./shared/assets.mjs";
import { cleanText, getHeadingText, normalizeName } from "./shared/text.mjs";

const UNUSUAL_API_URL =
  "https://typicalcolors2.fandom.com/api.php?action=parse&page=Item_Qualities/Unusual&prop=text&format=json&origin=*";
const WIKI_PAGE_URL = "https://typicalcolors2.fandom.com/wiki/Item_Qualities/Unusual";

export async function scrapeUnusualsFromWiki() {
  const response = await fetch(UNUSUAL_API_URL);
  if (!response.ok) throw new Error(`TC2 unusual wiki request failed with ${response.status}`);
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) throw new Error("TC2 unusual wiki API returned no rendered HTML.");

  const unusuals = parseUnusualsHtml(html);
  if (unusuals.length < 20) throw new Error(`Scrape returned only ${unusuals.length} unusual effects.`);
  return unusuals;
}

function parseUnusualsHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const output = doc.querySelector(".mw-parser-output") || doc.body;
  const unusuals = [];
  let section = "";
  let series = "";
  let includeEffects = false;

  [...output.children].forEach((element) => {
    const tag = element.tagName;
    const heading = getHeadingText(element);

    if (tag === "H2") {
      section = heading;
      includeEffects = !/scrapped|update history|trivia|sources/i.test(section);
      series = "";
      return;
    }

    if (tag === "H3") {
      series = heading;
      return;
    }

    if (!includeEffects || !element.classList.contains("unusual-exhibition")) return;

    element.querySelectorAll(".unusual-exhibition__item").forEach((item) => {
      const caption = normalizeName(item.querySelector(".unusual-exhibition__item-caption")?.textContent || item.id || "");
      const image = item.querySelector(".unusual-exhibition__item-image img[data-src], .unusual-exhibition__item-image img[src]");
      const imageUrl = getRawImageUrl(image);
      if (!caption || !imageUrl) return;
      unusuals.push({
        name: cleanupEffectName(caption),
        section: cleanText(section),
        series: cleanText(series),
        pageUrl: `${WIKI_PAGE_URL}#${encodeURIComponent(item.id || caption.replace(/\s+/g, "_"))}`,
        imageUrl,
      });
    });
  });

  return [...new Map(unusuals.map((item) => [item.name.toLowerCase(), item])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
}

function cleanupEffectName(value) {
  return normalizeName(value)
    .replace(/\s+gif$/i, "")
    .replace(/\s+effect$/i, "")
    .replace(/\s+new(?:\s+version)?$/i, "")
    .trim();
}
