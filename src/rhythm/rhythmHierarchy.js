export const RHYTHM_HIERARCHY_PART_IDS = Object.freeze(["drum", "bass", "piano"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeSectionRhythmOverrides(value, normalizePattern) {
  const source = isRecord(value) ? value : {};
  const normalize = typeof normalizePattern === "function"
    ? normalizePattern
    : (_part, pattern) => pattern;

  return Object.fromEntries(
    RHYTHM_HIERARCHY_PART_IDS
      .filter((part) => isRecord(source[part]))
      .map((part) => [part, normalize(part, source[part])]),
  );
}

export function setSectionRhythmOverride(value, part, pattern, normalizePattern) {
  if (!RHYTHM_HIERARCHY_PART_IDS.includes(part) || !isRecord(pattern)) {
    return normalizeSectionRhythmOverrides(value, normalizePattern);
  }
  return normalizeSectionRhythmOverrides({
    ...value,
    [part]: pattern,
  }, normalizePattern);
}

export function clearSectionRhythmOverride(value, part, normalizePattern) {
  const next = { ...(isRecord(value) ? value : {}) };
  if (RHYTHM_HIERARCHY_PART_IDS.includes(part)) delete next[part];
  return normalizeSectionRhythmOverrides(next, normalizePattern);
}

export function resolveRhythmHierarchyPattern({
  appDefaultPattern = null,
  normalizePattern,
  part,
  sectionPattern = null,
  userDefaultPattern = null,
} = {}) {
  if (!RHYTHM_HIERARCHY_PART_IDS.includes(part)) return { pattern: null, source: "none" };
  const normalize = typeof normalizePattern === "function"
    ? normalizePattern
    : (_part, pattern) => pattern;
  const source = isRecord(sectionPattern)
    ? "section-override"
    : isRecord(userDefaultPattern)
      ? "global-user"
      : isRecord(appDefaultPattern)
        ? "app-default"
        : "none";
  const pattern = sectionPattern ?? userDefaultPattern ?? appDefaultPattern;
  return {
    pattern: isRecord(pattern) ? normalize(part, pattern) : null,
    source,
  };
}
