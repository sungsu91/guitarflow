import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  FRETIVA_CREATIVE_INSTRUMENT_PACK_V3,
  FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_ID,
  FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_IDS,
} from "../src/shooter/instruments/fretivaCreativeInstrumentPackV3.js";

const projectRoot = new URL("../", import.meta.url);
const assetRoot = new URL(
  "../public/assets/shooter/instruments/fretiva_creative_instrument_pack_v3/",
  import.meta.url,
);

const EXPECTED = [
  ["acoustic_harbor_mist", "HARBOR MIST", "acoustic/HARBOR MIST.png", "acoustic", 267],
  ["acoustic_gilded_willow", "GILDED WILLOW", "acoustic/GILDED WILLOW.png", "acoustic", 264],
  ["acoustic_desert_mirage", "DESERT MIRAGE", "acoustic/DESERT MIRAGE.png", "acoustic", 289],
  ["acoustic_raven_copper", "RAVEN COPPER", "acoustic/RAVEN COPPER.png", "acoustic", 278],
  ["acoustic_tidewood_parlor", "TIDEWOOD PARLOR", "acoustic/TIDEWOOD PARLOR.png", "acoustic", 307],
  ["electric_solar_rift", "SOLAR RIFT", "electric/SOLAR RIFT.png", "electric", 244],
  ["electric_quantum_bloom", "QUANTUM BLOOM", "electric/QUANTUM BLOOM.png", "electric", 238],
  ["electric_void_mariner", "VOID MARINER", "electric/VOID MARINER.png", "electric", 230],
  ["electric_clockwork_wasp", "CLOCKWORK WASP", "electric/CLOCKWORK WASP.png", "electric", 233],
  ["electric_prism_fang", "PRISM FANG", "electric/PRISM FANG.png", "electric", 235],
  ["bass_manta_current", "MANTA CURRENT", "bass/MANTA CURRENT.png", "bass", 215],
  ["bass_brass_vine", "BRASS VINE", "bass/BRASS VINE.png", "bass", 206],
  ["bass_sunset_circuit", "SUNSET CIRCUIT", "bass/SUNSET CIRCUIT.png", "bass", 206],
  ["bass_aurora_fretless", "AURORA FRETLESS", "bass/AURORA FRETLESS.png", "bass", 223],
  ["bass_orbital_ash", "ORBITAL ASH", "bass/ORBITAL ASH.png", "bass", 239],
];

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodeRgbaRows(buffer) {
  const idat = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const rowLength = width * 4;
  const packed = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(rowLength * height);
  let packedOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[packedOffset];
    packedOffset += 1;
    const rowOffset = y * rowLength;
    for (let x = 0; x < rowLength; x += 1) {
      const raw = packed[packedOffset + x];
      const left = x >= 4 ? pixels[rowOffset + x - 4] : 0;
      const above = y > 0 ? pixels[rowOffset - rowLength + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[rowOffset - rowLength + x - 4] : 0;
      const predictor = filter === 1
        ? left
        : filter === 2
          ? above
          : filter === 3
            ? Math.floor((left + above) / 2)
            : filter === 4
              ? paeth(left, above, upperLeft)
              : 0;
      pixels[rowOffset + x] = (raw + predictor) & 0xff;
    }
    packedOffset += rowLength;
  }
  return { height, pixels, rowLength, width };
}

test("creative instrument V3 keeps exact manifest IDs, titles, paths, and category order", () => {
  assert.equal(FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_ID, "fretiva_creative_instrument_pack_v3");
  assert.deepEqual(
    FRETIVA_CREATIVE_INSTRUMENT_PACK_V3.map(({ id, title, file, category, visibleWidth }) => (
      [id, title, file, category, visibleWidth]
    )),
    EXPECTED,
  );
  assert.deepEqual(FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_IDS, EXPECTED.map(([id]) => id));
  assert.equal(new Set(FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_IDS).size, 15);
  assert.deepEqual(
    Object.fromEntries(["acoustic", "electric", "bass"].map((category) => [
      category,
      FRETIVA_CREATIVE_INSTRUMENT_PACK_V3
        .filter((skin) => skin.category === category)
        .map((skin) => skin.title),
    ])),
    {
      acoustic: ["HARBOR MIST", "GILDED WILLOW", "DESERT MIRAGE", "RAVEN COPPER", "TIDEWOOD PARLOR"],
      electric: ["SOLAR RIFT", "QUANTUM BLOOM", "VOID MARINER", "CLOCKWORK WASP", "PRISM FANG"],
      bass: ["MANTA CURRENT", "BRASS VINE", "SUNSET CIRCUIT", "AURORA FRETLESS", "ORBITAL ASH"],
    },
  );
  FRETIVA_CREATIVE_INSTRUMENT_PACK_V3.forEach((skin) => {
    assert.equal(skin.title, skin.file.split("/").at(-1).replace(/\.png$/i, ""));
  });
});

