import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const PICK_IDS = [
  "leather-black",
  "tortoise-shell",
  "walnut-wood",
  "pearl-ivory",
  "brushed-gold",
  "brushed-silver",
  "sapphire-gem",
  "amethyst-gem",
  "carbon-fiber",
  "neon-pink",
  "neon-cyan",
  "lava-rock",
  "ice-crystal",
  "leaf-green",
  "galaxy",
  "antique-bronze",
  "rose-gold",
  "black-obsidian",
  "prism-opal",
  "aqua-wave",
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CELL_SIZE = 280;
const ALPHA_THRESHOLD = 8;
const CONTENT_PADDING = 4;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectRoot, "assets-source", "shooter-picks-no-logo-source.png");
const outputDirectory = path.join(projectRoot, "public", "images");

function paethPredictor(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);

  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodeRgbaPng(buffer) {
  assert.ok(buffer.subarray(0, 8).equals(PNG_SIGNATURE), "source must be a PNG");

  let offset = 8;
  let width = 0;
  let height = 0;
  const imageDataChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "source must use 8-bit channels");
      assert.equal(data[9], 6, "source must be RGBA");
      assert.equal(data[12], 0, "interlaced PNGs are not supported");
    } else if (type === "IDAT") {
      imageDataChunks.push(data);
    }

    offset += length + 12;
  }

  const compressed = Buffer.concat(imageDataChunks);
  const filtered = inflateSync(compressed);
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    const previousRowOffset = rowOffset - stride;

    for (let x = 0; x < stride; x += 1) {
      const rawValue = filtered[inputOffset];
      inputOffset += 1;
      const left = x >= 4 ? pixels[rowOffset + x - 4] : 0;
      const above = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[previousRowOffset + x - 4] : 0;
      let predictor = 0;

      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
      else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);

      pixels[rowOffset + x] = (rawValue + predictor) & 255;
    }
  }

  return { height, pixels, stride, width };
}

function cropPick(source, cellX, cellY) {
  const sourceX = cellX * CELL_SIZE;
  const sourceY = cellY * CELL_SIZE;
  let minX = CELL_SIZE;
  let minY = CELL_SIZE;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < CELL_SIZE; y += 1) {
    for (let x = 0; x < CELL_SIZE; x += 1) {
      const alphaOffset = (sourceY + y) * source.stride + (sourceX + x) * 4 + 3;
      if (source.pixels[alphaOffset] <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  assert.ok(maxX >= minX && maxY >= minY, `empty pick cell ${cellX},${cellY}`);

  minX = Math.max(0, minX - CONTENT_PADDING);
  minY = Math.max(0, minY - CONTENT_PADDING);
  maxX = Math.min(CELL_SIZE - 1, maxX + CONTENT_PADDING);
  maxY = Math.min(CELL_SIZE - 1, maxY + CONTENT_PADDING);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (sourceY + minY + y) * source.stride + (sourceX + minX) * 4;
    const targetOffset = y * width * 4;
    source.pixels.copy(pixels, targetOffset, sourceOffset, sourceOffset + width * 4);
  }

  return { height, pixels, width };
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return chunk;
}

function encodeRgbaPng({ height, pixels, width }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const filteredOffset = y * (stride + 1);
    filtered[filteredOffset] = 0;
    pixels.copy(filtered, filteredOffset + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", header),
    createChunk("IDAT", deflateSync(filtered, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

const source = decodeRgbaPng(await readFile(sourcePath));
assert.equal(source.width, 1400);
assert.equal(source.height, 1120);

for (const [index, pickId] of PICK_IDS.entries()) {
  const cellX = index % 5;
  const cellY = Math.floor(index / 5);
  const pick = cropPick(source, cellX, cellY);
  const outputPath = path.join(outputDirectory, `shooter-pick-${pickId}.png`);
  await writeFile(outputPath, encodeRgbaPng(pick));
  console.log(`${pickId}: ${pick.width}x${pick.height}`);
}
