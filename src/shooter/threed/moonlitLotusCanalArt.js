export const MOONLIT_LOTUS_CANAL_REFERENCE = Object.freeze({
  chunkWidth: 920,
  height: 620,
  waterline: 392,
});

export const MOONLIT_LOTUS_CANAL_SCENES = Object.freeze({
  festival: "Chunk F · Lantern Flower Festival",
  lotusGarden: "Chunk A · Moonlit Lotus Garden",
  mistBridge: "Chunk E · Stone Bridge Mist Forest",
  pavilion: "Chunk B · Willow Lantern Pavilion",
  waterWheel: "Chunk C · Waterwheel Canal",
  waterfall: "Chunk D · Rock Ravine Waterfall",
});

const RIVER_GARDEN_V1_ASSET_ROOT = "/assets/maps/three-d-lab/river-garden-v1";
const RIVER_GARDEN_V2_ASSET_ROOT = "/assets/maps/three-d-lab/river-garden-v2";

export const MOONLIT_LOTUS_CANAL_ASSETS = Object.freeze({
  environmentBridge: `${RIVER_GARDEN_V1_ASSET_ROOT}/environment_room_bridge_rgba.png`,
  environmentClose: `${RIVER_GARDEN_V2_ASSET_ROOT}/environment_room_close_rgba.png`,
  environmentGarden: `${RIVER_GARDEN_V1_ASSET_ROOT}/environment_room_garden_rgba.png`,
  foregroundRiverbank: `${RIVER_GARDEN_V2_ASSET_ROOT}/foreground_riverbank_rgba.png`,
  lanternGlow: `${RIVER_GARDEN_V1_ASSET_ROOT}/lantern_glow_rgba.png`,
  lanternGlowMask: `${RIVER_GARDEN_V1_ASSET_ROOT}/lantern_glow_mask.png`,
  panoramaSky: `${RIVER_GARDEN_V1_ASSET_ROOT}/panorama_sky_01_rgb.png`,
  waterfallSheet: `${RIVER_GARDEN_V1_ASSET_ROOT}/waterfall_8f_rgba.png`,
  waterFloor: `${RIVER_GARDEN_V2_ASSET_ROOT}/water_floor_river_rgb.png`,
  waterwheelRotor: `${RIVER_GARDEN_V1_ASSET_ROOT}/waterwheel_rotor_rgba.png`,
  waterwheelSheet: `${RIVER_GARDEN_V1_ASSET_ROOT}/waterwheel_12f_rgba.png`,
});

const TAU = Math.PI * 2;
const FOREGROUND_RIVERBANK_SOURCE_TOP = 465;
const FOREGROUND_RIVERBANK_HEIGHT = 98;
const ROOM_SEQUENCE = Object.freeze(["garden", "close", "garden", "garden", "bridge", "close"]);
const ROOM_METADATA = Object.freeze({
  bridge: Object.freeze({ contentBottom: 725, destinationHeight: 418 }),
  close: Object.freeze({ contentBottom: 807, destinationHeight: 440 }),
  garden: Object.freeze({ contentBottom: 807, destinationHeight: 424 }),
});
const FOREGROUND_CLUSTER_SOURCES = Object.freeze({
  left: Object.freeze({ sourceWidth: 760, sourceX: 0 }),
  right: Object.freeze({ sourceWidth: 657, sourceX: 1250 }),
});
const FOREGROUND_CLUSTER_LAYOUTS = Object.freeze([
  Object.freeze([Object.freeze({ kind: "left", width: 360, x: -42 }), Object.freeze({ kind: "right", width: 252, x: 650 })]),
  Object.freeze([Object.freeze({ kind: "right", width: 292, x: 92 }), Object.freeze({ kind: "left", width: 278, x: 684 })]),
  Object.freeze([Object.freeze({ kind: "left", width: 354, x: 386 })]),
  Object.freeze([Object.freeze({ kind: "right", width: 266, x: -18 }), Object.freeze({ kind: "left", width: 334, x: 542 })]),
  Object.freeze([Object.freeze({ kind: "left", width: 332, x: 168 }), Object.freeze({ kind: "right", width: 248, x: 718 })]),
  Object.freeze([Object.freeze({ kind: "right", width: 302, x: 48 }), Object.freeze({ kind: "left", width: 342, x: 608 })]),
]);
const WATERFALL_FRAME = Object.freeze({ count: 8, height: 682, visibleBottom: 529, width: 256 });
const WATERWHEEL_FRAME = Object.freeze({ count: 12, height: 256, width: 256 });

