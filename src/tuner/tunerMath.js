import ko from "../i18n/locales/ko.js";
import { CHROMATIC_NOTES, SOLFEGE } from "../music/noteNotation.js";

export const TUNER_REFERENCE_FREQUENCY = 440;
export const TUNER_MIN_FREQUENCY = 50;
export const TUNER_MAX_FREQUENCY = 1_200;
export const TUNER_ATTACK_MIN_CONFIDENCE = 0.82;
export const TUNER_DECAY_MIN_CONFIDENCE = 0.88;
export const TUNER_DECAY_CONTINUITY_CENTS = 35;
export const TUNER_SUSTAIN_MIN_CONFIDENCE = 0.7;
export const TUNER_SUSTAIN_CONTINUITY_CENTS = 45;

export function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function midiToFrequency(midi, referenceFrequency = TUNER_REFERENCE_FREQUENCY) {
  return referenceFrequency * 2 ** ((Number(midi) - 69) / 12);
}

export function midiToPitch(midi) {
  const roundedMidi = Math.round(Number(midi));
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const noteName = CHROMATIC_NOTES[noteIndex];
  const octave = Math.floor(roundedMidi / 12) - 1;
  return {
    midi: roundedMidi,
    noteName,
    noteIndex,
    octave,
    pitch: `${noteName}${octave}`,
    solfegeName: SOLFEGE[noteName],
  };
}

export function frequencyToChromaticPitch(frequency, referenceFrequency = TUNER_REFERENCE_FREQUENCY) {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  const midiFloat = 69 + 12 * Math.log2(frequency / referenceFrequency);
  const note = midiToPitch(midiFloat);
  const targetFrequency = midiToFrequency(note.midi, referenceFrequency);
  return {
    ...note,
    cents: Math.round(centsBetween(frequency, targetFrequency)),
    detectedFrequency: frequency,
    frequency: targetFrequency,
    midiFloat,
  };
}

export function getTunerDisplayPitch({ frequency, hasSignal } = {}) {
  if (!hasSignal) return null;
  return frequencyToChromaticPitch(frequency);
}

export function getRms(buffer) {
  if (!buffer?.length) return 0;
  let total = 0;
  for (let index = 0; index < buffer.length; index += 1) total += buffer[index] * buffer[index];
  return Math.sqrt(total / buffer.length);
}

