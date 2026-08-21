export const TUNER_REFERENCE_FREQUENCY = 440;
export const TUNER_MIN_FREQUENCY = 50;
export const TUNER_MAX_FREQUENCY = 1_200;

const NOTE_NAMES = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);

export function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function midiToFrequency(midi, referenceFrequency = TUNER_REFERENCE_FREQUENCY) {
  return referenceFrequency * 2 ** ((Number(midi) - 69) / 12);
}

export function midiToPitch(midi) {
  const roundedMidi = Math.round(Number(midi));
  const noteName = NOTE_NAMES[((roundedMidi % 12) + 12) % 12];
  const octave = Math.floor(roundedMidi / 12) - 1;
  return {
    midi: roundedMidi,
    noteName,
    octave,
    pitch: `${noteName}${octave}`,
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
  };
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

export function getTunerTrackingState(frequency, noteList, selectedString = null) {
  const currentPitch = frequencyToChromaticPitch(frequency);
  if (!currentPitch) {
    return { cents: null, currentPitch: null, manual: false, target: null };
  }

  const manualTarget = selectedString == null
    ? null
    : noteList?.find((note) => note.stringNumber === selectedString) ?? null;
  const cents = manualTarget
    ? Math.round(centsBetween(frequency, manualTarget.frequency))
    : currentPitch.cents;

  return {
    cents,
    currentPitch,
    manual: manualTarget != null,
    target: manualTarget,
  };
}

export function isTrustedTunerPitch({
  candidateFrequency,
  confidence,
  inputPresent,
  lastFrequency = null,
  recentPitch = false,
}) {
  if (!Number.isFinite(candidateFrequency) || candidateFrequency <= 0 || !Number.isFinite(confidence)) return false;
  if (inputPresent) return confidence >= 0.7;
  if (!recentPitch || !Number.isFinite(lastFrequency) || lastFrequency <= 0 || confidence < 0.78) return false;
  return Math.abs(centsBetween(candidateFrequency, lastFrequency)) <= 80;
}

export function parabolicInterpolation(values, index) {
  const left = values[index - 1] ?? values[index];
  const center = values[index];
  const right = values[index + 1] ?? values[index];
  const divisor = left - 2 * center + right;

  if (divisor === 0) return index;
  return index + (left - right) / (2 * divisor);
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
  const betterTau = parabolicInterpolation(yin, tauEstimate);
  const frequency = sampleRate / betterTau;
  if (!Number.isFinite(frequency)) return null;

  return {
    confidence: clampNumber(1 - yin[tauEstimate], 0, 1),
    frequency,
    period: betterTau,
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

  const deadZoneCents = 3;
  const reengageCents = 4;
  const centered = Math.abs(cents) <= deadZoneCents;
  if (pitchChanged || !Number.isFinite(previousCents)) return centered ? 0 : cents;

  const safeElapsed = clampNumber(elapsedMs, 16, 120);
  if (centered) {
    if (Math.abs(previousCents) <= reengageCents) return 0;
    const centerFollow = 1 - Math.exp(-safeElapsed / 115);
    const nextCents = previousCents * (1 - centerFollow);
    return Math.abs(nextCents) < 0.75 ? 0 : nextCents;
  }

  // Crossing four cents is a meaningful pitch change: leave the visual
  // dead-zone immediately instead of letting smoothing hide it.
  if (Math.abs(cents) >= reengageCents && Math.abs(previousCents) <= deadZoneCents) return cents;

  const delta = cents - previousCents;
  if (Math.abs(delta) >= 5) return cents;

  const followDuration = Math.abs(cents) <= 8 ? 180 : 110;
  const follow = 1 - Math.exp(-safeElapsed / followDuration);
  return previousCents + delta * follow;
}

export function getHorizontalTuningState({ cents, completed = false, hasSignal }) {
  if (!hasSignal || !Number.isFinite(cents)) return "소리를 기다리는 중";
  if (Math.abs(cents) <= 3) return completed ? "정확" : "거의 정확";
  if (cents <= -50) return "많이 낮음";
  if (cents < 0) return "조금 낮음";
  if (cents >= 50) return "많이 높음";
  return "조금 높음";
}

export function getTunerGuidance({ cents, hasSignal, stableExact = false, manual = false }) {
  if (!hasSignal || !Number.isFinite(cents)) {
    return { key: "waiting", message: "줄을 한 번 튕겨주세요~", detail: "줄 소리가 들리면 바로 따라갈게요" };
  }
  if (!manual) {
    if (Math.abs(cents) <= 3) {
      return stableExact
        ? { key: "exact", message: "음이 정확해요! ✓", detail: "현재 감지된 음을 안정적으로 유지하고 있어요" }
        : { key: "almost", message: "현재 음을 인식했어요", detail: "감지된 음 기준 cents 오차를 표시해요" };
    }
    return { key: "tracking", message: "현재 음을 인식하고 있어요", detail: "입력 음이 바뀌면 음 이름도 바로 따라가요" };
  }
  if (manual && cents >= 300) {
    return { key: "danger", message: "⚠ 앗! 너무 높아요!", detail: "더 조이지 마세요" };
  }
  if (Math.abs(cents) <= 3) {
    return stableExact
      ? { key: "exact", message: "딱 좋아요! ✓", detail: "안정적으로 잘 맞았어요" }
      : { key: "almost", message: "오오 거의 다 왔어요!", detail: "그대로 잠깐 유지해요" };
  }
  if (cents <= -100) return { key: "very-low", message: "낮아요~~! 더 올려요 ↑", detail: "목표 음을 향해 천천히 조여요" };
  if (cents < -12) return { key: "low", message: "조금만 더~ ↑", detail: "중앙으로 가까워지고 있어요" };
  if (cents < 0) return { key: "almost", message: "오오 거의 다 왔어요!", detail: "아주 조금만 올려요" };
  if (cents >= 100) return { key: "very-high", message: "높아요~~! 조금 내려요 ↓", detail: "목표 음을 향해 천천히 풀어요" };
  if (cents > 12) return { key: "high", message: "살짝 높아요~ ↓", detail: "중앙 쪽으로 조금 내려요" };
  return { key: "almost", message: "오오 거의 다 왔어요!", detail: "아주 조금만 내려요" };
}