export const MOONLIT_LOTUS_CANAL_FLOW_RATES = Object.freeze({
  baseWater: 132,
  debris: 230,
  foam: 215,
  foreground: 274,
  highlight: 196,
  midground: 86,
  panorama: 7.5,
});

function createCanvas(
  width = MOONLIT_LOTUS_CANAL_REFERENCE.chunkWidth,
  height = MOONLIT_LOTUS_CANAL_REFERENCE.height,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`River Garden production asset failed to load: ${src}`));
    image.src = src;
  });
}

function createChromaCleanCutout(image) {
  const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const alpha = pixels.data[index + 3];
    const chromaDistance = Math.min(red, blue) - green;
    if (alpha > 0 && red > 180 && blue > 180 && green < 80 && chromaDistance > 125) {
      pixels.data[index + 3] = 0;
    }
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function createLanternEmissionSprite(mask, glow) {
  const canvas = createCanvas(256, 256);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const maskCanvas = createCanvas(256, 256);
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(glow, 0, 0, 256, 256);
  maskContext.drawImage(mask, 0, 0, 256, 256);
  const glowPixels = context.getImageData(0, 0, 256, 256);
  const maskPixels = maskContext.getImageData(0, 0, 256, 256).data;
  for (let index = 0; index < glowPixels.data.length; index += 4) {
    const maskStrength = maskPixels[index] / 255;
    glowPixels.data[index + 3] = Math.round(glowPixels.data[index + 3] * maskStrength);
  }
  context.clearRect(0, 0, 256, 256);
  context.putImageData(glowPixels, 0, 0);
  return canvas;
}

function createSeamlessWaterLoop(image) {
  const canvas = createCanvas(1024, 512);
  const context = canvas.getContext("2d");
  const sourceX = Math.round(image.naturalWidth * 0.14);
  const sourceWidth = Math.round(image.naturalWidth * 0.72);
  const sourceHalf = Math.floor(sourceWidth / 2);
  const destinationHalf = canvas.width / 2;
  context.drawImage(image, sourceX + sourceHalf, 0, sourceWidth - sourceHalf, image.naturalHeight, 0, 0, destinationHalf, canvas.height);
  context.drawImage(image, sourceX, 0, sourceHalf, image.naturalHeight, destinationHalf, 0, destinationHalf, canvas.height);

  const centerBlend = createCanvas(canvas.width, canvas.height);
  const blendContext = centerBlend.getContext("2d");
  blendContext.drawImage(image, sourceX, 0, sourceWidth, image.naturalHeight, 0, 0, canvas.width, canvas.height);
  blendContext.globalCompositeOperation = "destination-in";
  const blendMask = blendContext.createLinearGradient(0, 0, canvas.width, 0);
  blendMask.addColorStop(0, "rgba(0,0,0,0)");
  blendMask.addColorStop(0.34, "rgba(0,0,0,0)");
  blendMask.addColorStop(0.46, "rgba(0,0,0,1)");
  blendMask.addColorStop(0.54, "rgba(0,0,0,1)");
  blendMask.addColorStop(0.66, "rgba(0,0,0,0)");
  blendMask.addColorStop(1, "rgba(0,0,0,0)");
  blendContext.fillStyle = blendMask;
  blendContext.fillRect(0, 0, centerBlend.width, centerBlend.height);
  context.drawImage(centerBlend, 0, 0);

  const wrappedStrip = createCanvas(canvas.width * 3, canvas.height);
  const stripContext = wrappedStrip.getContext("2d");
  stripContext.drawImage(canvas, 0, 0);
  stripContext.drawImage(canvas, canvas.width, 0);
  stripContext.drawImage(canvas, canvas.width * 2, 0);
  const softenedStrip = createCanvas(wrappedStrip.width, wrappedStrip.height);
  const softenedContext = softenedStrip.getContext("2d");
  softenedContext.filter = "blur(10px)";
  softenedContext.drawImage(wrappedStrip, 0, 0);
  const seamless = createCanvas(canvas.width, canvas.height);
  seamless.getContext("2d").drawImage(
    softenedStrip,
    canvas.width,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return seamless;
}

function createWaterFloorPlate(image) {
  const canvas = createCanvas(1024, 512);
  const context = canvas.getContext("2d");
  context.filter = "blur(18px)";
  context.drawImage(image, -36, -36, canvas.width + 72, canvas.height + 72);
  return canvas;
}

function createForegroundClusterSprite(image, source, width, height, flipped) {
  const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
  const context = canvas.getContext("2d");
  const sourceHeight = image.height - FOREGROUND_RIVERBANK_SOURCE_TOP;
  context.save();
  if (flipped) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(
    image,
    source.sourceX,
    FOREGROUND_RIVERBANK_SOURCE_TOP,
    source.sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.restore();
  context.globalCompositeOperation = "destination-in";
  const edgeFeather = context.createLinearGradient(0, 0, canvas.width, 0);
  edgeFeather.addColorStop(0, "rgba(0,0,0,0)");
  edgeFeather.addColorStop(0.18, "rgba(0,0,0,1)");
  edgeFeather.addColorStop(0.82, "rgba(0,0,0,1)");
  edgeFeather.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = edgeFeather;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const waterBlend = context.createLinearGradient(0, 0, 0, canvas.height);
  waterBlend.addColorStop(0, "rgba(0,0,0,0)");
  waterBlend.addColorStop(0.2, "rgba(0,0,0,.16)");
  waterBlend.addColorStop(0.54, "rgba(0,0,0,1)");
  waterBlend.addColorStop(1, "rgba(0,0,0,1)");
  context.fillStyle = waterBlend;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

async function loadMoonlitLotusCanalAssets() {
  const [
    panoramaSky,
    environmentGardenSource,
    environmentBridgeSource,
    environmentCloseSource,
    waterFloor,
    foregroundRiverbankSource,
    waterwheelRotor,
    waterwheelSheet,
    waterfallSheet,
    lanternGlowMask,
    lanternGlow,
  ] = await Promise.all([
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.panoramaSky),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.environmentGarden),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.environmentBridge),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.environmentClose),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.waterFloor),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.foregroundRiverbank),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.waterwheelRotor),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.waterwheelSheet),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.waterfallSheet),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.lanternGlowMask),
    loadImage(MOONLIT_LOTUS_CANAL_ASSETS.lanternGlow),
  ]);
  return Object.freeze({
    environmentBridge: createChromaCleanCutout(environmentBridgeSource),
    environmentClose: createChromaCleanCutout(environmentCloseSource),
    environmentGarden: createChromaCleanCutout(environmentGardenSource),
    foregroundRiverbank: createChromaCleanCutout(foregroundRiverbankSource),
    lanternEmission: createLanternEmissionSprite(lanternGlowMask, lanternGlow),
    panoramaSky,
    waterfallSheet,
    waterFloor,
    waterLoop: createSeamlessWaterLoop(waterFloor),
    waterPlate: createWaterFloorPlate(waterFloor),
    waterwheelRotor,
    waterwheelSheet,
  });
}

