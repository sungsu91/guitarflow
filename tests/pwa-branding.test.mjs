import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, purpose }) => ({ src, sizes, purpose })),
    [
      { src: "/icons/icon-192.png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" },
    ],
  );
});

test("PWA, iOS, and favicon PNG assets have their declared dimensions", () => {
  const expectedSizes = new Map([
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

  assert.ok(readProjectFile("public/favicon.ico").length > 0);
});

test("document metadata connects JUST PLAY names and platform icons", () => {
  const html = readProjectFile("index.html").toString("utf8");

  assert.match(html, /<meta name="application-name" content="JUST PLAY"/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="JUST PLAY"/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/icons\/apple-touch-icon\.png"/);
  assert.match(html, /<link rel="shortcut icon" href="\/favicon\.ico"/);
  assert.match(html, /<title>JUST PLAY<\/title>/);
});