test("runtime contains only fifteen supplied 512x768 RGBA PNG skins with transparent outside pixels", async () => {
  const files = (await Promise.all(
    ["acoustic", "electric", "bass"].map(async (folder) => (
      (await readdir(new URL(`${folder}/`, assetRoot))).map((name) => `${folder}/${name}`)
    )),
  )).flat().sort();
  assert.deepEqual(files, EXPECTED.map(([, , file]) => file).sort());
  assert.equal(files.some((file) => /preview/i.test(file)), false);

  await Promise.all(EXPECTED.map(async ([, , file, , expectedVisibleWidth]) => {
    const buffer = await readFile(new URL(file, assetRoot));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(buffer.readUInt32BE(16), 512, file);
    assert.equal(buffer.readUInt32BE(20), 768, file);
    assert.equal(buffer[24], 8, `${file} must remain 8-bit`);
    assert.equal(buffer[25], 6, `${file} must remain RGBA`);

    const { height, pixels, rowLength, width } = decodeRgbaRows(buffer);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * rowLength) + (x * 4) + 3] === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.equal(maxX - minX + 1, expectedVisibleWidth, `${file} visible width`);
    assert.deepEqual([minY, maxY], [32, 735], `${file} transparent vertical margin`);
    assert.deepEqual(
      [
        pixels[3],
        pixels[((width - 1) * 4) + 3],
        pixels[((height - 1) * rowLength) + 3],
        pixels[((height - 1) * rowLength) + ((width - 1) * 4) + 3],
      ],
      [0, 0, 0, 0],
      `${file} corner alpha`,
    );
  }));
});

test("shared registry connects V3 to categories, gameplay geometry, and persistence", async () => {
  const appSource = await readFile(new URL("src/App.jsx", projectRoot), "utf8");
  assert.match(appSource, /\.\.\.FRETIVA_CREATIVE_INSTRUMENT_PACK_V3\.map\(\(skin\) => \[/);
  assert.match(appSource, /\.\.\.FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_IDS,/);
  assert.match(appSource, /Object\.fromEntries\(FRETIVA_CREATIVE_INSTRUMENT_PACK_V3\.map\(\(skin\) => \[skin\.id, skin\.category\]\)\)/);
  assert.match(appSource, /collisionAspectRatio: skin\.collisionAspectRatio/);
  assert.match(appSource, /window\.localStorage\.setItem\(SHOOTER_GUITAR_STORAGE_KEY, variantId\)/);
  assert.match(appSource, /GUITAR_LAB_VARIANT_IDS\.has\(stored\) \? stored/);
});

test("picker and gameplay preserve the V3 transparent canvas with contain rendering", async () => {
  const styleSource = await readFile(new URL("src/style.css", projectRoot), "utf8");
  assert.match(styleSource, /img\[data-instrument-skin-pack="fretiva_creative_instrument_pack_v3"\][\s\S]*?object-fit: contain;[\s\S]*?background: transparent;/);
  assert.match(styleSource, /shooterGuitarPickerAsset\[data-instrument-skin-pack="fretiva_creative_instrument_pack_v3"\][\s\S]*?object-fit: contain !important;/);
  assert.match(styleSource, /guitarPlayer\[data-instrument-skin-pack="fretiva_creative_instrument_pack_v3"\][\s\S]*?guitarPlayerAsset\.guitarAssetImage[\s\S]*?object-fit: contain !important;/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva_creative_instrument_pack_v3"[^}]*object-fit:\s*cover/);
});

test("TIDEWOOD PARLOR artwork is optically centered without changing its PNG", async () => {
  const styleSource = await readFile(new URL("src/style.css", projectRoot), "utf8");

  assert.match(
    styleSource,
    /guitarPlayer--acoustic_tidewood_parlor[\s\S]*?guitarAssetImage--acoustic_tidewood_parlor[\s\S]*?left: calc\(50% \+ 7px\) !important;/,
  );
  assert.match(
    styleSource,
    /shooterGuitarPickerAsset\.guitarAssetImage--acoustic_tidewood_parlor[\s\S]*?left: 4px;/,
  );
});
