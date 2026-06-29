import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { cleanText } from "./text.mjs";

const scraperRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schluberFontPath = path.join(scraperRoot, "assets", "Schluber.ttf");
const labelAssetScriptPath = path.join(scraperRoot, "label-asset.py");
const execFileAsync = promisify(execFile);

export function normalizeImageUrl(url) {
  if (!url) return "";
  const absolute = url.startsWith("//")
    ? `https:${url}`
    : url.startsWith("/")
      ? `https://typicalcolors2.fandom.com${url}`
      : url;

  if (!absolute.includes("static.wikia.nocookie.net")) return absolute;

  const parsed = new URL(absolute);
  const latestIndex = parsed.pathname.indexOf("/revision/latest");
  if (latestIndex < 0) return absolute;

  const cb = parsed.searchParams.get("cb");
  parsed.pathname = parsed.pathname.slice(0, latestIndex + "/revision/latest".length);
  parsed.search = cb ? `?cb=${encodeURIComponent(cb)}` : "";
  return parsed.toString();
}

export function getImageUrl(img) {
  if (!img) return "";
  const raw = img.getAttribute("data-src") || img.getAttribute("src") || "";
  return normalizeImageUrl(raw);
}

export function getRawImageUrl(img) {
  if (!img) return "";
  const raw = img.getAttribute("data-src") || img.getAttribute("src") || "";
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `https://typicalcolors2.fandom.com${raw}`;
  return raw;
}

export function isStaticBackgroundUrl(url) {
  try {
    const parsed = new URL(url);
    return !/\.(gif)(?:$|[/?#])/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function downloadAssets(items, directoryPath, publicPrefix, projectRoot, options = {}) {
  await prepareAssetDirectory(directoryPath, projectRoot);

  const uniqueItems = [...new Map(items.filter((item) => item.url).map((item) => [item.dedupeKey || item.url, item])).values()];
  const pathByUrl = new Map();
  const progressLabel = options.progressLabel || "";
  const progressEvery = Math.max(1, options.progressEvery || Math.ceil(uniqueItems.length / 5));
  let cursor = 0;
  let completed = 0;
  const workerCount = 8;

  if (progressLabel) {
    console.log(`[assets] ${progressLabel}: ${uniqueItems.length} unique asset${uniqueItems.length === 1 ? "" : "s"} queued.`);
  }

  async function worker() {
    while (cursor < uniqueItems.length) {
      const item = uniqueItems[cursor];
      cursor += 1;

      const baseName = item.namePrefix || slugifyFileName(item.name);
      const fileName = item.fileName || `${baseName}-${hashValue(item.url)}${assetExtension(item, options)}`;
      const outputPath = path.join(directoryPath, fileName);
      await writeAsset(item.url, outputPath, directoryPath, path.parse(fileName).name, { ...options, item });
      if (options.afterWrite) {
        await options.afterWrite(outputPath, item);
      }
      pathByUrl.set(item.dedupeKey || item.url, `${publicPrefix}/${fileName}`);
      completed += 1;
      if (progressLabel && (completed === uniqueItems.length || completed % progressEvery === 0)) {
        console.log(`[assets] ${progressLabel}: ${completed}/${uniqueItems.length} ready.`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(workerCount, uniqueItems.length) }, worker));
  await pruneAssetDirectory(directoryPath, new Set([...pathByUrl.values()].map((url) => path.basename(url))));
  return pathByUrl;
}

function slugifyFileName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "asset";
}

function hashValue(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function assetExtension(item, options) {
  if (item.extension) return item.extension.startsWith(".") ? item.extension : `.${item.extension}`;
  if (options.preserveGif && /\.gif(?:$|[/?#])/i.test(new URL(item.url).pathname)) return ".gif";
  return ".webp";
}

async function prepareAssetDirectory(directoryPath, projectRoot) {
  const resolved = path.resolve(directoryPath);
  const publicRoot = path.join(projectRoot, "public");
  if (!resolved.startsWith(publicRoot)) {
    throw new Error(`Refusing to clean asset directory outside public: ${resolved}`);
  }

  await mkdir(resolved, { recursive: true });
}

async function writeAsset(url, outputPath, directoryPath, outputBaseName, options = {}) {
  if (!options.force && await fileExists(outputPath)) return;

  const existingPath = options.force ? "" : await findExistingAsset(directoryPath, outputBaseName);
  if (existingPath) {
    await writeWebpAsset(await readExistingAsset(existingPath), outputPath, options);
    return;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset request failed with ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeWebpAsset(bytes, outputPath, options);
}

async function writeWebpAsset(bytes, outputPath, options = {}) {
  if (options.preserveGif && path.extname(outputPath).toLowerCase() === ".gif") {
    await writeFile(outputPath, bytes);
    return;
  }

  let pipeline = sharp(bytes, options.animated ? { animated: true, limitInputPixels: false } : undefined);
  if (options.resize) {
    pipeline = pipeline.resize(options.resize.width, options.resize.height);
  }
  const webp = await pipeline.webp({ quality: 82, effort: 5 }).toBuffer();
  await writeFile(outputPath, webp);
}

async function findExistingAsset(directoryPath, outputBaseName) {
  const entries = await readdir(directoryPath).catch(() => []);
  const match = entries.find((entry) => path.parse(entry).name === outputBaseName && path.extname(entry).toLowerCase() !== ".webp");
  return match ? path.join(directoryPath, match) : "";
}

async function readExistingAsset(filePath) {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function pruneAssetDirectory(directoryPath, expectedFileNames) {
  const entries = await readdir(directoryPath).catch(() => []);
  await Promise.all(entries.map(async (entry) => {
    if (expectedFileNames.has(entry)) return;
    await rm(path.join(directoryPath, entry), { force: true, recursive: true });
  }));
}

export async function summarizeAssetDirectory(directoryPath) {
  const entries = await readdir(directoryPath).catch(() => []);
  let count = 0;
  let bytes = 0;

  await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(directoryPath, entry);
    const info = await stat(filePath);
    if (!info.isFile()) return;
    count += 1;
    bytes += info.size;
  }));

  return { count, bytes };
}

export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function addMapLabelToAsset(filePath, label) {
  await execFileAsync("python", [labelAssetScriptPath, filePath, label, schluberFontPath], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

export async function addDisguiseKitLabelToAsset(filePath) {
  await execFileAsync("python", [labelAssetScriptPath, filePath, "DISGUISE\nKIT", schluberFontPath, "center-yellow"], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}
