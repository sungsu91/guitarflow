const MINI_CHORD_PIANO_PATTERN_LEVELS = Object.freeze({
  basic: 0.34,
  "4beat": 0.32,
  "8beat": 0.29,
  "16beat": 0.22,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
  const isHold = style === "hold";
  const isEightBeatPulse = pattern === "8beat";
  const isSixteenthPulse = pattern === "16beat";
  const duration = style === "stab"
    ? isSixteenthPulse
      ? clamp(safeStepSeconds * 0.95, 0.1, 0.16)
      : isEightBeatPulse
        ? clamp(safeStepSeconds * 1.55, 0.18, 0.28)
        : clamp(safeStepSeconds * 1.8, 0.2, 0.36)
    : isArp
      ? clamp(safeStepSeconds * 2.8, 0.28, 0.55)
      : isHold
        ? Math.max(0.45, safeMeasureSeconds * 0.98)
        : isSixteenthPulse
          ? clamp(safeStepSeconds, 0.11, 0.18)
          : isEightBeatPulse
            ? clamp(safeStepSeconds * 1.7, 0.22, 0.34)
            : Math.max(0.38, Math.min(safeMeasureSeconds * overlapRatio, safeStepSeconds * 3.2));
  const level = style === "stab"
    ? isSixteenthPulse
      ? getMiniChordPianoPatternLevel("16beat")
      : isEightBeatPulse
        ? getMiniChordPianoPatternLevel("8beat")
        : 0.25
    : isArp ? 0.23 : isHold ? 0.28 : 0.3;
  const attackSeconds = isHold ? 0.012 : isArp ? 0.007 : isSixteenthPulse ? 0.005 : 0.009;
  const decaySeconds = isHold ? 0.62 : isArp ? 0.48 : isSixteenthPulse ? 0.35 : style === "stab" ? 0.42 : 0.54;
  const sustainLevel = isHold ? 0.5 : isArp ? 0.42 : isSixteenthPulse ? 0.35 : style === "stab" ? 0.38 : 0.45;
  const releaseSeconds = isHold
    ? clamp(safeMeasureSeconds * 0.4, 1, 1.5)
    : isArp
      ? clamp(safeStepSeconds * 3.5, 0.45, 0.75)
      : isSixteenthPulse
        ? clamp(safeStepSeconds * 1.7, 0.15, 0.28)
        : style === "stab"
          ? clamp(safeStepSeconds * 2.8, 0.35, 0.55)
          : clamp(safeStepSeconds * 4, 0.55, 0.85);

  return {
    attackSeconds,
    commonToneSmoothing: shouldSmoothMiniChordPianoCommonTone(pattern, style),
    decaySeconds,
    duration,
    level,
    releaseSeconds,
    sustainLevel,
  };
}

export function getMiniChordPianoTransitionRelease({
  beatSeconds = 0.5,
  chordSpanSeconds = 2,
  endingHold = false,
  releaseSeconds = 0.55,
} = {}) {
  const safeBeatSeconds = clamp(Number(beatSeconds) || 0.5, 0.2, 2);
  const safeSpanSeconds = Math.max(0.02, Number(chordSpanSeconds) || safeBeatSeconds);
  const safeReleaseSeconds = clamp(Number(releaseSeconds) || 0.55, 0.15, 1.5);
  if (endingHold) return clamp(Math.max(safeReleaseSeconds, 1.35), 1.2, 2);

  const spanBeats = safeSpanSeconds / safeBeatSeconds;
  if (spanBeats <= 1.25) {
    return Math.min(safeReleaseSeconds, clamp(safeBeatSeconds * 0.38, 0.15, 0.25));
  }
  if (spanBeats <= 2.25) {
    return Math.min(safeReleaseSeconds, clamp(safeBeatSeconds * 0.45, 0.18, 0.25));
  }
  if (spanBeats <= 3.25) {
    return Math.min(safeReleaseSeconds, clamp(safeBeatSeconds * 0.68, 0.3, 0.45));
  }
  return Math.min(safeReleaseSeconds, clamp(safeBeatSeconds * 0.82, 0.35, 0.6));
}

export function getMiniChordPianoHumanizeOffset(noteIndex = 0, chordIndex = 0, style = "chord") {
  const safeNoteIndex = Math.max(0, Math.floor(Number(noteIndex) || 0));
  if (safeNoteIndex === 0 || style === "arpUp" || style === "arpDown") return 0;
  const interval = 0.008 + ((Math.max(0, Math.floor(Number(chordIndex) || 0)) + safeNoteIndex) % 4) * 0.002;
  return safeNoteIndex * interval;
}

export function getMiniChordPianoVelocityRatio(noteIndex = 0, chordIndex = 0, style = "chord") {
  const chordRatios = [0.88, 0.98, 0.93, 0.84];
  const arpRatios = [0.8, 0.89, 1, 0.92];
  const ratios = style === "arpUp" || style === "arpDown" ? arpRatios : chordRatios;
  const index = (
    Math.max(0, Math.floor(Number(noteIndex) || 0))
    + Math.max(0, Math.floor(Number(chordIndex) || 0))
  ) % ratios.length;
  return ratios[index];
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
      : step != null && step !== "rest" && step !== "hold"
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
