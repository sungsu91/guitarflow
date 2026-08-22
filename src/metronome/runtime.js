export const METRONOME_RUNTIME_MIN_BPM = 30;
export const METRONOME_RUNTIME_MAX_BPM = 240;

const DEFAULT_BEATS_PER_MEASURE = 4;
const DEFAULT_CLICKS_PER_BEAT = 1;
const RUNTIME_EPSILON = 1e-9;

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numericValue)));
}

function normalizeMode(mode, allowedModes) {
  return allowedModes.includes(mode) ? mode : "off";
}

function getAutomationKey(mode, everyBars, everyMs) {
  if (mode === "bars") return `bars:${everyBars}`;
  if (mode === "time") return `time:${everyMs}`;
  return "off";
}

export function normalizeAutomatorTimerParts(minutes, seconds) {
  return {
    minutes: clampNumber(minutes, 1, 30, 1),
    seconds: clampNumber(seconds, 1, 59, 30),
  };
}

export function normalizeTrackerTimerParts(minutes, seconds) {
  return {
    minutes: clampNumber(minutes, 1, 30, 1),
    seconds: clampNumber(seconds, 0, 59, 0),
  };
}

export function createMetronomeRuntimeState(initial = {}) {
  return {
    elapsedMs: Math.max(0, Number(initial.elapsedMs) || 0),
    measureProgress: Math.max(0, Math.min(0.999999999, Number(initial.measureProgress) || 0)),
    completedBars: Math.max(0, Math.trunc(Number(initial.completedBars) || 0)),
    trackerBars: Math.max(0, Math.trunc(Number(initial.trackerBars) || 0)),
    trackerElapsedMs: Math.max(0, Number(initial.trackerElapsedMs) || 0),
    trackerMode: normalizeMode(initial.trackerMode, ["off", "bars", "timer"]),
    trackerBarLimitReached: false,
    trackerTimerLimitReached: false,
    automationKey: null,
    automationBarsElapsed: 0,
    automationTimeElapsedMs: 0,
    tickKey: null,
    tickSerial: 0,
    coachMuted: false,
  };
}

