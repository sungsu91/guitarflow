const MINI_CHORD_PIANO_PATTERN_LEVELS = Object.freeze({
  basic: 0.34,
  "4beat": 0.32,
  "8beat": 0.28,
  "16beat": 0.2,
});

export function getMiniChordPianoPatternLevel(pattern = "basic") {
  return MINI_CHORD_PIANO_PATTERN_LEVELS[pattern] ?? MINI_CHORD_PIANO_PATTERN_LEVELS["4beat"];
}

export function shouldSmoothMiniChordPianoCommonTone(pattern = "basic", style = "chord") {
  return pattern === "basic" && style === "chord";
}

export function isMiniChordSectionBoundary(currentChord = null, nextChord = null) {
  if (!currentChord || !nextChord) return false;
  const currentSectionId = String(currentChord?.backingArrangement?.overrideId || "");
  const nextSectionId = String(nextChord?.backingArrangement?.overrideId || "");
  return currentSectionId !== nextSectionId;
}

export function getMiniChordBoundarySafeDuration({
  duration = 0.1,
  eventOffset = 0,
  isSectionBoundary = false,
  releasePadding = 0.006,
  slotDuration = 1,
} = {}) {
  const safeDuration = Math.max(0.02, Number(duration) || 0.1);
  if (!isSectionBoundary) return safeDuration;
  const remainingDuration = Math.max(
    0.02,
    (Number(slotDuration) || 1) - Math.max(0, Number(eventOffset) || 0) - Math.max(0, Number(releasePadding) || 0),
  );
  return Math.min(safeDuration, remainingDuration);
}

export function getMiniChordPianoStepProfile({
  measureSeconds = 1,
  overlapRatio = 1,
  pattern = "basic",
  stepSeconds = 0.125,
  style = "chord",
} = {}) {
  const safeStepSeconds = Math.max(0.02, Number(stepSeconds) || 0.125);
  const safeMeasureSeconds = Math.max(safeStepSeconds, Number(measureSeconds) || 1);
  const isArp = style === "arpUp" || style === "arpDown";
  const isEightBeatPulse = pattern === "8beat";
  const duration = style === "stab"
    ? isEightBeatPulse
      ? Math.max(0.16, Math.min(0.28, safeStepSeconds * 1.6))
      : Math.max(0.08, Math.min(0.16, safeStepSeconds * 0.95))
    : isArp
      ? Math.max(0.1, Math.min(0.3, safeStepSeconds * 1.9))
      : Math.max(0.2, Math.min(safeMeasureSeconds * overlapRatio, safeStepSeconds * 2.4));
  const level = style === "stab"
    ? isEightBeatPulse ? getMiniChordPianoPatternLevel("8beat") : 0.22
    : isArp ? 0.2 : 0.28;

  return {
    commonToneSmoothing: shouldSmoothMiniChordPianoCommonTone(pattern, style),
    duration,
    level,
  };
}

export function shouldAddMiniChordExplicitSlotFallback({
  end = 0,
  hasExplicitChord = false,
  part = "bass",
  start = 0,
  steps = [],
} = {}) {
  if (!hasExplicitChord || !Array.isArray(steps)) return false;
  const safeStart = Math.max(0, Math.floor(Number(start) || 0));
  const safeEnd = Math.max(safeStart, Math.min(steps.length, Math.ceil(Number(end) || 0)));
  const hasAttack = steps.slice(safeStart, safeEnd).some((step) => (
    part === "piano"
      ? Boolean(step?.active)
      : step != null && step !== "rest"
  ));
  return !hasAttack;
}

export function getMiniChordExplicitSlotFallbackDuration({
  measureSeconds = 1,
  overlapRatio = 1,
  part = "bass",
  pattern = "basic",
  stepSeconds = 0.125,
} = {}) {
  const safeStepSeconds = Math.max(0.02, Number(stepSeconds) || 0.125);
  if (part === "piano") {
    return getMiniChordPianoStepProfile({
      measureSeconds,
      overlapRatio,
      pattern,
      stepSeconds: safeStepSeconds,
      style: "chord",
    }).duration;
  }
  return Math.max(0.07, Math.min(0.2, safeStepSeconds * 1.35));
}
