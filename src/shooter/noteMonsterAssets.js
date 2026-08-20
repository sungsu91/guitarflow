export const SHOOTER_NOTE_MONSTER_ROOTS = Object.freeze(["C", "D", "E", "F", "G", "A", "B"]);
export const SHOOTER_NOTE_MONSTER_FRAME_COUNT = 6;
export const SHOOTER_NOTE_MONSTER_BREAK_FRAME_COUNT = SHOOTER_NOTE_MONSTER_FRAME_COUNT - 1;
const CUTE_OBJECT_SHOOTER_NOTE_MONSTER_SKIN_ID = "cute-object";
export const DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID = "elemental";
export const SHOOTER_NOTE_MONSTER_LABEL_ZEROING = Object.freeze({ left: 3, up: 3 });
export const SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE = 1.08;
export const SHOOTER_NOTE_MONSTER_A_RENDER_SCALE = 1.12;

const ASSET_ROOT = "/assets/shooter/note-monsters";

const NOTE_MONSTER_LABEL_LAYOUTS = Object.freeze({
  [CUTE_OBJECT_SHOOTER_NOTE_MONSTER_SKIN_ID]: Object.freeze({
    C: Object.freeze({ x: 50.5, y: 52.5 }),
    D: Object.freeze({ x: 50.5, y: 51.5 }),
    E: Object.freeze({ x: 50, y: 47.5 }),
    F: Object.freeze({ x: 50, y: 49 }),
    G: Object.freeze({ x: 50, y: 44 }),
    A: Object.freeze({ x: 50, y: 50.5 }),
    B: Object.freeze({ x: 50, y: 42 }),
  }),
  elemental: Object.freeze(Object.fromEntries(
    SHOOTER_NOTE_MONSTER_ROOTS.map((noteRoot) => [
      noteRoot,
      Object.freeze({ x: 50, y: 50 }),
    ]),
  )),
});

const NOTE_MONSTER_LABEL_FINE_TUNING = Object.freeze({
  [CUTE_OBJECT_SHOOTER_NOTE_MONSTER_SKIN_ID]: Object.freeze({
    E: Object.freeze({ x: 0, y: -1 }),
    A: Object.freeze({ x: 0, y: -4 }),
    B: Object.freeze({ x: -1, y: -1 }),
  }),
});

const NOTE_MONSTER_LABEL_PALETTES = Object.freeze({
  [CUTE_OBJECT_SHOOTER_NOTE_MONSTER_SKIN_ID]: Object.freeze({
    C: Object.freeze({ color: "#3b2103", outline: "#fff1bd", glow: "rgba(255, 188, 46, 0.34)" }),
    D: Object.freeze({ color: "#fff7e8", outline: "#2b0d54", glow: "rgba(255, 226, 255, 0.42)" }),
    E: Object.freeze({ color: "#3a2104", outline: "#fff0b0", glow: "rgba(255, 190, 38, 0.34)" }),
    F: Object.freeze({ color: "#17330b", outline: "#efffc9", glow: "rgba(201, 255, 95, 0.34)" }),
    G: Object.freeze({ color: "#4d102a", outline: "#ffe8f1", glow: "rgba(255, 163, 201, 0.38)" }),
    A: Object.freeze({ color: "#fff8dc", outline: "#081536", glow: "rgba(178, 217, 255, 0.48)" }),
    B: Object.freeze({ color: "#08324b", outline: "#effdff", glow: "rgba(141, 232, 255, 0.4)" }),
  }),
  elemental: Object.freeze({
    C: Object.freeze({ color: "#fff7e8", outline: "#500b05", glow: "rgba(255, 166, 105, 0.42)" }),
    D: Object.freeze({ color: "#172f08", outline: "#efffc7", glow: "rgba(190, 255, 96, 0.4)" }),
    E: Object.freeze({ color: "#f4fbff", outline: "#052e68", glow: "rgba(103, 210, 255, 0.46)" }),
    F: Object.freeze({ color: "#103947", outline: "#efffff", glow: "rgba(113, 255, 237, 0.42)" }),
    G: Object.freeze({ color: "#3d2600", outline: "#fff4bc", glow: "rgba(255, 216, 77, 0.42)" }),
    A: Object.freeze({ color: "#fff5ff", outline: "#31075b", glow: "rgba(213, 142, 255, 0.46)" }),
    B: Object.freeze({ color: "#082f57", outline: "#f2fdff", glow: "rgba(133, 224, 255, 0.44)" }),
  }),
});

function createShooterNoteMonsterAssets(assetRoot) {
  return Object.freeze(Object.fromEntries(
    SHOOTER_NOTE_MONSTER_ROOTS.map((noteRoot) => [
      noteRoot,
      Object.freeze(Array.from(
        { length: SHOOTER_NOTE_MONSTER_FRAME_COUNT },
        (_, frameIndex) => `${assetRoot}/${noteRoot.toLowerCase()}/frame-${frameIndex}.png`,
      )),
    ]),
  ));
}

