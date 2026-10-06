import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = resolve("public/assets/shooter/instruments/fl-custom-heritage-v1");
const archive = resolve("output/fl-custom-heritage/originals");
const manifestPath = resolve("src/shooter/instruments/heritageInstrumentPack.manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const generation = JSON.parse(await readFile("output/fl-custom-heritage/generation.json", "utf8"));
await mkdir(root, { recursive: true });
await mkdir(archive, { recursive: true });

function alphaBounds(data, info) {
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Empty transparent instrument");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

for (const skin of manifest) {
  const item = generation.items.find((item) => item.id === skin.id);
  if (!item?.source) throw new Error(`Missing final generation: ${skin.id}`);
  await copyFile(item.source, resolve(archive, `${skin.id}.png`));
  const source = sharp(item.source);
  const metadata = await source.metadata();
  if (!metadata.hasAlpha) throw new Error(`Missing transparency: ${skin.id}`);
  const raw = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(raw.data, raw.info);
  // Reframe only: preserve generated alpha, materials, proportions, and details.
  const left = Math.max(0, bounds.left - 2), top = Math.max(0, bounds.top - 2);
  const crop = { left, top, width: Math.min(metadata.width - left, bounds.width + 4), height: Math.min(metadata.height - top, bounds.height + 4) };
  const { data: fitted, info } = await source.extract(crop).resize({ width: 480, height: 736, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  const target = resolve(root, `${skin.id}.png`);
  await sharp(fitted).extend({
    left: Math.floor((512 - info.width) / 2), right: Math.ceil((512 - info.width) / 2),
    top: Math.floor((768 - info.height) / 2), bottom: Math.ceil((768 - info.height) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png({ compressionLevel: 9 }).toFile(target);
  const normalized = await sharp(target).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visible = alphaBounds(normalized.data, normalized.info);
  Object.assign(skin, { canvasWidth: 512, canvasHeight: 768, visibleTop: visible.top, visibleWidth: visible.width, visibleHeight: visible.height });
  console.log(`${skin.title}: ${visible.width} × ${visible.height}, transparent 512 × 768`);
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