function drawEnvironmentRoom(ctx, image, roomKey, index) {
  const { chunkWidth, waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const metadata = ROOM_METADATA[roomKey];
  const destinationHeight = metadata.destinationHeight;
  const destinationWidth = chunkWidth + 18;
  const scaleY = destinationHeight / image.height;
  const y = waterline - metadata.contentBottom * scaleY;
  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.filter = index % 3 === 2
    ? "brightness(.88) saturate(.9) contrast(1.06)"
    : "brightness(.95) saturate(.96) contrast(1.03)";
  if ([2, 5].includes(index)) {
    ctx.translate(destinationWidth - 9, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, y, destinationWidth, destinationHeight);
  } else {
    ctx.drawImage(image, -9, y, destinationWidth, destinationHeight);
  }
  ctx.restore();

  const shorelineShade = ctx.createLinearGradient(0, waterline - 16, 0, waterline + 5);
  shorelineShade.addColorStop(0, "rgba(3,18,31,0)");
  shorelineShade.addColorStop(0.72, "rgba(3,24,37,.2)");
  shorelineShade.addColorStop(1, "rgba(1,15,28,.42)");
  ctx.fillStyle = shorelineShade;
  ctx.fillRect(0, waterline - 16, chunkWidth, 21);
}

function drawForegroundRiverbank(ctx, image, index) {
  const { height } = MOONLIT_LOTUS_CANAL_REFERENCE;
  FOREGROUND_CLUSTER_LAYOUTS[index % FOREGROUND_CLUSTER_LAYOUTS.length].forEach((cluster, clusterIndex) => {
    const source = FOREGROUND_CLUSTER_SOURCES[cluster.kind];
    const destinationHeight = FOREGROUND_RIVERBANK_HEIGHT - (index + clusterIndex) % 3 * 7;
    const flipped = (index + clusterIndex) % 3 === 1;
    const sprite = createForegroundClusterSprite(image, source, cluster.width, destinationHeight, flipped);
    ctx.save();
    ctx.globalAlpha = 0.88 + (index + clusterIndex) % 2 * 0.06;
    ctx.filter = "brightness(.82) saturate(.92) contrast(1.06)";
    ctx.drawImage(sprite, cluster.x, height - destinationHeight);
    ctx.restore();
  });
}

function drawMidgroundLayer(ctx, assets, variant, index, roomKey) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const image = roomKey === "close"
    ? assets.environmentClose
    : roomKey === "bridge" ? assets.environmentBridge : assets.environmentGarden;
  drawEnvironmentRoom(ctx, image, roomKey, index);
  if (variant.landmark === "mistBridge") {
    const haze = ctx.createLinearGradient(0, 272, 0, 410);
    haze.addColorStop(0, "rgba(184,221,232,0)");
    haze.addColorStop(0.55, "rgba(184,221,232,.1)");
    haze.addColorStop(1, "rgba(184,221,232,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 272, ctx.canvas.width, 138);
  }
  ctx.globalCompositeOperation = "destination-in";
  const roomBlend = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  roomBlend.addColorStop(0, "rgba(0,0,0,0)");
  roomBlend.addColorStop(0.12, "rgba(0,0,0,1)");
  roomBlend.addColorStop(0.88, "rgba(0,0,0,1)");
  roomBlend.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = roomBlend;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = "source-over";
}

function drawForegroundLayer(ctx, assets, index) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawForegroundRiverbank(ctx, assets.foregroundRiverbank, index);
}

