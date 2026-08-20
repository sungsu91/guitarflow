const COASTAL_COVE_CREATURE_ROOT = "/assets/maps/coastal-cove/creatures/hermit-crab";
const COASTAL_COVE_HERMIT_CRAB_WALK_ROOT = `${COASTAL_COVE_CREATURE_ROOT}/walk`;
const COASTAL_COVE_HERMIT_CRAB_WALK_FRAMES = Object.freeze(
  Array.from(
    { length: 7 },
    (_, index) => `${COASTAL_COVE_HERMIT_CRAB_WALK_ROOT}/hermit-crab-walk-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_COVE_SHARK_ROOT = "/assets/maps/coastal-cove/creatures/shark";
const COASTAL_COVE_SHARK_SWIM_ROOT = `${COASTAL_COVE_SHARK_ROOT}/swim`;
const COASTAL_COVE_SHARK_SWIM_FRAMES = Object.freeze(
  Array.from(
    { length: 10 },
    (_, index) => `${COASTAL_COVE_SHARK_SWIM_ROOT}/shark-swim-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_COVE_NET_FISHER_ROOT = "/assets/maps/coastal-cove/creatures/net-fisher";
const COASTAL_COVE_NET_FISHER_CAST_ROOT = `${COASTAL_COVE_NET_FISHER_ROOT}/cast`;
const COASTAL_COVE_NET_FISHER_CAST_FRAMES = Object.freeze(
  Array.from(
    { length: 10 },
    (_, index) => `${COASTAL_COVE_NET_FISHER_CAST_ROOT}/net-fisher-cast-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_COVE_NET_FISHER_FRAME_HOLDS = Object.freeze([8, 2, 2, 2, 2, 2, 8, 3, 3, 8]);
const COASTAL_COVE_NET_FISHER_CAST_ENTRIES = Object.freeze(
  COASTAL_COVE_NET_FISHER_CAST_FRAMES.map((src, index) => Object.freeze({
    src,
    hold: COASTAL_COVE_NET_FISHER_FRAME_HOLDS[index],
  })),
);
const COASTAL_CHEST_ROOT = "/assets/maps/coastal-cove/interactive/chests";
const COASTAL_TREASURE_FRAMES = Object.freeze(
  Array.from(
    { length: 5 },
    (_, index) => `${COASTAL_CHEST_ROOT}/treasure/coastal-treasure-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_MIMIC_FRAMES = Object.freeze([
  COASTAL_TREASURE_FRAMES[0],
  ...Array.from(
    { length: 4 },
    (_, index) => `${COASTAL_CHEST_ROOT}/mimic/coastal-mimic-${String(index + 2).padStart(2, "0")}.png`,
  ),
]);
const COASTAL_MIMIC_ACTION_ROOT = `${COASTAL_CHEST_ROOT}/mimic-action`;
const COASTAL_MIMIC_IDLE_FRAMES = Object.freeze(
  Array.from(
    { length: 6 },
    (_, index) => `${COASTAL_MIMIC_ACTION_ROOT}/idle/mimic-idle-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_MIMIC_HIT_FRAMES = Object.freeze(
  Array.from(
    { length: 4 },
    (_, index) => `${COASTAL_MIMIC_ACTION_ROOT}/hit/mimic-hit-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_MIMIC_DEFEAT_FRAMES = Object.freeze(
  Array.from(
    { length: 8 },
    (_, index) => `${COASTAL_MIMIC_ACTION_ROOT}/die/mimic-die-${String(index + 1).padStart(2, "0")}.png`,
  ),
);
const COASTAL_MIMIC_ALL_FRAMES = Object.freeze([
  ...COASTAL_MIMIC_FRAMES,
  ...COASTAL_MIMIC_IDLE_FRAMES,
  ...COASTAL_MIMIC_HIT_FRAMES,
  ...COASTAL_MIMIC_DEFEAT_FRAMES,
]);
const COASTAL_CHEST_SPAWN_POINTS = Object.freeze([
  Object.freeze({ x: 0.14, y: 0.63, scale: 0.7, rotation: -2 }),
  Object.freeze({ x: 0.2, y: 0.73, scale: 0.66, rotation: 1 }),
  Object.freeze({ x: 0.27, y: 0.83, scale: 0.62, rotation: -1 }),
  Object.freeze({ x: 0.86, y: 0.65, scale: 0.69, rotation: 2 }),
  Object.freeze({ x: 0.8, y: 0.75, scale: 0.65, rotation: -1 }),
  Object.freeze({ x: 0.73, y: 0.84, scale: 0.61, rotation: 1 }),
]);

export const COASTAL_COVE_ENVIRONMENT_ASSETS = Object.freeze([
  Object.freeze({
    id: "ambient-hermit-crab",
    label: "움직이는 소라게",
    src: COASTAL_COVE_HERMIT_CRAB_WALK_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.2,
    anchorX: 50,
    anchorY: 92,
    maxInstances: 3,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 7,
      previewFrame: 0,
      frames: COASTAL_COVE_HERMIT_CRAB_WALK_FRAMES,
      framesPerSecond: 9,
      roamDurationSeconds: 9.6,
      animation: "hermit-crab-roam",
    }),
  }),
  Object.freeze({
    id: "ambient-shark-fin",
    label: "헤엄치는 상어",
    src: COASTAL_COVE_SHARK_SWIM_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.5,
    anchorX: 50,
    anchorY: 70,
    maxInstances: 2,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 10,
      previewFrame: 2,
      frames: COASTAL_COVE_SHARK_SWIM_FRAMES,
      framesPerSecond: 7,
      roamDurationSeconds: 12.8,
      animation: "shark-swim",
    }),
  }),
  Object.freeze({
    id: "ambient-net-fisher",
    label: "바다에 투망을 던지는 어부",
    src: COASTAL_COVE_NET_FISHER_CAST_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.58,
    anchorX: 34.375,
    anchorY: 97.65625,
    maxInstances: 2,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 10,
      previewFrame: 0,
      frames: COASTAL_COVE_NET_FISHER_CAST_ENTRIES,
      framesPerSecond: 10,
      animation: "net-fisher-cast",
    }),
  }),
  Object.freeze({
    id: "interactive-treasure-chest",
    label: "상호작용 보물상자",
    src: COASTAL_TREASURE_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.27,
    anchorX: 50,
    anchorY: 98,
    maxInstances: 3,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: 5,
      previewFrame: 0,
      frames: COASTAL_TREASURE_FRAMES,
    }),
    eventActor: Object.freeze({
      type: "coastal-chest",
      variant: "treasure",
      readySrc: COASTAL_TREASURE_FRAMES[0],
      frames: COASTAL_TREASURE_FRAMES,
      spawnGroup: "coastal-chests",
      spawnPoints: COASTAL_CHEST_SPAWN_POINTS,
    }),
  }),
  Object.freeze({
    id: "interactive-mimic-chest",
    label: "상호작용 수상한 상자",
    src: COASTAL_TREASURE_FRAMES[0],
    slot: "animated-environment",
    baseWidth: 0.27,
    anchorX: 50,
    anchorY: 98,
    maxInstances: 2,
    spriteSheet: Object.freeze({
      columns: 1,
      rows: 1,
      frameCount: COASTAL_MIMIC_ALL_FRAMES.length,
      previewFrame: 0,
      frames: COASTAL_MIMIC_ALL_FRAMES,
    }),
    eventActor: Object.freeze({
      type: "coastal-chest",
      variant: "mimic",
      readySrc: COASTAL_TREASURE_FRAMES[0],
      frames: COASTAL_MIMIC_FRAMES,
      idleFrames: COASTAL_MIMIC_IDLE_FRAMES,
      hitFrames: COASTAL_MIMIC_HIT_FRAMES,
      defeatFrames: COASTAL_MIMIC_DEFEAT_FRAMES,
      spawnGroup: "coastal-chests",
      spawnPoints: COASTAL_CHEST_SPAWN_POINTS,
    }),
  }),
]);
