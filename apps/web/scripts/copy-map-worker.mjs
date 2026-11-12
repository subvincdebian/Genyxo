// MapLibre runs its tile worker from a separate module. Next's bundler does not
// emit it, so the build copies it under public/ with the version in its name
// (the map asks for exactly that file, and a new version never hits a stale cache).
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const library = join(web, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(library, "package.json"), "utf8"));
const target = join(web, "public", "vendor", "maplibre");
mkdirSync(target, { recursive: true });
for (const file of readdirSync(target)) if (file.startsWith("worker-")) rmSync(join(target, file));
copyFileSync(join(library, "dist", "maplibre-gl-worker.mjs"), join(target, `worker-${version}.mjs`));
console.log(`MapLibre worker ${version} copied to public/vendor/maplibre`);