export function advanceMetronomeRuntime(previousState, elapsedMs, configuration = {}) {
  const previous = previousState ?? createMetronomeRuntimeState();
  const deltaMs = Math.max(0, Number(elapsedMs) || 0);
  const bpm = clampNumber(
    configuration.bpm,
    METRONOME_RUNTIME_MIN_BPM,
    METRONOME_RUNTIME_MAX_BPM,
    80,
  );
  const beatsPerMeasure = Math.max(1, Math.round(Number(configuration.beatsPerMeasure) || DEFAULT_BEATS_PER_MEASURE));
  const clicksPerBeat = Math.max(1, Math.round(Number(configuration.clicksPerBeat) || DEFAULT_CLICKS_PER_BEAT));
  const measureDurationMs = (60000 / bpm) * beatsPerMeasure;
  const trackerMode = normalizeMode(configuration.trackerMode, ["off", "bars", "timer"]);
  const automatorMode = normalizeMode(configuration.automatorMode, ["off", "bars", "time"]);
  const automatorEveryBars = Math.max(1, Math.round(Number(configuration.automatorEveryBars) || 1));
  const automatorEveryMs = Math.max(1, Number(configuration.automatorEveryMs) || 1);
  const automationKey = getAutomationKey(automatorMode, automatorEveryBars, automatorEveryMs);
  const next = { ...previous };

  if (next.trackerMode !== trackerMode) {
    next.trackerMode = trackerMode;
    next.trackerBarLimitReached = false;
    next.trackerTimerLimitReached = false;
  }
  if (next.automationKey !== automationKey) {
    next.automationKey = automationKey;
    next.automationBarsElapsed = 0;
    next.automationTimeElapsedMs = 0;
  }

  next.elapsedMs += deltaMs;
  const unwrappedMeasureProgress = next.measureProgress + (deltaMs / measureDurationMs);
  const barsCrossed = Math.max(0, Math.floor(unwrappedMeasureProgress + RUNTIME_EPSILON));
  next.measureProgress = unwrappedMeasureProgress - barsCrossed;
  if (next.measureProgress < RUNTIME_EPSILON || 1 - next.measureProgress < RUNTIME_EPSILON) {
    next.measureProgress = 0;
  }
  next.completedBars += barsCrossed;

  const previousTrackerBars = next.trackerBars;
  const previousTrackerElapsedMs = next.trackerElapsedMs;
  if (trackerMode === "bars") next.trackerBars += barsCrossed;
  if (trackerMode === "timer") next.trackerElapsedMs += deltaMs;

  let trackerBarLimitReached = false;
  const trackerBarLimit = Math.max(0, Math.trunc(Number(configuration.trackerBarLimit) || 0));
  if (trackerMode === "bars" && configuration.trackerBarLimitEnabled && trackerBarLimit > 0) {
    if (next.trackerBars >= trackerBarLimit && !next.trackerBarLimitReached) {
      trackerBarLimitReached = true;
      next.trackerBarLimitReached = true;
      if (configuration.trackerBarResetWhenReached) {
        next.trackerBars = 0;
        next.trackerBarLimitReached = false;
      }
    }
  } else {
    next.trackerBarLimitReached = false;
  }

  let trackerTimerLimitReached = false;
  const trackerTimerTotalMs = Math.max(0, Number(configuration.trackerTimerTotalMs) || 0);
  if (trackerMode === "timer" && trackerTimerTotalMs > 0) {
    if (next.trackerElapsedMs >= trackerTimerTotalMs && !next.trackerTimerLimitReached) {
      trackerTimerLimitReached = true;
      next.trackerElapsedMs = trackerTimerTotalMs;
      next.trackerTimerLimitReached = true;
      if (configuration.trackerTimerResetWhenReached) {
        next.trackerElapsedMs = 0;
        next.trackerTimerLimitReached = false;
      }
    }
  } else {
    next.trackerTimerLimitReached = false;
  }

  let autoBpmChanges = 0;
  if (automatorMode === "bars") {
    next.automationBarsElapsed += barsCrossed;
    autoBpmChanges = Math.floor(next.automationBarsElapsed / automatorEveryBars);
    next.automationBarsElapsed -= autoBpmChanges * automatorEveryBars;
  } else if (automatorMode === "time") {
    next.automationTimeElapsedMs += deltaMs;
    autoBpmChanges = Math.floor(next.automationTimeElapsedMs / automatorEveryMs);
    next.automationTimeElapsedMs -= autoBpmChanges * automatorEveryMs;
  }

  const direction = configuration.automatorDirection === "decrease" ? -1 : 1;
  const bpmStep = Math.max(1, Math.round(Number(configuration.automatorStep) || 1));
  const nextBpm = clampNumber(
    bpm + (autoBpmChanges * bpmStep * direction),
    METRONOME_RUNTIME_MIN_BPM,
    METRONOME_RUNTIME_MAX_BPM,
    bpm,
  );

  const coachPlayBars = Math.max(1, Math.round(Number(configuration.coachPlayBars) || 1));
  const coachMuteBars = Math.max(0, Math.round(Number(configuration.coachMuteBars) || 0));
  const coachCycleBars = Math.max(1, coachPlayBars + coachMuteBars);
  next.coachMuted = Boolean(configuration.coachEnabled)
    && coachMuteBars > 0
    && next.completedBars % coachCycleBars >= coachPlayBars;

  const ticksPerMeasure = beatsPerMeasure * clicksPerBeat;
  const tickInMeasure = Math.min(
    ticksPerMeasure - 1,
    Math.floor((next.measureProgress * ticksPerMeasure) + RUNTIME_EPSILON),
  );
  const beatInBar = Math.floor(tickInMeasure / clicksPerBeat);
  const subdivisionIndex = tickInMeasure % clicksPerBeat;
  const tickKey = `${next.completedBars}:${tickInMeasure}:${beatsPerMeasure}:${clicksPerBeat}`;
  const tickChanged = next.tickKey !== tickKey;
  if (tickChanged) {
    next.tickKey = tickKey;
    next.tickSerial += 1;
  }

  return {
    state: next,
    barsCrossed,
    beatInBar,
    subdivisionIndex,
    tickChanged,
    autoBpmChanges,
    nextBpm,
    trackerBarsChanged: next.trackerBars !== previousTrackerBars,
    trackerElapsedChanged: next.trackerElapsedMs !== previousTrackerElapsedMs,
    trackerBarLimitReached,
    trackerTimerLimitReached,
    shouldStop: (trackerBarLimitReached && Boolean(configuration.trackerBarStopWhenReached))
      || (trackerTimerLimitReached && Boolean(configuration.trackerTimerStopWhenReached)),
  };
}
