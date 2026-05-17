import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const distPath = path.join(projectRoot, "dist");
const indexPath = path.join(distPath, "index.html");
const fallbackPath = path.join(distPath, "404.html");

await stat(indexPath);
await copyFile(indexPath, fallbackPath);
console.log("Created GitHub Pages SPA fallback at dist/404.html.");
