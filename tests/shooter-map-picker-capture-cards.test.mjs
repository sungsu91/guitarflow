import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { LAYERED_SHOOTER_MAP_SKINS } from "../src/shooter/maps/registry.js";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);
const captureAssets = [
  ["coastal-cove-current.jpg", new URL("../public/assets/maps/previews/coastal-cove-current.jpg", import.meta.url)],
  ["lava-canyon-current.jpg", new URL("../public/assets/maps/previews/lava-canyon-current.jpg", import.meta.url)],
  ["park-current.jpg", new URL("../public/assets/maps/previews/park-current.jpg", import.meta.url)],
  ["river-garden-current.jpg", new URL("../public/assets/maps/previews/river-garden-current.jpg", import.meta.url)],
  ["clockwork-opera-citadel-current.jpg", new URL("../public/assets/maps/previews/clockwork-opera-citadel-current.jpg", import.meta.url)],
  ["abyssal-moon-cathedral-current.jpg", new URL("../public/assets/maps/previews/abyssal-moon-cathedral-current.jpg", import.meta.url)],
];

function readJpegSize(buffer) {
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);

  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += 2 + segmentLength;
  }

  throw new Error("JPEG size marker not found");
}

test("map picker uses current 430px mobile map captures", async () => {
  for (const [name, url] of captureAssets) {
    const header = await readFile(url).then(readJpegSize);
    assert.deepEqual(header, { width: 430, height: 804 }, name);
  }
});

test("layered maps expose dedicated picker captures without replacing gameplay previews", async () => {
  const sources = await Promise.all([
    new URL("../src/shooter/maps/skins/coastalCove.js", import.meta.url),
    new URL("../src/shooter/maps/skins/lavaCanyon.js", import.meta.url),
    new URL("../src/shooter/maps/skins/park.js", import.meta.url),
    new URL("../src/shooter/maps/skins/river.js", import.meta.url),
    new URL("../src/shooter/maps/skins/clockworkOperaCitadel.js", import.meta.url),
    new URL("../src/shooter/maps/skins/abyssalMoonCathedral.js", import.meta.url),
  ].map((url) => readFile(url, "utf8")));

  assert.match(sources[0], /pickerPreviewImage: "\/assets\/maps\/previews\/coastal-cove-current\.jpg"/);
  assert.match(sources[1], /pickerPreviewImage: "\/assets\/maps\/previews\/lava-canyon-current\.jpg"/);
  assert.match(sources[2], /pickerPreviewImage: "\/assets\/maps\/previews\/park-current\.jpg"/);
  assert.match(sources[3], /pickerPreviewImage: "\/assets\/maps\/previews\/river-garden-current\.jpg"/);
  assert.match(sources[4], /pickerPreviewImage: "\/assets\/maps\/previews\/clockwork-opera-citadel-current\.jpg"/);
  assert.match(sources[5], /pickerPreviewImage: "\/assets\/maps\/previews\/abyssal-moon-cathedral-current\.jpg"/);
  sources.forEach((source) => assert.match(source, /previewImage:/));
});

test("map picker renders platform-sized full capture cards and a random montage", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /map\?\.pickerPreviewImage \?\? map\?\.previewImage/);
  assert.match(appSource, /className="shooterMapRandomPreview"/);
  assert.match(appSource, /className="shooterMapRandomPreviewTile shooterMapPreview--image"/);
  assert.match(appSource, /const shooterMapPickerOptions = isMobileLayout\s*\? LAYERED_SHOOTER_MAP_SKINS/);
  assert.deepEqual(
    LAYERED_SHOOTER_MAP_SKINS.map((map) => map.id),
    [
      "river-garden",
      "lava-canyon",
      "coastal-cove",
      "park",
      "clockwork-opera-citadel",
      "abyssalMoonCathedral",
      "celestial-eclipse-clocktower",
      "autumn_moon_temple_path",
      "gacha-arcade",
    ],
  );
  assert.match(styleSource, /Mobile map picker keeps every direct map choice visible/);
  assert.match(styleSource, /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapPickerGrid\s*\{[\s\S]*?display: flex !important;[\s\S]*?flex-flow: row wrap;/);
  assert.match(styleSource, /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapCard\s*\{[\s\S]*?height: 61px !important;[\s\S]*?aspect-ratio: auto !important;/);
  assert.match(
    styleSource,
    /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapPickerGrid[\s\S]*?\.shooterMapCard--default\s*\{[\s\S]*?flex-basis: calc\(\(100% - 12px\) \/ 3\);[\s\S]*?height: 61px !important;/,
  );
  assert.match(styleSource, /\.shooterMapCard > \.shooterMapPreview/);
  assert.match(styleSource, /Desktop keeps its three-column catalog/);
  assert.match(styleSource, /@media \(min-width: 720px\)[\s\S]*?\.shooterMapPickerGrid\s*\{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important;/);
});
