const AUTUMN_MOON_ROOT = "/assets/maps/autumn-moon-temple-path";

function createSheetSources(directory, stem, sheetCount) {
  return Object.freeze(Array.from({ length: sheetCount }, (_, sheetIndex) => (
    `${AUTUMN_MOON_ROOT}/animation/${directory}/sheets/${stem}_${String(sheetIndex).padStart(2, "0")}.png`
  )));
}

function createMobileSheetSources(directory, stem, sheetCount) {
  return Object.freeze(Array.from({ length: sheetCount }, (_, sheetIndex) => (
    `${AUTUMN_MOON_ROOT}/animation-mobile/${directory}/sheets/${stem}_${String(sheetIndex).padStart(2, "0")}.png`
  )));
}

function createSequence({
  cellHeight,
  cellWidth,
  directory,
  frameCount,
  framesPerSecond,
  id,
  mobileEnabled = true,
  mobileFramesPerSecond = framesPerSecond,
  phaseOffsetFrames = 0,
  renderHeight = 1664,
  renderWidth = 768,
  stem,
  runtimeCellHeight,
  runtimeCellWidth,
}) {
  const sheetCount = frameCount / 8;
  return Object.freeze({
    id,
    cellHeight,
    cellWidth,
    columns: 4,
    frameCount,
    framesPerSecond,
    framesPerSheet: 8,
    mobileEnabled,
    mobileFramesPerSecond,
    phaseOffsetFrames,
    renderHeight,
    renderWidth,
    rows: 2,
    sheetSources: createSheetSources(directory, stem, sheetCount),
    runtimeVariant: runtimeCellWidth && runtimeCellHeight
      ? Object.freeze({
          cellHeight: runtimeCellHeight,
          cellWidth: runtimeCellWidth,
          sheetSources: createMobileSheetSources(directory, stem, sheetCount),
        })
      : null,
  });
}

const LEAVES_FAR = createSequence({
  id: "leaves-far",
  directory: "leaves_far",
  stem: "leaves_far_48f_sheet",
  frameCount: 48,
  framesPerSecond: 12,
  mobileFramesPerSecond: 8,
  cellWidth: 384,
  cellHeight: 832,
  phaseOffsetFrames: 0,
});

const TREE_SWAY = createSequence({
  id: "tree-sway",
  directory: "tree_sway",
  stem: "tree_sway_48f_sheet",
  frameCount: 48,
  framesPerSecond: 16,
  mobileFramesPerSecond: 12,
  cellWidth: 768,
  cellHeight: 1664,
  runtimeCellWidth: 384,
  runtimeCellHeight: 832,
  phaseOffsetFrames: 0,
});

const LEAVES_MID = createSequence({
  id: "leaves-mid",
  directory: "leaves_mid",
  stem: "leaves_mid_64f_sheet",
  frameCount: 64,
  framesPerSecond: 16,
  mobileFramesPerSecond: 10,
  cellWidth: 768,
  cellHeight: 1664,
  runtimeCellWidth: 384,
  runtimeCellHeight: 832,
  phaseOffsetFrames: 17,
});

const GROUND_GUST = Object.freeze({
  ...createSequence({
    id: "ground-gust",
    directory: "ground_gust",
    stem: "ground_gust_32f_sheet",
    frameCount: 32,
    framesPerSecond: 16,
    mobileFramesPerSecond: 10,
    cellWidth: 768,
    cellHeight: 384,
    runtimeCellWidth: 384,
    runtimeCellHeight: 192,
    renderWidth: 768,
    renderHeight: 384,
  }),
  loop: false,
  randomDelayMs: Object.freeze([10000, 16000]),
  x: 0,
  y: 1280,
});

const LEAVES_NEAR = createSequence({
  id: "leaves-near",
  directory: "leaves_near",
  stem: "leaves_near_48f_sheet",
  frameCount: 48,
  framesPerSecond: 16,
  mobileEnabled: false,
  cellWidth: 768,
  cellHeight: 1664,
  runtimeCellWidth: 384,
  runtimeCellHeight: 832,
  phaseOffsetFrames: 31,
});

