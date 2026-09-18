import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconVersion = "236d47ee";

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath));
}

function readPngHeader(relativePath) {
  const image = readProjectFile(relativePath);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    bitDepth: image[24],
    colorType: image[25],
  };
}

test("PWA manifest exposes FRETIVA LAB with separate regular and maskable icons", () => {
  const manifest = JSON.parse(readProjectFile("public/manifest.webmanifest").toString("utf8"));

  assert.equal(manifest.name, "FRETIVA LAB");
  assert.equal(manifest.short_name, "FRETIVA LAB");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "any");
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, type, purpose }) => ({ src, sizes, type, purpose })),
    [
      { src: `/icons/fretiva-lab-pink-v1-icon-192.png?v=${iconVersion}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/fretiva-lab-pink-v1-icon-512.png?v=${iconVersion}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/fretiva-lab-pink-v1-icon-maskable-192.png?v=${iconVersion}`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icons/fretiva-lab-pink-v1-icon-maskable-512.png?v=${iconVersion}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  );
});

test("PWA, iOS, and favicon PNG assets have their declared dimensions", () => {
  const expectedSizes = new Map([
    ["public/assets/branding/fretiva-lab-app-icon-master.png", 1254],
    ["public/icons/fretiva-lab-pink-v1-icon-1024.png", 1024],
    ["public/icons/fretiva-lab-pink-v1-icon-192.png", 192],
    ["public/icons/fretiva-lab-pink-v1-icon-512.png", 512],
    ["public/icons/fretiva-lab-pink-v1-icon-maskable-192.png", 192],
    ["public/icons/fretiva-lab-pink-v1-icon-maskable-512.png", 512],
    ["public/icons/fretiva-lab-pink-v1-apple-touch-icon.png", 180],
    ["public/icons/fretiva-lab-pink-v1-favicon-32.png", 32],
    ["public/icons/fretiva-lab-pink-v1-favicon-48.png", 48],
    ["public/icons/just-play-icon-1024.png", 1024],
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
    assert.deepEqual(
      readPngHeader(relativePath),
      {
        width: size,
        height: size,
        bitDepth: 8,
        colorType: 2,
      },
    );
  }

  assert.ok(readProjectFile("public/fretiva-lab-pink-v1-favicon.ico").length > 0);
  assert.deepEqual(
    readProjectFile("public/favicon.ico"),
    readProjectFile("public/fretiva-lab-pink-v1-favicon.ico"),
  );
  assert.deepEqual(
    readProjectFile("public/just-play-favicon.ico"),
    readProjectFile("public/fretiva-lab-pink-v1-favicon.ico"),
  );
});

test("the supplied FRETIVA LAB icon remains the exact deployment master", () => {
  const master = readProjectFile("public/assets/branding/fretiva-lab-app-icon-master.png");
  assert.equal(
    createHash("sha256").update(master).digest("hex"),
    "236d47eedaefe2916c57b1245fc4f1e8cf5b9f660338084cf5d6684531a15dcf",
  );
});

test("installable icons are opaque RGB assets to preserve the supplied white background", () => {
  const installableIcons = [
    "public/icons/fretiva-lab-pink-v1-apple-touch-icon.png",
    "public/icons/fretiva-lab-pink-v1-icon-192.png",
    "public/icons/fretiva-lab-pink-v1-icon-512.png",
    "public/icons/fretiva-lab-pink-v1-icon-maskable-192.png",
    "public/icons/fretiva-lab-pink-v1-icon-maskable-512.png",
    "public/icons/just-play-apple-touch-icon.png",
    "public/icons/just-play-icon-192.png",
    "public/icons/just-play-icon-512.png",
    "public/icons/just-play-icon-maskable-192.png",
    "public/icons/just-play-icon-maskable-512.png",
    "public/icons/apple-touch-icon.png",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/icon-maskable-192.png",
    "public/icons/icon-maskable-512.png",
  ];

  for (const relativePath of installableIcons) {
    assert.equal(readPngHeader(relativePath).colorType, 2, `${relativePath} must not contain alpha`);
  }
});

test("document metadata connects FRETIVA LAB names and platform icons", () => {
  const html = readProjectFile("index.html").toString("utf8");

  assert.match(html, /<meta name="application-name" content="FRETIVA LAB"/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="FRETIVA LAB"/);
  assert.match(html, new RegExp(`<link rel="manifest" href="/manifest\\.webmanifest\\?v=${iconVersion}"`));
  assert.match(html, new RegExp(`<link rel="apple-touch-icon" sizes="180x180" href="/icons/fretiva-lab-pink-v1-apple-touch-icon\\.png\\?v=${iconVersion}"`));
  assert.match(html, new RegExp(`<link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href="/fretiva-lab-pink-v1-favicon\\.ico\\?v=${iconVersion}"`));
  assert.equal((html.match(/<link rel="(?:shortcut )?icon"/g) ?? []).length, 1, "Use one multi-size favicon across mode navigation");
  assert.match(html, /<title>FRETIVA LAB<\/title>/);
});

test("Vercel revalidates manifest and FRETIVA LAB icon metadata", () => {
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
  assert.equal(cacheControlBySource.get("/fretiva-lab-pink-v1-favicon.ico"), revalidate);
  assert.equal(cacheControlBySource.get("/just-play-favicon.ico"), revalidate);
  assert.equal(cacheControlBySource.get("/favicon.ico"), revalidate);
});