export function centsBetween(frequency, targetFrequency) {
  if (!Number.isFinite(frequency) || !Number.isFinite(targetFrequency) || frequency <= 0 || targetFrequency <= 0) {
    return Number.NaN;
  }
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function frequencyToNearest(frequency, noteList, maxCents = Infinity) {
  if (!frequency || !Array.isArray(noteList) || noteList.length === 0) return null;

  let closest = noteList[0];
  let closestCents = Infinity;
  let signedCents = 0;

  for (const note of noteList) {
    const cents = centsBetween(frequency, note.frequency);
    if (Math.abs(cents) < closestCents) {
      closest = note;
      closestCents = Math.abs(cents);
      signedCents = cents;
    }
  }

  return closestCents <= maxCents
    ? { ...closest, cents: Math.round(signedCents), detectedFrequency: frequency }
    : null;
}

export function getTunerTrackingState(frequency, noteList, selectedString = null, {
  autoTarget = false,
  previousTargetString = null,
} = {}) {
  const currentPitch = frequencyToChromaticPitch(frequency);
  if (!currentPitch) {
    return { cents: null, currentPitch: null, manual: false, target: null };
  }

  const manualTarget = selectedString == null
    ? null
    : noteList?.find((note) => note.stringNumber === selectedString) ?? null;
  let target = manualTarget;
  if (!target && autoTarget) {
    target = frequencyToNearest(frequency, noteList);
    const previous = noteList?.find((note) => note.stringNumber === previousTargetString);
    // Switch only when the new string is at least 40 cents closer. This gives
    // a 20-cent margin on either side of the geometric midpoint, not a Hz midpoint.
    if (previous && target && Math.abs(centsBetween(frequency, previous.frequency))
      <= Math.abs(centsBetween(frequency, target.frequency)) + 40) target = previous;
  }
  const cents = target
    ? Math.round(centsBetween(frequency, target.frequency))
    : currentPitch.cents;

  return {
    cents,
    currentPitch,
    manual: manualTarget != null,
    target,
  };
}

export function isTrustedTunerPitch({
  attackPresent,
  candidateFrequency,
  confidence,
  inputPresent,
  lastFrequency = null,
  recentPitch = false,
  sustainPresent = false,
}) {
  if (!Number.isFinite(candidateFrequency) || candidateFrequency <= 0 || !Number.isFinite(confidence)) return false;
  const hasAttack = attackPresent ?? inputPresent ?? false;
  const hasRecentFrequency = recentPitch && Number.isFinite(lastFrequency) && lastFrequency > 0;
  if (
    hasRecentFrequency
    && sustainPresent
    && confidence >= TUNER_SUSTAIN_MIN_CONFIDENCE
    && Math.abs(centsBetween(candidateFrequency, lastFrequency)) <= TUNER_SUSTAIN_CONTINUITY_CENTS
  ) {
    return true;
  }
  if (hasRecentFrequency && sustainPresent && confidence >= TUNER_ATTACK_MIN_CONFIDENCE) {
    // A softly played new string may clear only the lower sustain gate. Let the
    // temporal tracker inspect it; the UI still changes only after three
    // consistent frames from the new pitch cluster.
    return true;
  }
  if (
    hasRecentFrequency
    && confidence >= TUNER_DECAY_MIN_CONFIDENCE
    && Math.abs(centsBetween(candidateFrequency, lastFrequency)) <= TUNER_DECAY_CONTINUITY_CENTS
  ) {
    return true;
  }
  return Boolean(hasAttack) && confidence >= TUNER_ATTACK_MIN_CONFIDENCE;
}

export function parabolicInterpolation(values, index) {
  const left = values[index - 1] ?? values[index];
  const center = values[index];
  const right = values[index + 1] ?? values[index];
  const divisor = left - 2 * center + right;

  if (divisor === 0) return index;
  return index + (left - right) / (2 * divisor);
}

function getWindowedToneAmplitude(buffer, sampleRate, frequency) {
  let real = 0;
  let imaginary = 0;
  let windowTotal = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, buffer.length - 1));
    const angle = (2 * Math.PI * frequency * index) / sampleRate;
    real += buffer[index] * window * Math.cos(angle);
    imaginary -= buffer[index] * window * Math.sin(angle);
    windowTotal += window;
  }
  return windowTotal > 0 ? (2 * Math.hypot(real, imaginary)) / windowTotal : 0;
}

function preferOctaveFundamentalTau(buffer, sampleRate, yin, tauEstimate, minFrequency) {
  const detectedFrequency = sampleRate / tauEstimate;
  const detectedAmplitude = getWindowedToneAmplitude(buffer, sampleRate, detectedFrequency);
  if (detectedAmplitude <= 0) return { harmonicDivisor: 1, tau: tauEstimate };

  // A plucked low string can briefly present its second harmonic more strongly
  // than the fundamental. Halving still changes the octave, so a weak body
  // resonance alone must not trigger correction (the shooter checks octaves).
  // Do not inspect a three-times-longer period here: every periodic signal also
  // creates a YIN minimum there, and a small 1/3-frequency resonance was enough
  // to turn G3/B3/E4 into C2/E2/A2 (about -1900 cents) on a real guitar.
  for (const divisor of [2]) {
    const fundamentalFrequency = detectedFrequency / divisor;
    const expectedTau = tauEstimate * divisor;
    if (fundamentalFrequency < minFrequency || expectedTau >= yin.length) continue;
    const fundamentalAmplitude = getWindowedToneAmplitude(buffer, sampleRate, fundamentalFrequency);
    if (fundamentalAmplitude / detectedAmplitude < 0.08) continue;

    let localTau = Math.round(expectedTau);
    const searchRadius = Math.max(3, divisor * 2);
    const searchStart = Math.max(2, localTau - searchRadius);
    const searchEnd = Math.min(yin.length - 1, localTau + searchRadius);
    for (let tau = searchStart; tau <= searchEnd; tau += 1) {
      if (yin[tau] < yin[localTau]) localTau = tau;
    }
    // Every periodic signal also repeats at twice its period. Require a
    // meaningful absolute improvement, not merely another good minimum.
    if (yin[localTau] <= 0.24 && yin[tauEstimate] - yin[localTau] >= 0.01) {
      return { harmonicDivisor: divisor, tau: localTau };
    }
  }

  return { harmonicDivisor: 1, tau: tauEstimate };
}