export const SHOOTER_NOTE_MONSTER_SKINS = Object.freeze([
  Object.freeze({
    id: CUTE_OBJECT_SHOOTER_NOTE_MONSTER_SKIN_ID,
    label: "Cute Object Set",
    description: "귀여운 오브젝트형 기본 몹",
    assets: createShooterNoteMonsterAssets(`${ASSET_ROOT}/cute-object`),
  }),
  Object.freeze({
    id: "elemental",
    label: "Elemental Set",
    description: "불·대지·물·바람·빛·보라·얼음 원소 구체",
    assets: createShooterNoteMonsterAssets(ASSET_ROOT),
  }),
]);

export function getShooterNoteMonsterSkin(skinId) {
  return SHOOTER_NOTE_MONSTER_SKINS.find((skin) => skin.id === skinId)
    ?? SHOOTER_NOTE_MONSTER_SKINS.find((skin) => skin.id === DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID)
    ?? SHOOTER_NOTE_MONSTER_SKINS[0];
}

export const SHOOTER_NOTE_MONSTER_ASSETS = getShooterNoteMonsterSkin().assets;

export const SHOOTER_NOTE_MONSTER_ASSET_SOURCES = Object.freeze(
  SHOOTER_NOTE_MONSTER_ROOTS.flatMap((noteRoot) => SHOOTER_NOTE_MONSTER_ASSETS[noteRoot]),
);

export function getShooterNoteMonsterAssetSources(skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID) {
  const { assets } = getShooterNoteMonsterSkin(skinId);
  return SHOOTER_NOTE_MONSTER_ROOTS.flatMap((noteRoot) => assets[noteRoot]);
}

export function getShooterNoteMonsterRoot(noteName) {
  const match = String(noteName ?? "").trim().toUpperCase().match(/^([A-G])/);
  return match?.[1] ?? "C";
}

export function getShooterNoteMonsterLabelParts(noteName) {
  const normalizedNoteName = String(noteName ?? "").trim();
  const match = normalizedNoteName.match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)?$/);
  if (!match) {
    return {
      accidental: "",
      octave: "",
      root: getShooterNoteMonsterRoot(normalizedNoteName),
    };
  }
  return {
    accidental: match[2] || "",
    octave: match[3] || "",
    root: match[1].toUpperCase(),
  };
}

export function getShooterNoteMonsterLabelLayout(
  noteName,
  skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
) {
  const skin = getShooterNoteMonsterSkin(skinId);
  const noteRoot = getShooterNoteMonsterRoot(noteName);
  const authoredLayout = NOTE_MONSTER_LABEL_LAYOUTS[skin.id]?.[noteRoot] ?? { x: 50, y: 50 };
  const fineTuning = NOTE_MONSTER_LABEL_FINE_TUNING[skin.id]?.[noteRoot] ?? { x: 0, y: 0 };
  return {
    x: authoredLayout.x - SHOOTER_NOTE_MONSTER_LABEL_ZEROING.left + fineTuning.x,
    y: authoredLayout.y - SHOOTER_NOTE_MONSTER_LABEL_ZEROING.up + fineTuning.y,
  };
}

export function getShooterNoteMonsterLabelPalette(
  noteName,
  skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
) {
  const skin = getShooterNoteMonsterSkin(skinId);
  const noteRoot = getShooterNoteMonsterRoot(noteName);
  return NOTE_MONSTER_LABEL_PALETTES[skin.id]?.[noteRoot]
    ?? NOTE_MONSTER_LABEL_PALETTES[DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID].A;
}

export function getShooterNoteMonsterRenderScale(noteName) {
  const { accidental, root } = getShooterNoteMonsterLabelParts(noteName);
  const accidentalScale = accidental === "#" || accidental === "♯"
    ? SHOOTER_NOTE_MONSTER_SHARP_RENDER_SCALE
    : 1;
  const noteRootScale = root === "A" ? SHOOTER_NOTE_MONSTER_A_RENDER_SCALE : 1;
  return Math.max(accidentalScale, noteRootScale);
}

export function getShooterNoteMonsterFrames(noteName, skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID) {
  const { assets } = getShooterNoteMonsterSkin(skinId);
  return assets[getShooterNoteMonsterRoot(noteName)] ?? assets.C;
}

export function getShooterNoteMonsterFrameSrc(
  noteName,
  frameIndex = 0,
  skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
) {
  const safeFrameIndex = Math.max(
    0,
    Math.min(SHOOTER_NOTE_MONSTER_FRAME_COUNT - 1, Math.trunc(Number(frameIndex) || 0)),
  );
  return getShooterNoteMonsterFrames(noteName, skinId)[safeFrameIndex];
}