export async function createMoonlitLotusCanalChunks(variants) {
  const assets = await loadMoonlitLotusCanalAssets();
  const chunks = variants.map((variant, index) => {
    const roomKey = ROOM_SEQUENCE[index % ROOM_SEQUENCE.length];
    const midground = createCanvas();
    const foreground = createCanvas();
    drawMidgroundLayer(midground.getContext("2d"), assets, variant, index, roomKey);
    drawForegroundLayer(foreground.getContext("2d"), assets, index);
    return Object.freeze({ foreground, index, midground, roomKey, variant });
  });
  return Object.freeze({ assets, chunks: Object.freeze(chunks) });
}

function visibleChunks(chunks, viewWidth, offset, callback) {
  const chunkWidth = MOONLIT_LOTUS_CANAL_REFERENCE.chunkWidth;
  const span = chunks.length * chunkWidth;
  const wrapped = ((offset % span) + span) % span;
  const start = -wrapped - chunkWidth * 0.08;
  for (let cycle = -1; cycle <= 1; cycle += 1) {
    const cycleX = start + cycle * span;
    for (let index = 0; index < chunks.length; index += 1) {
      const x = cycleX + index * chunkWidth;
      if (x > viewWidth + chunkWidth || x < -chunkWidth) continue;
      callback(chunks[index], x, chunkWidth);
    }
  }
}