export function detectPitchYinDetailed(
  buffer,
  sampleRate,
  minFrequency = TUNER_MIN_FREQUENCY,
  maxFrequency = TUNER_MAX_FREQUENCY,
  threshold = 0.14,
) {
  if (!buffer?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2) - 1);
  if (maxTau <= minTau) return null;

  const yin = new Float32Array(maxTau + 1);
  let runningSum = 0;

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let index = 0; index < maxTau; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      sum += delta * delta;
    }

    runningSum += sum;
    yin[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (yin[tau] < threshold) {
      while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;
  const rawBetterTau = parabolicInterpolation(yin, tauEstimate);
  const fundamental = preferOctaveFundamentalTau(buffer, sampleRate, yin, tauEstimate, minFrequency);
  const betterTau = parabolicInterpolation(yin, fundamental.tau);
  const frequency = sampleRate / betterTau;
  if (!Number.isFinite(frequency)) return null;

  return {
    confidence: clampNumber(1 - yin[fundamental.tau], 0, 1),
    frequency,
    harmonicDivisor: fundamental.harmonicDivisor,
    period: betterTau,
    rawFrequency: sampleRate / rawBetterTau,
  };
}

export function detectPitchYin(
  buffer,
  sampleRate,
  minFrequency = TUNER_MIN_FREQUENCY,
  maxFrequency = TUNER_MAX_FREQUENCY,
  threshold = 0.14,
) {
  return detectPitchYinDetailed(buffer, sampleRate, minFrequency, maxFrequency, threshold)?.frequency ?? null;
}

export function detectPitchAutocorrelation(
  buffer,
  sampleRate,
  minFrequency = TUNER_MIN_FREQUENCY,
  maxFrequency = TUNER_MAX_FREQUENCY,
  minCorrelation = 0.006,
) {
  if (!buffer?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), buffer.length - 2);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let index = 0; index < buffer.length - lag; index += 1) {
      correlation += buffer[index] * buffer[index + lag];
    }

    correlation /= buffer.length - lag;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < minCorrelation) return null;
  return sampleRate / bestLag;
}

export function getMedian(values) {
  const safeValues = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (safeValues.length === 0) return null;
  const midpoint = Math.floor(safeValues.length / 2);
  return safeValues.length % 2 === 0
    ? (safeValues[midpoint - 1] + safeValues[midpoint]) / 2
    : safeValues[midpoint];
}

export function getTunerGaugePosition(cents) {
  if (!Number.isFinite(cents)) return 0;
  const direction = Math.sign(cents);
  const distance = Math.abs(cents);
  if (distance <= 50) return direction * (distance / 50) * 0.42;
  const coarseProgress = clampNumber((distance - 50) / 550, 0, 1);
  return direction * (0.42 + coarseProgress * 0.58);
}

export function getTunerOrbPosition(cents, manual = false) {
  if (!Number.isFinite(cents)) return 0;
  return manual
    ? getTunerGaugePosition(cents)
    : clampNumber(cents / 50, -1, 1);
}

