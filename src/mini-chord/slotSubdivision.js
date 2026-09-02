export const MINI_CHORD_HALVES_PER_BAR = 2;
export const MINI_CHORD_SLOTS_PER_BAR = 4;
export const MINI_CHORD_SLOT_FORMAT_VERSION = 2;

function normalizeBarCount(value) {
  return Math.max(1, Math.round(Number(value) || 1));
}

function normalizeSlotValue(value) {
  return String(value ?? "").trim();
}

export function normalizeMiniChordSlots(
  slots = [],
  barCount = 4,
  { sourceSlotsPerBar = MINI_CHORD_SLOTS_PER_BAR } = {},
) {
  const safeBarCount = normalizeBarCount(barCount);
  const safeSlots = Array.isArray(slots) ? slots : [];
  const normalizedSourceSlotsPerBar = Number(sourceSlotsPerBar) === MINI_CHORD_HALVES_PER_BAR
    ? MINI_CHORD_HALVES_PER_BAR
    : MINI_CHORD_SLOTS_PER_BAR;

  if (normalizedSourceSlotsPerBar === MINI_CHORD_HALVES_PER_BAR) {
    return Array.from({ length: safeBarCount * MINI_CHORD_SLOTS_PER_BAR }, (_, slotIndex) => {
      const barIndex = Math.floor(slotIndex / MINI_CHORD_SLOTS_PER_BAR);
      const beatInBar = slotIndex % MINI_CHORD_SLOTS_PER_BAR;
      if (beatInBar % 2 === 1) return "";
      const legacySlotIndex = barIndex * MINI_CHORD_HALVES_PER_BAR + beatInBar / 2;
      return normalizeSlotValue(safeSlots[legacySlotIndex]);
    });
  }

  return Array.from(
    { length: safeBarCount * MINI_CHORD_SLOTS_PER_BAR },
    (_, index) => normalizeSlotValue(safeSlots[index]),
  );
}

export function normalizeMiniChordSplitSlots(splitSlots = [], barCount = 4) {
  const maxHalfIndex = normalizeBarCount(barCount) * MINI_CHORD_HALVES_PER_BAR;
  return [...new Set(
    (Array.isArray(splitSlots) ? splitSlots : [])
      .map((value) => Math.round(Number(value)))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < maxHalfIndex),
  )].sort((left, right) => left - right);
}

export function getMiniChordHalfIndex(slotIndex = 0) {
  const safeSlotIndex = Math.max(0, Math.round(Number(slotIndex) || 0));
  const barIndex = Math.floor(safeSlotIndex / MINI_CHORD_SLOTS_PER_BAR);
  const beatInBar = safeSlotIndex % MINI_CHORD_SLOTS_PER_BAR;
  return barIndex * MINI_CHORD_HALVES_PER_BAR + Math.floor(beatInBar / 2);
}

export function splitMiniChordSlot(slots = [], splitSlots = [], slotIndex = 0, barCount = 4) {
  const safeSlots = normalizeMiniChordSlots(slots, barCount);
  const safeSlotIndex = Math.max(
    0,
    Math.min(safeSlots.length - 1, Math.round(Number(slotIndex) || 0)),
  );
  const primarySlotIndex = safeSlotIndex - (safeSlotIndex % 2);
  const secondarySlotIndex = primarySlotIndex + 1;
  const halfIndex = getMiniChordHalfIndex(primarySlotIndex);
  const nextSlots = [...safeSlots];

  if (!nextSlots[secondarySlotIndex]) {
    nextSlots[secondarySlotIndex] = nextSlots[primarySlotIndex];
  }

  return {
    halfIndex,
    primarySlotIndex,
    secondarySlotIndex,
    slots: nextSlots,
    splitSlots: normalizeMiniChordSplitSlots([...splitSlots, halfIndex], barCount),
  };
}

export function mergeMiniChordSlot(
  slots = [],
  splitSlots = [],
  slotIndex = 0,
  barCount = 4,
  { preferredSlotIndex = slotIndex, preferredValue } = {},
) {
  const safeSlots = normalizeMiniChordSlots(slots, barCount);
  const safeSlotIndex = Math.max(
    0,
    Math.min(safeSlots.length - 1, Math.round(Number(slotIndex) || 0)),
  );
  const primarySlotIndex = safeSlotIndex - (safeSlotIndex % 2);
  const secondarySlotIndex = primarySlotIndex + 1;
  const halfIndex = getMiniChordHalfIndex(primarySlotIndex);
  const safePreferredSlotIndex = Math.round(Number(preferredSlotIndex) || 0) === secondarySlotIndex
    ? secondarySlotIndex
    : primarySlotIndex;
  const nextSlots = [...safeSlots];
  const hasPreferredValue = preferredValue !== undefined;

  nextSlots[primarySlotIndex] = hasPreferredValue
    ? normalizeSlotValue(preferredValue)
    : nextSlots[safePreferredSlotIndex];
  nextSlots[secondarySlotIndex] = "";

  return {
    halfIndex,
    primarySlotIndex,
    secondarySlotIndex,
    slots: nextSlots,
    splitSlots: normalizeMiniChordSplitSlots(splitSlots, barCount)
      .filter((value) => value !== halfIndex),
  };
}

export function getMiniChordTimelineHalves(slots = [], splitSlots = [], barIndex = 0) {
  const safeBarIndex = Math.max(0, Math.round(Number(barIndex) || 0));
  const normalizedSplits = new Set(normalizeMiniChordSplitSlots(splitSlots, safeBarIndex + 1));
  return Array.from({ length: MINI_CHORD_HALVES_PER_BAR }, (_, halfInBar) => {
    const halfIndex = safeBarIndex * MINI_CHORD_HALVES_PER_BAR + halfInBar;
    const primarySlotIndex = safeBarIndex * MINI_CHORD_SLOTS_PER_BAR + halfInBar * 2;
    const isSplit = normalizedSplits.has(halfIndex);
    const visibleSlotIndexes = isSplit
      ? [primarySlotIndex, primarySlotIndex + 1]
      : [primarySlotIndex];

    return {
      halfInBar,
      halfIndex,
      isSplit,
      playbackSlotIndexes: [primarySlotIndex, primarySlotIndex + 1],
      slots: visibleSlotIndexes.map((index, subslotIndex) => ({
        chord: String(slots[index] ?? "").trim(),
        index,
        playbackSlotIndexes: isSplit ? [index] : [primarySlotIndex, primarySlotIndex + 1],
        subslotIndex,
      })),
    };
  });
}
