import { JSDOM } from "jsdom";
import { getImageUrl } from "./shared/assets.mjs";
import { cleanText, getHeadingText, normalizeName } from "./shared/text.mjs";

const TAUNTS_API_URL = "https://typicalcolors2.fandom.com/api.php?action=parse&page=Taunts&prop=text&format=json&origin=*";
const WIKI_API_BASE = "https://typicalcolors2.fandom.com/api.php?action=parse&prop=text&format=json&origin=*&page=";
const WIKI_PAGE_BASE = "https://typicalcolors2.fandom.com";

export async function scrapeTauntsFromWiki() {
  const response = await fetch(TAUNTS_API_URL);
  if (!response.ok) throw new Error(`TC2 taunts wiki request failed with ${response.status}`);
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) throw new Error("TC2 taunts wiki API returned no rendered HTML.");
  const links = parsePurchasableTauntLinks(html);
  if (links.length < 10) throw new Error(`Scrape found only ${links.length} purchasable taunt links.`);

  const taunts = [];
  for (const link of links) {
    const taunt = await scrapeTauntPage(link);
    if (taunt) taunts.push(taunt);
  }

  const unique = [...new Map(taunts.map((taunt) => [taunt.name.toLowerCase(), taunt])).values()]
    .filter((taunt) => taunt.imageUrl)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (unique.length < 10) throw new Error(`Scrape returned only ${unique.length} purchasable taunts with icons.`);
  return unique;
}

function parsePurchasableTauntLinks(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const output = doc.querySelector(".mw-parser-output") || doc.body;
  const links = new Map();
  let inSection = false;

  [...output.children].forEach((element) => {
    const tag = element.tagName;
    const heading = getHeadingText(element);

    if (/^H[23]$/.test(tag) && /Purchasable Taunts/i.test(heading)) {
      inSection = true;
      return;
    }

    if (inSection && /^H[23]$/.test(tag) && !/Purchasable Taunts/i.test(heading)) {
      inSection = false;
      return;
    }

    if (!inSection) return;

    element.querySelectorAll("tr").forEach((row) => {
      const cells = [...row.children].filter((cell) => /^(TD|TH)$/.test(cell.tagName));
      if (cells.length < 2) return;

      const tauntPreview = cells[0].querySelector("img[data-image-key], img[alt]");
      const previewKey = cleanText(
        tauntPreview?.getAttribute("data-image-key") ||
        tauntPreview?.getAttribute("data-image-name") ||
        tauntPreview?.getAttribute("alt") ||
        "",
      );

      if (!isTauntPreviewImage(previewKey)) return;
      collectNameCellLinks(cells[1], links);
    });
  });

  return [...links.values()];
}

function isTauntPreviewImage(value) {
  return /\.gif(?:$|[?#])|taunt|loop|conga|canslaughter|blood money/i.test(value);
}

function collectNameCellLinks(cell, links) {
  cell.querySelectorAll("a[href*='/wiki/']").forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    const title = cleanText(anchor.getAttribute("title") || anchor.textContent || "");
    if (!title || /File:|Special:|Category:|Help:|Template:|Roblox|Typical Colors 2/i.test(`${href} ${title}`)) return;
    links.set(title.toLowerCase(), {
      name: normalizeName(title),
      url: href.startsWith("http") ? href : `${WIKI_PAGE_BASE}${href}`,
      page: decodeURIComponent(href.split("/wiki/")[1] || title).split("#")[0],
    });
  });
}

async function scrapeTauntPage(link) {
  const response = await fetch(`${WIKI_API_BASE}${encodeURIComponent(link.page)}`);
  if (!response.ok) return null;
  const json = await response.json();
  const html = json?.parse?.text?.["*"];
  if (!html) return null;
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const image =
    doc.querySelector("aside.portable-infobox .pi-image img[data-src], aside.portable-infobox .pi-image img[src]") ||
    doc.querySelector("aside.portable-infobox img[data-src], aside.portable-infobox img[src]") ||
    doc.querySelector(".mw-parser-output img[data-src], .mw-parser-output img[src]");

  return {
    name: link.name,
    pageUrl: link.url,
    imageUrl: getImageUrl(image),
  };
}
