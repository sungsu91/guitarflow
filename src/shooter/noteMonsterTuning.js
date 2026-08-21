import {
  DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
  SHOOTER_NOTE_MONSTER_ROOTS,
  getShooterNoteMonsterRoot,
  getShooterNoteMonsterSkin,
} from "./noteMonsterAssets.js";
import shooterNoteMonsterTuningDefaults from "./noteMonsterTuningDefaults.js";

export const SHOOTER_NOTE_MONSTER_TUNING_STORAGE_KEY = "rifflabShooterMonsterTuningV1";
export const SHOOTER_NOTE_MONSTER_TUNING_SAVE_ENDPOINT = "/__rifflab/shooter-editor/note-monster-tuning";
// Tuning offsets are authored on the default 86.4px monster at its 115% base scale.
// They are converted to percentages before rendering so the label stays attached at every size.
export const SHOOTER_NOTE_MONSTER_TUNING_REFERENCE_SIZE = 86.4 * 1.15;

export const DEFAULT_SHOOTER_NOTE_MONSTER_TUNING = Object.freeze({
  jointScale: 1,
  labelColor: "",
  labelOffsetX: 0,
  labelOffsetY: 0,
  labelOutline: "",
  labelScale: 1,
  scale: 1.15,
});

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function normalizeHexColor(value) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : "";
}

export function normalizeShooterNoteMonsterTuning(value = DEFAULT_SHOOTER_NOTE_MONSTER_TUNING) {
  return {
    jointScale: clamp(value?.jointScale, 0.5, 2, DEFAULT_SHOOTER_NOTE_MONSTER_TUNING.jointScale),
    labelColor: normalizeHexColor(value?.labelColor),
    labelOffsetX: clamp(value?.labelOffsetX, -80, 80, DEFAULT_SHOOTER_NOTE_MONSTER_TUNING.labelOffsetX),
    labelOffsetY: clamp(value?.labelOffsetY, -80, 80, DEFAULT_SHOOTER_NOTE_MONSTER_TUNING.labelOffsetY),
    labelOutline: normalizeHexColor(value?.labelOutline),
    labelScale: clamp(value?.labelScale, 0.5, 2, DEFAULT_SHOOTER_NOTE_MONSTER_TUNING.labelScale),
    scale: clamp(value?.scale, 0.5, 2.5, DEFAULT_SHOOTER_NOTE_MONSTER_TUNING.scale),
  };
}

export function getShooterNoteMonsterRenderedScales(
  value = DEFAULT_SHOOTER_NOTE_MONSTER_TUNING,
) {
  const tuning = normalizeShooterNoteMonsterTuning(value);
  return {
    labelScale: tuning.labelScale * tuning.jointScale,
    monsterScale: tuning.scale * tuning.jointScale,
  };
}

export function normalizeShooterNoteMonsterTuningStore(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(Object.entries(value).flatMap(([skinId, rootTunings]) => {
    if (!skinId || !rootTunings || typeof rootTunings !== "object" || Array.isArray(rootTunings)) return [];
    const normalizedRoots = Object.fromEntries(SHOOTER_NOTE_MONSTER_ROOTS.flatMap((noteRoot) => (
      rootTunings[noteRoot]
        ? [[noteRoot, normalizeShooterNoteMonsterTuning(rootTunings[noteRoot])]]
        : []
    )));
    return Object.keys(normalizedRoots).length ? [[skinId, normalizedRoots]] : [];
  }));
}

export const SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS = Object.freeze(
  normalizeShooterNoteMonsterTuningStore(shooterNoteMonsterTuningDefaults),
);

export function mergeShooterNoteMonsterTuningStores(baseStore = {}, overrideStore = {}) {
  const base = normalizeShooterNoteMonsterTuningStore(baseStore);
  const override = normalizeShooterNoteMonsterTuningStore(overrideStore);
  const skinIds = new Set([...Object.keys(base), ...Object.keys(override)]);

  return Object.fromEntries([...skinIds].flatMap((skinId) => {
    const roots = { ...(base[skinId] ?? {}), ...(override[skinId] ?? {}) };
    return Object.keys(roots).length ? [[skinId, roots]] : [];
  }));
}

export function getShooterNoteMonsterLabelPosition(layout = {}, tuning = {}) {
  const normalizedTuning = normalizeShooterNoteMonsterTuning(tuning);
  const toPercent = (offset) => (offset / SHOOTER_NOTE_MONSTER_TUNING_REFERENCE_SIZE) * 100;
  return {
    x: clamp(layout?.x, -100, 200, 50) + toPercent(normalizedTuning.labelOffsetX),
    y: clamp(layout?.y, -100, 200, 50) + toPercent(normalizedTuning.labelOffsetY),
  };
}

export function getShooterNoteMonsterTuning(
  tuningStore = SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS,
  skinId = DEFAULT_SHOOTER_NOTE_MONSTER_SKIN_ID,
  noteName = "C4",
) {
  const resolvedSkinId = getShooterNoteMonsterSkin(skinId).id;
  const noteRoot = getShooterNoteMonsterRoot(noteName);
  const tuning = tuningStore?.[resolvedSkinId]?.[noteRoot];
  return tuning
    ? normalizeShooterNoteMonsterTuning(tuning)
    : DEFAULT_SHOOTER_NOTE_MONSTER_TUNING;
}
