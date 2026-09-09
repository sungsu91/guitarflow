export const THREE_D_LAB_BILLBOARD_MODES = Object.freeze({
  HORIZONTAL_PLANE: "horizontal-plane",
  SCREEN_ALIGNED: "screen-aligned",
  Y_AXIS: "y-axis",
});

const CHUNK_VARIANTS = [
  { id: "chunk-a-moonlit-lotus-garden", landmark: "lotusGarden", accent: "rose", seed: 0.13 },
  { id: "chunk-b-willow-lantern-pavilion", landmark: "pavilion", accent: "amber", seed: 0.37 },
  { id: "chunk-c-waterwheel-canal", landmark: "waterWheel", accent: "copper", seed: 0.61 },
  { id: "chunk-d-rock-ravine-waterfall", landmark: "waterfall", accent: "silver", seed: 0.83 },
  { id: "chunk-e-stone-bridge-mist-forest", landmark: "mistBridge", accent: "mint", seed: 1.07 },
  { id: "chunk-f-lantern-flower-festival", landmark: "festival", accent: "gold", seed: 1.31 },
].map((variant) => Object.freeze(variant));

export const THREE_D_LAB_HORIZONTAL_LAYOUT = Object.freeze({
  id: "dev-three-d-lab-moonlit-lotus-canal",
  camera: Object.freeze({
    fov: 44,
    height: 6.7,
    horizonPosition: 0.34,
    pitch: -10,
    positionZ: 21,
  }),
  combat: Object.freeze({
    enemyHitX: -9.8,
    enemySpawnX: 14.5,
    guitarIdleX: -15.8,
    laneDepth: 5.6,
    targetHeight: 1.42,
  }),
  billboardRoles: Object.freeze({
    combatEntities: THREE_D_LAB_BILLBOARD_MODES.SCREEN_ALIGNED,
    standingProps: THREE_D_LAB_BILLBOARD_MODES.Y_AXIS,
    waterDecor: THREE_D_LAB_BILLBOARD_MODES.HORIZONTAL_PLANE,
  }),
  assetSlots: Object.freeze({
    effectTextures: null,
    farBackground: null,
    foregroundProps: null,
    midgroundProps: null,
    skyHorizon: null,
    waterTexture: null,
  }),
  layers: Object.freeze([
    Object.freeze({ id: "skyHorizon", depth: -20, renderOrder: 0, scrollRate: 0 }),
    Object.freeze({ id: "farBackground", depth: -15, renderOrder: 1, scrollRate: 0.1 }),
    Object.freeze({ id: "farShoreline", depth: -9, renderOrder: 2, scrollRate: 0.28 }),
    Object.freeze({ id: "midgroundProps", depth: -6, renderOrder: 3, scrollRate: 0.55 }),
    Object.freeze({ id: "waterMesh", depth: 0, renderOrder: 4, scrollRate: 0 }),
    Object.freeze({ id: "waterDecor", depth: 3, renderOrder: 5, scrollRate: 0.84 }),
    Object.freeze({ id: "combatEntities", depth: 1, renderOrder: 6, scrollRate: 0 }),
    Object.freeze({ id: "foregroundProps", depth: 8, renderOrder: 7, scrollRate: 1.2 }),
    Object.freeze({ id: "effects", depth: 9, renderOrder: 8, scrollRate: 0 }),
    Object.freeze({ id: "hud", depth: 10, renderOrder: 9, scrollRate: 0 }),
  ]),
  endless: Object.freeze({
    chunkCount: CHUNK_VARIANTS.length,
    chunkVariants: Object.freeze(CHUNK_VARIANTS),
    chunkWidth: 18,
    scrollSpeeds: Object.freeze({
      gameover: 0,
      idle: 0.16,
      listening: 0.24,
      paused: 0,
      playing: 1.25,
    }),
    speedEase: 2.35,
  }),
  water: Object.freeze({
    flowDirection: "right-to-left",
    segmentsX: 48,
    segmentsZ: 12,
    waves: Object.freeze([
      Object.freeze({ amplitude: 0.075, direction: Object.freeze([1, 0]), wavelength: 15, speed: 0.62 }),
      Object.freeze({ amplitude: 0.032, direction: Object.freeze([0.84, 0.3]), wavelength: 8.5, speed: 0.88 }),
      Object.freeze({ amplitude: 0.014, direction: Object.freeze([0.7, -0.5]), wavelength: 4.8, speed: 1.18 }),
    ]),
  }),
});

export function getThreeDLabHorizontalLayer(layerId) {
  return THREE_D_LAB_HORIZONTAL_LAYOUT.layers.find((layer) => layer.id === layerId) ?? null;
}