function drawTiledPanorama(ctx, image, viewWidth, flowDistance) {
  const { height } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const destinationWidth = Math.max(viewWidth * 1.18, height * imageAspect);
  const destinationHeight = destinationWidth / imageAspect;
  const horizontalOverdraw = destinationWidth - viewWidth;
  const slowPhase = flowDistance * 7.5 / Math.max(900, destinationWidth);
  const destinationX = -horizontalOverdraw * 0.5 + Math.sin(slowPhase) * horizontalOverdraw * 0.34;
  const destinationY = (height - destinationHeight) * 0.52 - 18;
  ctx.drawImage(image, destinationX, destinationY, destinationWidth, destinationHeight);
  const depthTint = ctx.createLinearGradient(0, 0, 0, height);
  depthTint.addColorStop(0, "rgba(0,6,23,.08)");
  depthTint.addColorStop(0.52, "rgba(1,18,43,.02)");
  depthTint.addColorStop(1, "rgba(0,13,30,.31)");
  ctx.fillStyle = depthTint;
  ctx.fillRect(0, 0, viewWidth, height);
}

function drawCachedLayer(ctx, chunks, viewWidth, offset, layer) {
  visibleChunks(chunks, viewWidth, offset, (chunk, x, width) => {
    const overlap = layer === "midground" ? 76 : 2;
    const drawX = Math.floor(x) - overlap;
    ctx.drawImage(chunk[layer], drawX, 0, Math.ceil(width) + overlap * 2, MOONLIT_LOTUS_CANAL_REFERENCE.height);
  });
}

function drawWheelSupport(ctx, centerX, centerY) {
  ctx.save();
  ctx.lineCap = "round";
  [[22, "rgba(7,9,15,.72)"], [14, "#34251f"], [4, "rgba(155,105,66,.42)"]].forEach(([width, color]) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX - 62, centerY + 88);
    ctx.lineTo(centerX - 31, centerY + 24);
    ctx.lineTo(centerX + 33, centerY + 24);
    ctx.lineTo(centerX + 68, centerY + 88);
    ctx.stroke();
  });
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#281d1a";
  ctx.beginPath();
  ctx.moveTo(centerX - 86, centerY + 2);
  ctx.lineTo(centerX + 86, centerY + 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(172,118,75,.38)";
  ctx.stroke();
  ctx.restore();
}

function drawWaterwheel(ctx, assets, x, time) {
  const { waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const centerX = x + 664;
  const centerY = waterline - 32;
  const diameter = 166;
  drawWheelSupport(ctx, centerX, centerY);
  const sheet = assets.waterwheelSheet;
  const frameIndex = Math.floor(time * 5.4) % WATERWHEEL_FRAME.count;
  if (sheet?.naturalWidth >= WATERWHEEL_FRAME.width * WATERWHEEL_FRAME.count) {
    ctx.drawImage(
      sheet,
      frameIndex * WATERWHEEL_FRAME.width,
      0,
      WATERWHEEL_FRAME.width,
      WATERWHEEL_FRAME.height,
      centerX - diameter / 2,
      centerY - diameter / 2,
      diameter,
      diameter,
    );
  } else {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 0.45);
    ctx.drawImage(assets.waterwheelRotor, -diameter / 2, -diameter / 2, diameter, diameter);
    ctx.restore();
  }
  const axle = ctx.createRadialGradient(centerX - 4, centerY - 5, 1, centerX, centerY, 16);
  axle.addColorStop(0, "#d1b17d");
  axle.addColorStop(0.32, "#6d5445");
  axle.addColorStop(1, "#191720");
  ctx.fillStyle = axle;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 14, 0, TAU);
  ctx.fill();
}