export function getTunerDisplayCents(
  cents,
  previousCents = null,
  { elapsedMs = 52, pitchChanged = false } = {},
) {
  if (!Number.isFinite(cents)) return null;

  const deadZoneCents = 2;
  const centered = Math.abs(cents) <= deadZoneCents;
  if (pitchChanged || !Number.isFinite(previousCents)) return centered ? 0 : cents;

  const safeElapsed = clampNumber(elapsedMs, 16, 120);
  const targetCents = centered ? 0 : cents;
  const delta = targetCents - previousCents;
  const followDuration = Math.abs(delta) >= 12 ? 82 : Math.abs(targetCents) <= 8 ? 145 : 105;
  const follow = 1 - Math.exp(-safeElapsed / followDuration);
  const nextCents = previousCents + delta * follow;
  if (centered && Math.abs(nextCents) < 0.55) return 0;
  // Exponential interpolation is monotonic, so a new frame can retarget the
  // orb without ever crossing past the detector value and bouncing back.
  return clampNumber(nextCents, Math.min(previousCents, targetCents), Math.max(previousCents, targetCents));
}

export function getHorizontalTuningState({ cents, completed = false, hasSignal }) {
  if (!hasSignal || !Number.isFinite(cents)) return ko["tuner.waitingForSound"];
  if (Math.abs(cents) <= 3) return completed ? ko["app.inTune"] : ko["tuner.almostInTune"];
  if (cents <= -50) return ko["tuner.veryFlat"];
  if (cents < 0) return ko["tuner.slightlyFlat"];
  if (cents >= 50) return ko["tuner.verySharp"];
  return ko["tuner.slightlySharp"];
}

export function getTunerGuidance({
  cents,
  hasSignal,
  stableExact = false,
  manual = false,
  trackingPhase = "LISTENING",
}) {
  if (!hasSignal || !Number.isFinite(cents)) {
    if (trackingPhase === "NO_SIGNAL") {
      return {
        key: "waiting",
        message: ko["tuner.signalFadingPluckAgain"],
        detail: ko["tuner.waitingForANewNoteTheLastNoteWasNotMarkedComplete"],
      };
    }
    return { key: "waiting", message: ko["tuner.pluckAString"], detail: ko["tuner.iLlFollowAsSoonAsIHearIt"] };
  }
  if (!manual) {
    if (Math.abs(cents) <= 3) {
      return stableExact
        ? { key: "exact", message: ko["tuner.inTune2"], detail: ko["tuner.theDetectedNoteIsStable"] }
        : { key: "almost", message: ko["tuner.noteDetected"], detail: ko["tuner.showingTheCentsOffsetForTheDetectedNote"] };
    }
    return { key: "tracking", message: ko["tuner.detectingTheCurrentNote"], detail: ko["tuner.theNoteNameFollowsYourInput"] };
  }
  if (manual && cents >= 300) {
    return { key: "danger", message: ko["tuner.tooSharp"], detail: ko["tuner.donTTightenFurther"] };
  }
  if (Math.abs(cents) <= 3) {
    return stableExact
      ? { key: "exact", message: ko["tuner.inTune3"], detail: ko["tuner.stableAndInTune"] }
      : { key: "almost", message: ko["tuner.almostThere"], detail: ko["tuner.holdItSteady"] };
  }
  if (cents <= -100) return { key: "very-low", message: ko["tuner.flatTuneUp"], detail: ko["tuner.tightenSlowlyTowardTheTargetNote"] };
  if (cents < -12) return { key: "low", message: ko["tuner.aLittleHigher"], detail: ko["tuner.gettingCloserToCenter"] };
  if (cents < 0) return { key: "almost", message: ko["tuner.almostThere"], detail: ko["tuner.tuneUpJustALittle"] };
  if (cents >= 100) return { key: "very-high", message: ko["tuner.sharpTuneDown"], detail: ko["tuner.loosenSlowlyTowardTheTargetNote"] };
  if (cents > 12) return { key: "high", message: ko["tuner.aLittleSharp"], detail: ko["tuner.lowerItTowardCenter"] };
  return { key: "almost", message: ko["tuner.almostThere"], detail: ko["tuner.tuneDownJustALittle"] };
}
