const MIN_ENDING_NUMBER = 1;
const MAX_ENDING_NUMBER = 5;

function clampBarIndex(value, barCount) {
  const maxIndex = Math.max(0, Math.round(Number(barCount) || 1) - 1);
  return Math.max(0, Math.min(maxIndex, Math.round(Number(value) || 0)));
}

function normalizeEndingNumber(value) {
  const endingNumber = Math.round(Number(value));
  return Number.isInteger(endingNumber)
    && endingNumber >= MIN_ENDING_NUMBER
    && endingNumber <= MAX_ENDING_NUMBER
    ? endingNumber
    : null;
}

/**
 * Canonical volta data. A bar can belong to exactly one ending range and
 * adjacent bars with the same number are always stored as one range.
 */
export function normalizeMiniChordEndingRanges(ranges = [], barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  const endingByBar = Array.from({ length: safeBarCount }, () => null);

  (Array.isArray(ranges) ? ranges : []).forEach((range) => {
    if (!range || typeof range !== "object") return;
    const endingNumber = normalizeEndingNumber(
      range.endingNumber ?? range.number ?? range.ending,
    );
    if (endingNumber == null) return;
    const firstBar = clampBarIndex(range.startBar, safeBarCount);
    const lastBar = clampBarIndex(range.endBar ?? range.startBar, safeBarCount);
    const startBar = Math.min(firstBar, lastBar);
    const endBar = Math.max(firstBar, lastBar);
    for (let barIndex = startBar; barIndex <= endBar; barIndex += 1) {
      endingByBar[barIndex] = endingNumber;
    }
  });

  const normalized = [];
  endingByBar.forEach((endingNumber, barIndex) => {
    if (endingNumber == null) return;
    const previous = normalized[normalized.length - 1];
    if (previous?.endingNumber === endingNumber && previous.endBar === barIndex - 1) {
      previous.endBar = barIndex;
      return;
    }
    normalized.push({ endingNumber, startBar: barIndex, endBar: barIndex });
  });
  return normalized;
}

/** Migrate legacy `barMarks[bar].endings` data into connected ranges. */
export function getMiniChordEndingRangesFromBarMarks(marks = {}, barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  const ranges = [];
  for (let barIndex = 0; barIndex < safeBarCount; barIndex += 1) {
    const mark = marks?.[barIndex] ?? marks?.[String(barIndex)] ?? {};
    const values = Array.isArray(mark.endings)
      ? mark.endings
      : mark.ending == null
        ? []
        : [mark.ending];
    const endingNumber = values
      .map(normalizeEndingNumber)
      .find((value) => value != null);
    if (endingNumber != null) ranges.push({ endingNumber, startBar: barIndex, endBar: barIndex });
  }
  return normalizeMiniChordEndingRanges(ranges, safeBarCount);
}

/** Keep navigation/repeat marks canonical by removing legacy ending fields. */
export function stripMiniChordEndingsFromBarMarks(marks = {}) {
  const next = {};
  Object.entries(marks && typeof marks === "object" ? marks : {}).forEach(([key, mark]) => {
    if (!mark || typeof mark !== "object") return;
    const normalizedMark = { ...mark };
    delete normalizedMark.ending;
    delete normalizedMark.endings;
    if (Object.keys(normalizedMark).length > 0) next[key] = normalizedMark;
  });
  return next;
}

/** Playback keeps consuming bar marks; derive those marks from canonical ranges. */
export function applyMiniChordEndingRangesToBarMarks(marks = {}, ranges = [], barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  const next = stripMiniChordEndingsFromBarMarks(marks);
  normalizeMiniChordEndingRanges(ranges, safeBarCount).forEach((range) => {
    for (let barIndex = range.startBar; barIndex <= range.endBar; barIndex += 1) {
      next[barIndex] = { ...(next[barIndex] ?? {}), endings: [range.endingNumber] };
    }
  });
  return next;
}

export function getMiniChordEndingRangeForBar(ranges = [], barIndex = 0, barCount = 4) {
  const safeIndex = clampBarIndex(barIndex, barCount);
  return normalizeMiniChordEndingRanges(ranges, barCount)
    .find((range) => safeIndex >= range.startBar && safeIndex <= range.endBar) ?? null;
}

/**
 * Toggle one ending number at a bar. Selecting the same number on an adjacent
 * bar extends the existing range; selecting it elsewhere moves the range, so
 * separate endings cannot accidentally become 1, 1, 2, 2 entries.
 */
export function toggleMiniChordEndingRange(ranges = [], barIndex = 0, endingNumberValue = 1, barCount = 4) {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  const safeBarIndex = clampBarIndex(barIndex, safeBarCount);
  const endingNumber = normalizeEndingNumber(endingNumberValue);
  if (endingNumber == null) return normalizeMiniChordEndingRanges(ranges, safeBarCount);

  const normalized = normalizeMiniChordEndingRanges(ranges, safeBarCount);
  const currentRange = normalized.find((range) => (
    safeBarIndex >= range.startBar && safeBarIndex <= range.endBar
  ));
  if (currentRange?.endingNumber === endingNumber) {
    return normalized.filter((range) => range !== currentRange);
  }

  const sameNumberRange = normalized.find((range) => range.endingNumber === endingNumber);
  const withoutConflicts = normalized.filter((range) => (
    range !== sameNumberRange
    && !(safeBarIndex >= range.startBar && safeBarIndex <= range.endBar)
  ));
  const nextRange = sameNumberRange
    && (safeBarIndex === sameNumberRange.startBar - 1 || safeBarIndex === sameNumberRange.endBar + 1)
    ? {
        endingNumber,
        startBar: Math.min(safeBarIndex, sameNumberRange.startBar),
        endBar: Math.max(safeBarIndex, sameNumberRange.endBar),
      }
    : { endingNumber, startBar: safeBarIndex, endBar: safeBarIndex };

  return normalizeMiniChordEndingRanges([...withoutConflicts, nextRange], safeBarCount);
}
