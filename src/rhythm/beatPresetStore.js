export const BEAT_PRESET_PART_IDS = Object.freeze(["drum", "bass", "piano"]);

export const BEAT_PRESET_SLOT_IDS = Object.freeze([
  "basic",
  "4beat",
  "8beat",
  "16beat",
  "custom",
]);

export const BEAT_PRESET_SLOT_LABELS = Object.freeze({
  basic: "기본",
  "4beat": "4",
  "8beat": "8",
  "16beat": "16",
  custom: "CUSTOM",
});

function assertFactory(createPattern) {
  if (typeof createPattern !== "function") {
    throw new TypeError("createPattern must be a function");
  }
}

export function createBeatPresetStore(createPattern) {
  assertFactory(createPattern);
  return Object.fromEntries(BEAT_PRESET_PART_IDS.map((part) => [
    part,
    Object.fromEntries(BEAT_PRESET_SLOT_IDS.map((slotId) => [
      slotId,
      createPattern(part, slotId),
    ])),
  ]));
}

export function normalizeBeatPresetStore(
  value,
  { createPattern, normalizePattern, legacyCustomPatterns = null } = {},
) {
  assertFactory(createPattern);
  const normalize = typeof normalizePattern === "function"
    ? normalizePattern
    : (_part, pattern) => pattern;
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(BEAT_PRESET_PART_IDS.map((part) => [
    part,
    Object.fromEntries(BEAT_PRESET_SLOT_IDS.map((slotId) => {
      const legacyCustom = slotId === "custom" ? legacyCustomPatterns?.[part] : null;
      const pattern = source?.[part]?.[slotId]
        ?? legacyCustom
        ?? createPattern(part, slotId);
      return [slotId, normalize(part, pattern, slotId)];
    })),
  ]));
}

export function getBeatPresetSlot(
  store,
  part,
  slotId,
  { createPattern, normalizePattern } = {},
) {
  if (!BEAT_PRESET_PART_IDS.includes(part) || !BEAT_PRESET_SLOT_IDS.includes(slotId)) return null;
  const normalized = normalizeBeatPresetStore(store, { createPattern, normalizePattern });
  return normalized[part][slotId];
}

