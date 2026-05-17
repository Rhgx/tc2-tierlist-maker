import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const distPath = path.join(projectRoot, "dist");
const indexPath = path.join(distPath, "index.html");
const fallbackPath = path.join(distPath, "404.html");
const tierlistsPath = path.join(projectRoot, "src", "data", "generated", "tierlists.generated.ts");

await stat(indexPath);
await copyFile(indexPath, fallbackPath);

const routes = readStaticRoutes(await readFile(tierlistsPath, "utf8"));
await Promise.all(routes.map((route) => createRouteEntry(route)));

console.log(`Created GitHub Pages SPA fallback at dist/404.html and ${routes.length} static route entries.`);

function readStaticRoutes(source) {
  const match = source.match(/export const tierlists: TierlistEntry\[\] = ([\s\S]*?\n\]);/);
  if (!match) throw new Error(`Could not parse tierlists from ${tierlistsPath}`);

  const tierlists = JSON.parse(match[1]);
  const routes = new Set();

  for (const entry of tierlists) collectEntryRoutes(entry, routes);
  return [...routes].sort();
}

function collectEntryRoutes(entry, routes) {
  if (entry.type === "folder") {
    routes.add(`folder/${encodeURIComponent(entry.id)}`);
    for (const child of entry.children || []) collectEntryRoutes(child, routes);
    return;
  }

  routes.add(`tierlist/${encodeURIComponent(entry.id)}`);
}

async function createRouteEntry(route) {
  const directoryIndexPath = path.join(distPath, route, "index.html");
  const extensionlessFallbackPath = path.join(distPath, `${route}.html`);

  await mkdir(path.dirname(directoryIndexPath), { recursive: true });
  await copyFile(indexPath, directoryIndexPath);
  await copyFile(indexPath, extensionlessFallbackPath);
}
