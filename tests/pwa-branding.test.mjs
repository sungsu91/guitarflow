import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconVersion = "57683a1d";

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath));
}

function readPngSize(relativePath) {
  const image = readProjectFile(relativePath);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

test("PWA manifest exposes JUST PLAY with separate regular and maskable icons", () => {
  const manifest = JSON.parse(readProjectFile("public/manifest.webmanifest").toString("utf8"));

  assert.equal(manifest.name, "JUST PLAY");
  assert.equal(manifest.short_name, "JUST PLAY");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, type, purpose }) => ({ src, sizes, type, purpose })),
    [
      { src: `/icons/just-play-icon-192.png?v=${iconVersion}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/just-play-icon-512.png?v=${iconVersion}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/just-play-icon-maskable-192.png?v=${iconVersion}`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icons/just-play-icon-maskable-512.png?v=${iconVersion}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  );
});

test("PWA, iOS, and favicon PNG assets have their declared dimensions", () => {
  const expectedSizes = new Map([
    ["public/icons/just-play-icon-192.png", 192],
    ["public/icons/just-play-icon-512.png", 512],
    ["public/icons/just-play-icon-maskable-192.png", 192],
    ["public/icons/just-play-icon-maskable-512.png", 512],
    ["public/icons/just-play-apple-touch-icon.png", 180],
    ["public/icons/just-play-favicon-32.png", 32],
    ["public/icons/just-play-favicon-48.png", 48],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/icon-maskable-192.png", 192],
    ["public/icons/icon-maskable-512.png", 512],
    ["public/icons/apple-touch-icon.png", 180],
    ["public/icons/favicon-32.png", 32],
    ["public/icons/favicon-48.png", 48],
  ]);

  for (const [relativePath, size] of expectedSizes) {
    assert.deepEqual(readPngSize(relativePath), { width: size, height: size });
  }

  assert.ok(readProjectFile("public/just-play-favicon.ico").length > 0);
  assert.deepEqual(
    readProjectFile("public/favicon.ico"),
    readProjectFile("public/just-play-favicon.ico"),
  );
});

test("document metadata connects JUST PLAY names and platform icons", () => {
  const html = readProjectFile("index.html").toString("utf8");

  assert.match(html, /<meta name="application-name" content="JUST PLAY"/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="JUST PLAY"/);
  assert.match(html, new RegExp(`<link rel="manifest" href="/manifest\\.webmanifest\\?v=${iconVersion}"`));
  assert.match(html, new RegExp(`<link rel="apple-touch-icon" sizes="180x180" href="/icons/just-play-apple-touch-icon\\.png\\?v=${iconVersion}"`));
  assert.match(html, new RegExp(`<link rel="shortcut icon" href="/just-play-favicon\\.ico\\?v=${iconVersion}"`));
  assert.match(html, /<title>JUST PLAY<\/title>/);
});

test("Vercel revalidates manifest and JUST PLAY icon metadata", () => {
  const config = JSON.parse(readProjectFile("vercel.json").toString("utf8"));
  const cacheControlBySource = new Map(
    config.headers.map(({ source, headers }) => [
      source,
      headers.find(({ key }) => key.toLowerCase() === "cache-control")?.value,
    ]),
  );
  const revalidate = "public, max-age=0, must-revalidate";

  assert.equal(cacheControlBySource.get("/manifest.webmanifest"), revalidate);
  assert.equal(cacheControlBySource.get("/icons/(.*)"), revalidate);
  assert.equal(cacheControlBySource.get("/just-play-favicon.ico"), revalidate);
  assert.equal(cacheControlBySource.get("/favicon.ico"), revalidate);
});
