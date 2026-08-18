function normalizeSlotsPerBar(value) {
  return Math.max(1, Math.round(Number(value) || 1));
}

export function getMiniChordPlaybackBarIndex(slotIndex, slotsPerBar = 2) {
  const safeSlotIndex = Math.max(0, Math.round(Number(slotIndex) || 0));
  return Math.floor(safeSlotIndex / normalizeSlotsPerBar(slotsPerBar));
}

export function getMiniChordBeatInBar(slotInBar = 0, beatInSlot = 0, beatsPerSlot = 2) {
  const safeSlotInBar = Math.max(0, Math.round(Number(slotInBar) || 0));
  const safeBeatInSlot = Math.max(0, Math.round(Number(beatInSlot) || 0));
  const safeBeatsPerSlot = Math.max(1, Math.round(Number(beatsPerSlot) || 1));
  return safeSlotInBar * safeBeatsPerSlot + safeBeatInSlot;
}

export function shouldScheduleMiniChordDrumsForSlot(slotInBar = 0) {
  return Math.max(0, Math.round(Number(slotInBar) || 0)) === 0;
}

/**
 * Keep the visual playhead on the same source slots that were compiled into
 * the audio session. Rebuilding this sequence outside the session can drift
 * when playback contains repeats, jumps, or is replaced while it is running.
 */
export function createMiniChordSessionPlaybackPlan(progression = [], slotsPerBar = 2) {
  if (!Array.isArray(progression) || !progression.length) {
    return { barSequence: [], slotSequence: [] };
  }

  const safeSlotsPerBar = normalizeSlotsPerBar(slotsPerBar);
  const slotSequence = progression.map((chord) => {
    const slotIndex = Number(chord?.miniChordSlotIndex);
    return Number.isInteger(slotIndex) && slotIndex >= 0 ? slotIndex : null;
  });

  if (slotSequence.some((slotIndex) => slotIndex == null)) {
    return { barSequence: [], slotSequence: [] };
  }

  return {
    slotSequence,
    barSequence: slotSequence.map((slotIndex) => (
      getMiniChordPlaybackBarIndex(slotIndex, safeSlotsPerBar)
    )),
  };
}

export function findMiniChordPlaybackSequenceIndexForBar(playbackPlan = {}, barIndex = 0) {
  const safeBarIndex = Math.max(0, Math.round(Number(barIndex) || 0));
  const barSequence = Array.isArray(playbackPlan?.barSequence)
    ? playbackPlan.barSequence
    : [];
  return barSequence.findIndex((sourceBarIndex) => sourceBarIndex === safeBarIndex);
}

/**
 * Resolve the exact chord attached to every playback slot. Empty slots keep
 * the previous chord, while an explicitly entered chord changes immediately
 * at the front/back slot boundary.
 */
export function createMiniChordSlotChordPlan(slots = [], slotSequence = null, slotsPerBar = 2) {
  if (!Array.isArray(slots) || !slots.length) return [];

  const safeSlotsPerBar = normalizeSlotsPerBar(slotsPerBar);
  const playbackSlots = Array.isArray(slotSequence) && slotSequence.length
    ? slotSequence
    : Array.from({ length: slots.length }, (_, index) => index);
  let activeChordLabel = "";

  return playbackSlots.map((slotIndex, sequenceIndex) => {
    const safeSlotIndex = Math.max(
      0,
      Math.min(slots.length - 1, Math.round(Number(slotIndex) || 0)),
    );
    const slotChordLabel = String(slots[safeSlotIndex] ?? "").trim();
    if (slotChordLabel) activeChordLabel = slotChordLabel;

    return {
      barIndex: getMiniChordPlaybackBarIndex(safeSlotIndex, safeSlotsPerBar),
      hasExplicitChord: Boolean(slotChordLabel),
      sequenceIndex,
      slotIndex: safeSlotIndex,
      slotInBar: safeSlotIndex % safeSlotsPerBar,
      sourceChordLabel: activeChordLabel,
    };
  });
}

/**
 * Derive the visual position directly from the Web Audio clock. Keeping this
 * calculation pure prevents timer/rAF drift from accumulating across a song.
 */
export function getMiniChordPlaybackVisualPosition({
  audioTime = 0,
  displayStartTime = 0,
  playbackPlan = {},
  stepSeconds = 0,
  cycleSeconds = 0,
} = {}) {
  const slotSequence = Array.isArray(playbackPlan?.slotSequence)
    ? playbackPlan.slotSequence
    : [];
  if (!slotSequence.length || !Number.isFinite(stepSeconds) || stepSeconds <= 0) return null;

  const safeCycleSeconds = Number.isFinite(cycleSeconds) && cycleSeconds > 0
    ? cycleSeconds
    : slotSequence.length * stepSeconds;
  const elapsedSeconds = Math.max(0, Number(audioTime) - Number(displayStartTime));
  const cycleElapsedSeconds = safeCycleSeconds > 0 ? elapsedSeconds % safeCycleSeconds : 0;
  const sequenceIndex = Math.max(
    0,
    Math.min(slotSequence.length - 1, Math.floor(cycleElapsedSeconds / stepSeconds)),
  );
  const slotIndex = Math.max(0, Math.round(Number(slotSequence[sequenceIndex]) || 0));
  const plannedBarIndex = Array.isArray(playbackPlan?.barSequence)
    ? playbackPlan.barSequence[sequenceIndex]
    : null;
  const stepElapsedSeconds = cycleElapsedSeconds - sequenceIndex * stepSeconds;

  return {
    barIndex: Number.isInteger(plannedBarIndex) && plannedBarIndex >= 0
      ? plannedBarIndex
      : getMiniChordPlaybackBarIndex(slotIndex),
    cycleElapsedSeconds,
    elapsedSeconds,
    progress: Math.max(0, Math.min(1, stepElapsedSeconds / stepSeconds)),
    sequenceIndex,
    slotIndex,
  };
}
