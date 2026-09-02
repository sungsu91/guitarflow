import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2,
  FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_ID,
  FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_IDS,
} from "../src/shooter/instruments/fretivaArtisanInstrumentSkinPackV2.js";

const projectRoot = new URL("../", import.meta.url);
const assetRoot = new URL(
  "../public/assets/shooter/instruments/fretiva_artisan_instrument_skin_pack_v2/",
  import.meta.url,
);

const EXPECTED = [
  ["acoustic_willow_crest_v2", "WILLOW CREST", "acoustic/WILLOW CREST.png", "acoustic", 1, 6, 6, "3_left_3_right", 596, 4, 1524],
  ["acoustic_rosewater_v2", "ROSEWATER", "acoustic/ROSEWATER.png", "acoustic", 2, 6, 6, "3_left_3_right", 589, 9, 1515],
  ["acoustic_blue_heron_v2", "BLUE HERON", "acoustic/BLUE HERON.png", "acoustic", 3, 6, 6, "3_left_3_right", 624, 3, 1532],
  ["acoustic_sunlace_v2", "SUNLACE", "acoustic/SUNLACE.png", "acoustic", 4, 6, 6, "3_left_3_right", 617, 12, 1507],
  ["acoustic_ivory_tide_v2", "IVORY TIDE", "acoustic/IVORY TIDE.png", "acoustic", 5, 6, 6, "3_left_3_right", 603, 10, 1512],
  ["electric_night_orchid_v2", "NIGHT ORCHID", "electric/NIGHT ORCHID.png", "electric", 1, 6, 6, "3_left_3_right", 523, 13, 1502],
  ["electric_copper_swan_v2", "COPPER SWAN", "electric/COPPER SWAN.png", "electric", 2, 6, 6, "3_left_3_right", 523, 9, 1505],
  ["electric_verdant_signal_v2", "VERDANT SIGNAL", "electric/VERDANT SIGNAL.png", "electric", 3, 6, 6, "3_left_3_right", 522, 15, 1510],
  ["electric_cherry_static_v2", "CHERRY STATIC", "electric/CHERRY STATIC.png", "electric", 4, 6, 6, "3_left_3_right", 534, 4, 1516],
  ["electric_silver_comet_v2", "SILVER COMET", "electric/SILVER COMET.png", "electric", 5, 6, 6, "3_left_3_right", 508, 10, 1508],
  ["bass_deep_lotus_v2", "DEEP LOTUS", "bass/DEEP LOTUS.png", "bass", 1, 4, 4, "2_left_2_right", 505, 11, 1504],
  ["bass_amber_current_v2", "AMBER CURRENT", "bass/AMBER CURRENT.png", "bass", 2, 4, 4, "2_left_2_right", 524, 10, 1515],
  ["bass_violet_fin_v2", "VIOLET FIN", "bass/VIOLET FIN.png", "bass", 3, 4, 4, "2_left_2_right", 492, 5, 1524],
  ["bass_pearl_circuit_v2", "PEARL CIRCUIT", "bass/PEARL CIRCUIT.png", "bass", 4, 4, 4, "2_left_2_right", 488, 9, 1512],
  ["bass_moss_echo_v2", "MOSS ECHO", "bass/MOSS ECHO.png", "bass", 5, 4, 4, "2_left_2_right", 512, 0, 1536],
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

test("artisan instrument V2 mirrors the final manifest identity and category order", () => {
  assert.equal(
    FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_ID,
    "fretiva_artisan_instrument_skin_pack_v2",
  );
  assert.deepEqual(
    FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2.map((skin) => [
      skin.id,
      skin.title,
      skin.file,
      skin.category,
      skin.sortOrder,
      skin.stringCount,
      skin.tunerCount,
      skin.tunerLayout,
      skin.visibleWidth,
      skin.visibleTop,
      skin.visibleHeight,
    ]),
    EXPECTED,
  );
  assert.deepEqual(FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_IDS, EXPECTED.map(([id]) => id));
  assert.equal(new Set(FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_IDS).size, 15);
  assert.deepEqual(
    Object.fromEntries(["acoustic", "electric", "bass"].map((category) => [
      category,
      FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2
        .filter((skin) => skin.category === category)
        .map((skin) => skin.title),
    ])),
    {
      acoustic: ["WILLOW CREST", "ROSEWATER", "BLUE HERON", "SUNLACE", "IVORY TIDE"],
      electric: ["NIGHT ORCHID", "COPPER SWAN", "VERDANT SIGNAL", "CHERRY STATIC", "SILVER COMET"],
      bass: ["DEEP LOTUS", "AMBER CURRENT", "VIOLET FIN", "PEARL CIRCUIT", "MOSS ECHO"],
    },
  );
});

test("the runtime contains exactly fifteen supplied 1024x1536 RGBA PNG files", async () => {
  const files = (await Promise.all(
    ["acoustic", "electric", "bass"].map(async (folder) => (
      (await readdir(new URL(`${folder}/`, assetRoot))).map((name) => `${folder}/${name}`)
    )),
  )).flat().sort();
  assert.deepEqual(files, EXPECTED.map(([, , file]) => file).sort());

  for (const [, , file, , , , , , expectedWidth, expectedTop, expectedHeight] of EXPECTED) {
    const buffer = await readFile(new URL(file, assetRoot));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(buffer.readUInt32BE(16), 1024, file);
    assert.equal(buffer.readUInt32BE(20), 1536, file);
    assert.equal(buffer[24], 8, `${file} must remain 8-bit`);
    assert.equal(buffer[25], 6, `${file} must remain RGBA`);

    const { height, pixels, rowLength, width } = decodeRgbaRows(buffer);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * rowLength) + (x * 4) + 3] < 32) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.equal(maxX - minX + 1, expectedWidth, `${file} visible width`);
    assert.equal(minY, expectedTop, `${file} visible top`);
    assert.equal(maxY - minY + 1, expectedHeight, `${file} visible height`);
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
  }
});

test("the shared guitar registry appends only Artisan V2 and preserves saved selection behavior", async () => {
  const appSource = await readFile(new URL("src/App.jsx", projectRoot), "utf8");
  assert.match(appSource, /\.\.\.FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2\.map\(\(skin\) => \[/);
  assert.match(appSource, /\.\.\.FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_IDS,/);
  assert.match(appSource, /Object\.fromEntries\(FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2\.map\(\(skin\) => \[skin\.id, skin\.category\]\)\)/);
  assert.match(appSource, /window\.localStorage\.setItem\(SHOOTER_GUITAR_STORAGE_KEY, variantId\)/);
  assert.match(appSource, /GUITAR_LAB_VARIANT_IDS\.has\(stored\) \? stored/);
  assert.doesNotMatch(appSource, /fretiva_fantasy_instrument_skin_pack_v1|FRETIVA_FANTASY_INSTRUMENT/i);
});

test("picker and gameplay keep the Artisan V2 canvas upright, transparent, and contained", async () => {
  const styleSource = await readFile(new URL("src/style.css", projectRoot), "utf8");
  assert.match(styleSource, /img\[data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"\][\s\S]*?object-fit: contain;[\s\S]*?background: transparent;/);
  assert.match(styleSource, /shooterGuitarPickerAsset\[data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"\][\s\S]*?object-fit: contain !important;/);
  assert.match(styleSource, /guitarPlayer\[data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"\][\s\S]*?guitarPlayerAsset\.guitarAssetImage[\s\S]*?object-fit: contain !important;/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"[^}]*object-fit:\s*cover/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"[^}]*rotate\(/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva_artisan_instrument_skin_pack_v2"[^}]*hue-rotate/);
});
