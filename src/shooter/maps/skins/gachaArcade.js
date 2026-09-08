import { GACHA_ARCADE_RESOLVED_SLOTS } from "./gachaArcadeLayout.js";

const GACHA_ARCADE_ROOT = "/assets/maps/gacha-arcade";
const GACHA_ARCADE_RUNTIME_BACKGROUND = `${GACHA_ARCADE_ROOT}/runtime/FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS_RUNTIME.png`;
const GACHA_ARCADE_MACHINE_LEFT = `${GACHA_ARCADE_ROOT}/runtime/machine_cabinet_left_runtime.png`;
const GACHA_ARCADE_MACHINE_RIGHT = `${GACHA_ARCADE_ROOT}/runtime/machine_cabinet_right_runtime.png`;
const GACHA_ARCADE_MACHINE_PLINTH = `${GACHA_ARCADE_ROOT}/runtime/machine_plinth_runtime.png`;
const GACHA_ARCADE_LAYOUT_PREVIEW = `${GACHA_ARCADE_ROOT}/preview/FRETIVA_GACHA_ARCADE_V3_LAYOUT_PREVIEW.png`;
const GACHA_ARCADE_CANVAS = Object.freeze({ width: 1536, height: 3328 });
const GACHA_ARCADE_RENDER_ORDER = Object.freeze([
  "empty_seven_bay_background",
  "far_to_near_machine_groups_plinth_cabinet_claw",
  "star_light_ring",
  "gameplay",
  "guitar",
  "HUD",
]);

const platformObjects = Object.freeze(GACHA_ARCADE_RESOLVED_SLOTS.map((slot, index) => Object.freeze({
  id: `platform_${slot.id}`,
  kind: "platform",
  zIndex: 10 + index * 3,
  src: GACHA_ARCADE_MACHINE_PLINTH,
  placement: slot.platform,
})));

const machineObjects = Object.freeze(GACHA_ARCADE_RESOLVED_SLOTS.map((slot, index) => Object.freeze({
  id: `machine_${slot.id}`,
  kind: "machine",
  side: slot.side,
  zIndex: 11 + index * 3,
  src: slot.side === "left" ? GACHA_ARCADE_MACHINE_RIGHT : GACHA_ARCADE_MACHINE_LEFT,
  placement: slot.machine,
})));

const CLAW_PHASE_OFFSETS = Object.freeze([0, 857, 1714, 2571, 3428, 4285, 5142]);

const clawSprites = GACHA_ARCADE_RESOLVED_SLOTS.map((slot, index) => {
  const machine = slot.machine;
  const isLeft = slot.side === "left";
  const sourceFrameWidth = isLeft ? 300 : 290;
  const sourceFrameHeight = isLeft ? 280 : 250;
  const height = Math.round(machine.height * 0.36);
  const width = Math.round(height * (sourceFrameWidth / sourceFrameHeight));
  const placement = Object.freeze({
    x: Math.round(machine.x + (machine.width - width) / 2),
    y: Math.round(machine.y + machine.height * 0.245),
    width,
    height,
  });
  return Object.freeze({
    id: `claw_${slot.id}`,
    machineId: `machine_${slot.id}`,
    src: isLeft
      ? `${GACHA_ARCADE_ROOT}/runtime/claw_left_mid_wire_sheet_6x4.png`
      : `${GACHA_ARCADE_ROOT}/runtime/claw_right_upper_wire_sheet_6x4.png`,
    columns: 6,
    rows: 4,
    frameCount: 24,
    framesPerSecond: 4,
    durationMs: 6000,
    delayMs: CLAW_PHASE_OFFSETS[index],
    phaseOffsetMs: CLAW_PHASE_OFFSETS[index],
    direction: isLeft ? "left-wall to right" : "right-wall to left",
    scaleChange: false,
    zIndex: 12 + index * 3,
    placement,
    clipRect: Object.freeze({ x: 0, y: 0, width, height }),
    glassClipPolygon: Object.freeze([
      Object.freeze({ x: 0, y: 0 }),
      Object.freeze({ x: width, y: 0 }),
      Object.freeze({ x: width, y: height }),
      Object.freeze({ x: 0, y: height }),
    ]),
  });
});

const sprites = Object.freeze([
  ...clawSprites,
  Object.freeze({
    id: "star_light_ring",
    src: `${GACHA_ARCADE_ROOT}/runtime/star_mobile_horizontal_sheet_6x4.png`,
    columns: 6,
    rows: 4,
    frameCount: 24,
    framesPerSecond: 8,
    durationMs: 3000,
    delayMs: 0,
    phaseOffsetMs: 1000,
    scaleChange: false,
    zIndex: 100,
    placement: Object.freeze({ x: 538, y: 305, width: 460, height: 364 }),
  }),
]);

const preloadSources = Object.freeze([...new Set([
  ...platformObjects.map((platform) => platform.src),
  ...machineObjects.map((machine) => machine.src),
  ...sprites.map((sprite) => sprite.src),
])]);

export const GACHA_ARCADE_MAP_SKIN = Object.freeze({
  id: "gacha-arcade",
  kind: "layered",
  label: "인형뽑기방",
  nameKo: "인형뽑기방",
  nameEn: "Gacha Arcade",
  description: "빈 전용 단상에 배치된 좌측 네 대와 우측 세 대의 독립 인형뽑기 기계",
  mobileOnly: false,
  portraitOnly: true,
  previewImage: GACHA_ARCADE_RUNTIME_BACKGROUND,
  pickerPreviewImage: GACHA_ARCADE_LAYOUT_PREVIEW,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "a2251c42",
        activeCssAnimations: 0,
        ambientEventLayers: 0,
        filteredElements: 0,
        particleElements: 0,
        sharedSpriteSubscribers: 1,
      }),
    }),
  }),
  referenceViewport: Object.freeze({
    ...GACHA_ARCADE_CANVAS,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  background: Object.freeze({
    id: "gacha-arcade-background-v3",
    src: GACHA_ARCADE_RUNTIME_BACKGROUND,
    masterSrc: `${GACHA_ARCADE_ROOT}/FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS.png`,
    fit: "fill",
    position: "50% 50%",
    locked: true,
  }),
  runtimeAnimation: Object.freeze({
    version: "3.4.0",
    canvasWidth: GACHA_ARCADE_CANVAS.width,
    canvasHeight: GACHA_ARCADE_CANVAS.height,
    clockFramesPerSecond: 10,
    renderOrder: GACHA_ARCADE_RENDER_ORDER,
    staticObjects: Object.freeze([...platformObjects, ...machineObjects]),
    sprites,
    preloadSources,
  }),
  assetCatalog: Object.freeze([]),
  ambientEvents: Object.freeze([]),
  layout: Object.freeze([]),
  layers: Object.freeze([]),
});