const UNDERLAY_SEQUENCES = Object.freeze([LEAVES_FAR, TREE_SWAY, LEAVES_MID]);
const OVERLAY_SEQUENCES = Object.freeze([GROUND_GUST, LEAVES_NEAR]);
const ALL_SEQUENCES = Object.freeze([...UNDERLAY_SEQUENCES, ...OVERLAY_SEQUENCES]);

function getInitialPreloadSources(sequence) {
  const playbackSequence = sequence.runtimeVariant
    ? { ...sequence, ...sequence.runtimeVariant }
    : sequence;
  const initialFrame = sequence.phaseOffsetFrames ?? 0;
  const currentSheet = Math.floor(initialFrame / sequence.framesPerSheet);
  const nextSheet = (currentSheet + 1) % playbackSequence.sheetSources.length;
  return [playbackSequence.sheetSources[currentSheet], playbackSequence.sheetSources[nextSheet]];
}

export const AUTUMN_MOON_TEMPLE_RUNTIME = Object.freeze({
  columns: 4,
  rows: 2,
  framesPerSheet: 8,
  frameOrder: "row-major",
  playback: "forward",
  referenceWidth: 768,
  referenceHeight: 1664,
  totalFrameCount: ALL_SEQUENCES.reduce((total, sequence) => total + sequence.frameCount, 0),
  underlaySequences: UNDERLAY_SEQUENCES,
  overlaySequences: OVERLAY_SEQUENCES,
  preloadSources: Object.freeze(ALL_SEQUENCES.flatMap(getInitialPreloadSources)),
});

export const AUTUMN_MOON_TEMPLE_PATH_MAP_SKIN = Object.freeze({
  id: "autumn_moon_temple_path",
  kind: "layered",
  label: "월야 단풍 사찰길",
  nameKo: "월야 단풍 사찰길",
  nameEn: "Autumn Moon Temple Path",
  description: "달빛 아래 단풍과 낙엽이 흐르는 고요한 사찰길",
  mobileOnly: false,
  portraitOnly: true,
  previewImage: `${AUTUMN_MOON_ROOT}/background/autumn_moon_temple_path_bg_768x1664.webp`,
  pickerPreviewImage: `${AUTUMN_MOON_ROOT}/background/autumn_moon_temple_path_bg_768x1664.webp`,
  performance: Object.freeze({
    mobileGameplay: Object.freeze({
      mode: "full",
      audit: Object.freeze({
        completed: true,
        contentFingerprint: "0e09b8f5",
        activeCssAnimations: 0,
        ambientEventLayers: 0,
        filteredElements: 0,
        particleElements: 0,
        sharedSpriteSubscribers: 2,
      }),
    }),
  }),
  referenceViewport: Object.freeze({
    width: 768,
    height: 1664,
    deviceWidth: 390,
    deviceHeight: 844,
  }),
  background: Object.freeze({
    id: "autumn-moon-temple-path-background",
    src: `${AUTUMN_MOON_ROOT}/background/autumn_moon_temple_path_bg_768x1664.webp`,
    fallbackSrc: `${AUTUMN_MOON_ROOT}/background/autumn_moon_temple_path_bg_768x1664.png`,
    fit: "cover",
    position: "50% 50%",
    locked: true,
  }),
  runtimeAnimation: AUTUMN_MOON_TEMPLE_RUNTIME,
  foregroundOccluder: Object.freeze({
    id: "autumn-moon-temple-path-foreground",
    src: `${AUTUMN_MOON_ROOT}/foreground/autumn_foreground_occluder_768x1664.png`,
    fit: "cover",
    position: "50% 50%",
  }),
  assetCatalog: Object.freeze([]),
  ambientEvents: Object.freeze([]),
  layout: Object.freeze([]),
  layers: Object.freeze([]),
});