function drawWaterfall(ctx, assets, x, time) {
  const { waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const frameIndex = Math.floor(time * 9) % WATERFALL_FRAME.count;
  const destinationWidth = 170;
  const scale = destinationWidth / WATERFALL_FRAME.width;
  const destinationHeight = WATERFALL_FRAME.height * scale;
  const destinationX = x + 688;
  const destinationY = waterline + 7 - WATERFALL_FRAME.visibleBottom * scale;
  ctx.drawImage(
    assets.waterfallSheet,
    frameIndex * WATERFALL_FRAME.width,
    0,
    WATERFALL_FRAME.width,
    WATERFALL_FRAME.height,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
  );
}

function drawAnimatedLandmarks(ctx, cache, viewWidth, offset, time) {
  visibleChunks(cache.chunks, viewWidth, offset, (chunk, x) => {
    if (chunk.variant.landmark === "waterWheel") drawWaterwheel(ctx, cache.assets, x, time);
    if (chunk.variant.landmark === "waterfall") drawWaterfall(ctx, cache.assets, x, time);
  });
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function drawWrappedWaterLoop(
  ctx,
  image,
  viewWidth,
  offset,
  destinationY,
  destinationHeight,
  cycleWidth,
  sourceY = 0,
  sourceHeight = image.height,
) {
  const wrappedOffset = positiveModulo(offset, cycleWidth);
  for (let x = -wrappedOffset - cycleWidth; x < viewWidth + cycleWidth; x += cycleWidth) {
    const drawX = Math.floor(x) - 1;
    ctx.drawImage(image, 0, sourceY, image.width, sourceHeight, drawX, destinationY, Math.ceil(cycleWidth) + 2, destinationHeight);
  }
}

function drawCrossfadedWaterBase(ctx, image, viewWidth, offset, destinationY, destinationHeight) {
  const travel = 1840;
  const crossfadeStart = 0.82;
  const phase = positiveModulo(offset, travel) / travel;
  const destinationWidth = viewWidth + travel;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (phase < crossfadeStart) {
    const travelProgress = phase / crossfadeStart;
    ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, -travelProgress * travel, destinationY, destinationWidth, destinationHeight);
    return;
  }
  const crossfade = (phase - crossfadeStart) / (1 - crossfadeStart);
  ctx.save();
  ctx.globalAlpha = 1 - crossfade;
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, -travel, destinationY, destinationWidth, destinationHeight);
  ctx.globalAlpha = crossfade;
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, destinationY, destinationWidth, destinationHeight);
  ctx.restore();
}

