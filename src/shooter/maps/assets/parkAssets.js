const PARK_MINI_POODLE_ROOT = "/assets/maps/park/creatures/mini-poodle/tilt";
const PARK_MINI_POODLE_TILT_FRAMES = Object.freeze(
  Array.from(
    { length: 15 },
    (_, index) => `${PARK_MINI_POODLE_ROOT}/mini-poodle-tilt-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const PARK_BORDER_COLLIE_ROOT = "/assets/maps/park/creatures/border-collie/grounded-roll";
const PARK_BORDER_COLLIE_FRAME_HOLDS = Object.freeze(Array.from({ length: 22 }, () => 1));
const PARK_BORDER_COLLIE_ACROBAT_FRAMES = Object.freeze(
  PARK_BORDER_COLLIE_FRAME_HOLDS.map((hold, index) => Object.freeze({
    src: `${PARK_BORDER_COLLIE_ROOT}/border-collie-grounded-roll-${String(index + 1).padStart(2, "0")}.png`,
    hold,
  })),
);
const PARK_BORDER_COLLIE_ROAM_SEQUENCE = Object.freeze([
  0, 1, 2, 3, 0, 1, 2, 3,
  4, 5, 6, 7,
  8, 9, 10, 11, 12,
  13, 13, 14, 14, 15, 16, 17,
  18, 19, 20, 21, 18, 19, 20, 21,
]);
const PARK_BRITISH_SHORTHAIR_ROOT = "/assets/maps/park/creatures/british-shorthair/play";
const PARK_BRITISH_SHORTHAIR_PLAY_FRAMES = Object.freeze(
  Array.from(
    { length: 61 },
    (_, index) => `${PARK_BRITISH_SHORTHAIR_ROOT}/british-shorthair-play-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const PARK_BRITISH_SHORTHAIR_PLAY_SEQUENCE = Object.freeze([
  ...Array.from({ length: 8 }, () => 0),
  ...Array.from({ length: 60 }, (_, index) => index + 1),
  4, 3, 2, 1,
  ...Array.from({ length: 8 }, () => 0),
]);
const PARK_MUNCHKIN_ROOT = "/assets/maps/park/creatures/munchkin/play";
const PARK_MUNCHKIN_PLAY_FRAMES = Object.freeze(
  Array.from(
    { length: 49 },
    (_, index) => `${PARK_MUNCHKIN_ROOT}/munchkin-play-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const PARK_MUNCHKIN_PLAY_SEQUENCE = Object.freeze([
  ...Array.from({ length: 12 }, () => 0),
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29,
  30, 30, 31, 31, 32, 32, 33, 33, 34, 34, 35, 35, 36, 36, 36, 37, 37, 38, 38,
  39, 39, 40, 40, 41, 41, 42, 42, 43, 43, 43, 44, 44, 44, 45, 46, 47,
  ...Array.from({ length: 12 }, () => 48),
  47, 46, 45, 44, 42, 39, 0,
  ...Array.from({ length: 8 }, () => 0),
]);
const PARK_FOUNTAIN_ROOT = "/assets/maps/park/decor/fountain-flow";
const PARK_FOUNTAIN_BASE = `${PARK_FOUNTAIN_ROOT}/park-fountain-base.png`;
const PARK_FOUNTAIN_WATER_FRAMES = Object.freeze(
  Array.from(
    { length: 32 },
    (_, index) => `${PARK_FOUNTAIN_ROOT}/park-fountain-water-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const PARK_GARDEN_SWING_ROOT = "/assets/maps/park/decor/garden-swing";
const PARK_GARDEN_SWING_FRAMES = Object.freeze(
  Array.from(
    { length: 10 },
    (_, index) => `${PARK_GARDEN_SWING_ROOT}/garden-swing-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const PARK_GARDEN_SWING_SEQUENCE = Object.freeze([
  0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9,
]);
const PARK_FOUNTAIN_FENCE_ROOT = "/assets/maps/park/decor/fountain-fence";
const PARK_FOUNTAIN_FENCE_BACK = `${PARK_FOUNTAIN_FENCE_ROOT}/park-fountain-fence-back.png`;
const PARK_FOUNTAIN_FENCE_FRONT = `${PARK_FOUNTAIN_FENCE_ROOT}/park-fountain-fence-front.png`;
const PARK_WOOD_PLANK_FLOOR_ROOT = "/assets/maps/park/decor/wood-plank-floor";
const PARK_WOOD_PLANK_FLOOR_TILES = Object.freeze(
  Array.from(
    { length: 5 },
    (_, index) => `${PARK_WOOD_PLANK_FLOOR_ROOT}/park-wood-plank-${String(index + 1).padStart(2, "0")}.png`,
  ),
);

export const PARK_ENVIRONMENT_ASSETS = Object.freeze([
  Object.freeze({
    id: "ambient-mini-poodle",
    label: "고개를 갸우뚱하는 미니푸들",
    src: PARK_MINI_POODLE_TILT_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.28,
    anchorX: 50,
    anchorY: 97.73,
    maxInstances: 3,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 15,
      previewFrame: 0,
      frames: PARK_MINI_POODLE_TILT_FRAMES,
      framesPerSecond: 8,
      animation: "mini-poodle-tilt",
    }),
  }),
  Object.freeze({
    id: "ambient-border-collie-acrobat",
    label: "달리고 공중제비하는 보더콜리",
    src: PARK_BORDER_COLLIE_ACROBAT_FRAMES[0].src,
    slot: "animated-environment",
    baseWidth: 0.44,
    anchorX: 50,
    anchorY: 91,
    maxInstances: 2,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 22,
      previewFrame: 0,
      frames: PARK_BORDER_COLLIE_ACROBAT_FRAMES,
      sequence: PARK_BORDER_COLLIE_ROAM_SEQUENCE,
      framesPerSecond: 10,
      animation: "border-collie-acrobat",
    }),
  }),
  Object.freeze({
    id: "ambient-british-shorthair-play",
    label: "산책하고 혼자 노는 브리티시 숏헤어",
    src: PARK_BRITISH_SHORTHAIR_PLAY_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.34,
    anchorX: 50,
    anchorY: 98,
    maxInstances: 3,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 61,
      previewFrame: 0,
      frames: PARK_BRITISH_SHORTHAIR_PLAY_FRAMES,
      sequence: PARK_BRITISH_SHORTHAIR_PLAY_SEQUENCE,
      framesPerSecond: 5,
      animation: "british-shorthair-play",
    }),
  }),
  Object.freeze({
    id: "ambient-munchkin-play",
    label: "깡충 뛰고 슬라이딩하며 혼자 노는 먼치킨",
    src: PARK_MUNCHKIN_PLAY_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.34,
    anchorX: 50,
    anchorY: 98,
    maxInstances: 3,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 49,
      previewFrame: 0,
      frames: PARK_MUNCHKIN_PLAY_FRAMES,
      sequence: PARK_MUNCHKIN_PLAY_SEQUENCE,
      framesPerSecond: 6,
      animation: "munchkin-play",
    }),
  }),
  Object.freeze({
    id: "ambient-park-fountain-flow",
    label: "물이 흐르는 정원 분수",
    src: PARK_FOUNTAIN_BASE,
    slot: "animated-environment",
    baseWidth: 0.56,
    anchorX: 50,
    anchorY: 98.5,
    maxInstances: 1,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 32,
      previewFrame: 16,
      staticSrc: PARK_FOUNTAIN_BASE,
      frames: PARK_FOUNTAIN_WATER_FRAMES,
      framesPerSecond: 12,
      animation: "park-fountain-flow",
    }),
  }),
  Object.freeze({
    id: "ambient-garden-swing",
    label: "천천히 흔들리는 정원 그네",
    src: PARK_GARDEN_SWING_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.48,
    anchorX: 50,
    anchorY: 96,
    maxInstances: 1,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 10,
      previewFrame: 4,
      frames: PARK_GARDEN_SWING_FRAMES,
      sequence: PARK_GARDEN_SWING_SEQUENCE,
      framesPerSecond: 4,
      animation: "garden-swing",
    }),
  }),
  Object.freeze({
    id: "park-fountain-fence-back",
    label: "분수 울타리 · 뒤쪽 고정 레이어",
    src: PARK_FOUNTAIN_FENCE_BACK,
    slot: "midground-environment",
    baseWidth: 0.72,
    anchorX: 50,
    anchorY: 50,
    maxInstances: 1,
  }),
  Object.freeze({
    id: "park-fountain-fence-front",
    label: "분수 울타리 · 앞쪽 고정 레이어",
    src: PARK_FOUNTAIN_FENCE_FRONT,
    slot: "midground-environment",
    baseWidth: 0.72,
    anchorX: 50,
    anchorY: 50,
    maxInstances: 1,
  }),
  ...PARK_WOOD_PLANK_FLOOR_TILES.map((src, index) => Object.freeze({
    id: `park-wood-plank-floor-${String(index + 1).padStart(2, "0")}`,
    label: `이끼 낀 나무 판자 바닥 ${index + 1}`,
    src,
    slot: "background-environment",
    baseWidth: 0.38,
    anchorX: 50,
    anchorY: 50,
    maxInstances: 4,
  })),
]);