function drawFloatingDebris(ctx, viewWidth, flowDistance, time) {
  const { waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const span = viewWidth + 310;
  for (let index = 0; index < 9; index += 1) {
    const x = positiveModulo(index * 263 + 120 - flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.debris, span) - 155;
    const y = waterline + 35 + index % 4 * 43;
    const size = 6.8 + index % 3 * 1.9;
    const flutter = Math.sin(time * 0.72 + index * 1.37) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(index * 0.73 + flutter);
    ctx.scale(1, 0.48);
    const pad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
    pad.addColorStop(0, index % 3 === 0 ? "rgba(108,155,112,.64)" : "rgba(75,128,96,.56)");
    pad.addColorStop(1, "rgba(19,73,65,.38)");
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.42, size, 0, 0.16, TAU - 0.16);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(138,222,231,.72)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 2, size * 2.2, size * 0.62, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWaterFloor(ctx, assets, viewWidth, time, flowDistance) {
  const { height, waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const waterHeight = height - waterline;
  const baseWaterOffset = flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.baseWater;
  drawCrossfadedWaterBase(ctx, assets.waterPlate, viewWidth, baseWaterOffset, waterline, waterHeight);

  const readabilityTint = ctx.createLinearGradient(0, waterline, 0, height);
  readabilityTint.addColorStop(0, "rgba(0,20,46,.08)");
  readabilityTint.addColorStop(0.62, "rgba(0,15,39,.15)");
  readabilityTint.addColorStop(1, "rgba(0,8,25,.3)");
  ctx.fillStyle = readabilityTint;
  ctx.fillRect(0, waterline, viewWidth, waterHeight);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterline, viewWidth, waterHeight);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  for (let band = 0; band < 7; band += 1) {
    const sourceY = 28 + band * 67;
    const sourceHeight = 30 + band % 3 * 7;
    const bandY = waterline + 15 + band * 30;
    const bandHeight = 5 + band % 2 * 2;
    const cycleWidth = 1320 + band * 74;
    const bandOffset = flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.highlight * (0.94 + band % 3 * 0.035) + band * 89;
    ctx.globalAlpha = 0.045 + band % 3 * 0.014;
    drawWrappedWaterLoop(ctx, assets.waterLoop, viewWidth, bandOffset, bandY, bandHeight, cycleWidth, sourceY, sourceHeight);
  }

  ctx.globalAlpha = 1;
  const foamFlow = flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.foam;
  for (let row = 0; row < 14; row += 1) {
    const baseY = waterline + 9 + row * 14.6;
    const spacing = 226 + row % 4 * 42;
    const segment = 38 + row % 5 * 15;
    const shift = positiveModulo(foamFlow * (0.91 + row % 4 * 0.035) + row * 83, spacing);
    const brightFoam = row % 5 === 0;
    ctx.strokeStyle = `rgba(${brightFoam ? "218,247,251" : "137,221,241"},${brightFoam ? 0.14 : 0.055 + row % 4 * 0.014})`;
    ctx.lineWidth = brightFoam ? 1.7 : 0.9;
    for (let x = -spacing; x < viewWidth + spacing; x += spacing) {
      const horizontalDrift = Math.cos(time * 0.56 + row * 0.71 + x * 0.009) * 1.4;
      const startX = x - shift + horizontalDrift;
      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.bezierCurveTo(
        startX + segment * 0.28,
        baseY - 0.7,
        startX + segment * 0.72,
        baseY + 0.7,
        startX + segment,
        baseY,
      );
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = "source-over";
  drawFloatingDebris(ctx, viewWidth, flowDistance, time);
  ctx.globalCompositeOperation = "screen";

  const reflectionX = viewWidth * 0.63;
  for (let streak = 0; streak < 14; streak += 1) {
    const y = waterline + 8 + streak * 14.2;
    const width = 28 + streak * 6.8;
    const shimmer = Math.sin(time * 0.86 + streak * 1.9) * (2 + streak * 0.24);
    const reflection = ctx.createLinearGradient(reflectionX - width, 0, reflectionX + width, 0);
    reflection.addColorStop(0, "rgba(222,244,255,0)");
    reflection.addColorStop(0.5, `rgba(230,248,255,${0.15 - streak * 0.007})`);
    reflection.addColorStop(1, "rgba(222,244,255,0)");
    ctx.strokeStyle = reflection;
    ctx.lineWidth = streak % 3 === 0 ? 2.5 : 1.1;
    ctx.beginPath();
    ctx.moveTo(reflectionX - width + shimmer, y);
    ctx.lineTo(reflectionX + width + shimmer, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLandmarkWaterContact(ctx, cache, viewWidth, offset, time) {
  const { waterline } = MOONLIT_LOTUS_CANAL_REFERENCE;
  visibleChunks(cache.chunks, viewWidth, offset, (chunk, x) => {
    let centerX = null;
    let width = 0;
    if (chunk.variant.landmark === "waterWheel") {
      centerX = x + 664;
      width = 104;
    } else if (chunk.variant.landmark === "waterfall") {
      centerX = x + 772;
      width = 78;
    }
    if (centerX === null) return;
    const pulse = 1 + Math.sin(time * 4.4 + chunk.index) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const foam = ctx.createRadialGradient(centerX, waterline + 4, 0, centerX, waterline + 4, width);
    foam.addColorStop(0, "rgba(191,239,251,.28)");
    foam.addColorStop(0.48, "rgba(103,204,232,.12)");
    foam.addColorStop(1, "rgba(76,184,222,0)");
    ctx.fillStyle = foam;
    ctx.beginPath();
    ctx.ellipse(centerX, waterline + 5, width * pulse, 13 * pulse, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(177,235,247,.24)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(centerX, waterline + 7, width * 0.75 * pulse, 8 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  });
}

const CLOSE_ENVIRONMENT_GLOW_POINTS = Object.freeze([
  Object.freeze([56, 315]),
  Object.freeze([326, 317]),
  Object.freeze([472, 272]),
  Object.freeze([616, 174]),
  Object.freeze([719, 174]),
  Object.freeze([818, 184]),
  Object.freeze([771, 296]),
]);
const ROOM_GLOW_POINTS = Object.freeze({
  bridge: Object.freeze([[165, 292], [748, 306]]),
  close: CLOSE_ENVIRONMENT_GLOW_POINTS,
  garden: Object.freeze([[188, 318], [365, 286], [520, 338], [742, 320]]),
});

function drawLanternGlows(ctx, cache, viewWidth, offset, time) {
  visibleChunks(cache.chunks, viewWidth, offset, (chunk, x) => {
    const start = chunk.index % 3;
    const glowPoints = ROOM_GLOW_POINTS[chunk.roomKey];
    const visiblePoints = chunk.roomKey === "close" ? glowPoints.slice(start, start + 4) : glowPoints;
    visiblePoints.forEach(([localX, y], pointIndex) => {
      const phase = time * 1.7 + chunk.index * 0.83 + pointIndex * 1.27;
      const alpha = 0.32 + Math.sin(phase) * 0.07;
      const size = 42 + pointIndex % 2 * 7;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(cache.assets.lanternEmission, x + localX - size / 2, y - size / 2, size, size);
      ctx.restore();
    });
  });
}

function drawMist(ctx, viewWidth, time) {
  const shift = ((time * 8) % 360) - 180;
  const mist = ctx.createLinearGradient(0, 338, 0, 454);
  mist.addColorStop(0, "rgba(187,222,231,0)");
  mist.addColorStop(0.54, "rgba(187,222,231,.05)");
  mist.addColorStop(1, "rgba(187,222,231,0)");
  ctx.fillStyle = mist;
  for (let cloud = -1; cloud < 6; cloud += 1) {
    ctx.beginPath();
    ctx.ellipse(cloud * 330 - shift, 405 + Math.sin(cloud * 1.7) * 8, 228, 31, 0, 0, TAU);
    ctx.fill();
  }
}

function drawVignette(ctx, viewWidth) {
  const { height } = MOONLIT_LOTUS_CANAL_REFERENCE;
  const vignette = ctx.createRadialGradient(
    viewWidth * 0.5,
    height * 0.48,
    height * 0.26,
    viewWidth * 0.5,
    height * 0.48,
    viewWidth * 0.7,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.8, "rgba(0,5,14,.035)");
  vignette.addColorStop(1, "rgba(0,3,11,.29)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewWidth, height);
}

export function renderMoonlitLotusCanalFrame(ctx, cache, options) {
  const { flowDistance, time, viewHeight, viewWidth } = options;
  const reference = MOONLIT_LOTUS_CANAL_REFERENCE;
  const scale = viewHeight / reference.height;
  const referenceWidth = viewWidth / scale;
  const midgroundOffset = flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.midground;
  const foregroundOffset = flowDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.foreground;
  ctx.save();
  ctx.scale(scale, scale);
  drawTiledPanorama(ctx, cache.assets.panoramaSky, referenceWidth, flowDistance);
  drawCachedLayer(ctx, cache.chunks, referenceWidth, midgroundOffset, "midground");
  drawAnimatedLandmarks(ctx, cache, referenceWidth, midgroundOffset, time);
  // Water is painted after landmarks so submerged supports disappear below the river line.
  drawWaterFloor(ctx, cache.assets, referenceWidth, time, flowDistance);
  drawLandmarkWaterContact(ctx, cache, referenceWidth, midgroundOffset, time);
  drawLanternGlows(ctx, cache, referenceWidth, midgroundOffset, time);
  drawMist(ctx, referenceWidth, time);
  drawCachedLayer(ctx, cache.chunks, referenceWidth, foregroundOffset, "foreground");
  drawVignette(ctx, referenceWidth);
  ctx.restore();
}
