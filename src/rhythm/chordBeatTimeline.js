export const RHYTHM_CHORD_BEAT_LENGTHS = Object.freeze([2, 4]);

export function normalizeRhythmChordBeatLength(value) {
  return Number(value) === 2 ? 2 : 4;
}

export function getRhythmChordBeatLabel(value) {
  return `${normalizeRhythmChordBeatLength(value)}박`;
}

export function createRhythmChordBeatTimeline(progression = []) {
  let beatCursor = 0;
  const items = (Array.isArray(progression) ? progression : []).map((chord, index) => {
    const beatLength = normalizeRhythmChordBeatLength(chord?.beatLength);
    const item = {
      beatLength,
      chord,
      endBeat: beatCursor + beatLength,
      index,
      startBeat: beatCursor,
    };
    beatCursor += beatLength;
    return item;
  });

  return {
    cycleBeats: beatCursor,
    items,
  };
}

export function getRhythmChordIndexAtBeat(timeline, absoluteBeat = 0) {
  const items = Array.isArray(timeline?.items) ? timeline.items : [];
  const cycleBeats = Number(timeline?.cycleBeats) || 0;
  if (!items.length || cycleBeats <= 0) return 0;

  const rawBeat = Number(absoluteBeat) || 0;
  const cycleBeat = ((rawBeat % cycleBeats) + cycleBeats) % cycleBeats;
  let low = 0;
  let high = items.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const item = items[middle];
    if (cycleBeat < item.startBeat) {
      high = middle - 1;
    } else if (cycleBeat >= item.endBeat) {
      low = middle + 1;
    } else {
      return item.index;
    }
  }

  return items.at(-1)?.index ?? 0;
}

export function expandRhythmChordPlaybackSlots(progression = [], beatsPerMeasure = 4) {
  const safeProgression = Array.isArray(progression) ? progression : [];
  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  if (
    safeBeatsPerMeasure !== 4
    || !safeProgression.length
    || safeProgression.some((chord) => Number.isInteger(chord?.miniChordSlotIndex))
    || !safeProgression.every((chord) => chord && typeof chord === "object" && "beatLength" in chord)
  ) {
    return {
      expandedProgression: safeProgression,
      isRhythmChordTimeline: false,
      timeline: null,
    };
  }

  const timeline = createRhythmChordBeatTimeline(safeProgression);
  const expandedProgression = [];
  safeProgression.forEach((chord, rhythmChordIndex) => {
    const slotCount = normalizeRhythmChordBeatLength(chord.beatLength) / 2;
    for (let slotOffset = 0; slotOffset < slotCount; slotOffset += 1) {
      const miniChordSlotIndex = expandedProgression.length;
      expandedProgression.push({
        ...chord,
        miniChordSlotHasExplicitChord: slotOffset === 0,
        miniChordSlotInBar: miniChordSlotIndex % 2,
        miniChordSlotIndex,
        rhythmChordIndex,
      });
    }
  });

  return {
    expandedProgression,
    isRhythmChordTimeline: true,
    timeline,
  };
}

export function groupRhythmChordProgressionMeasures(progression = [], beatsPerMeasure = 4) {
  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  const measures = [];
  let currentMeasure = null;
  let beatCursor = 0;

  (Array.isArray(progression) ? progression : []).forEach((chord, index) => {
    const beatLength = normalizeRhythmChordBeatLength(chord?.beatLength);
    const measureIndex = Math.floor(beatCursor / safeBeatsPerMeasure);
    if (!currentMeasure || currentMeasure.measureIndex !== measureIndex) {
      currentMeasure = { beatLength: 0, items: [], measureIndex };
      measures.push(currentMeasure);
    }
    currentMeasure.items.push({ beatLength, chord, index });
    currentMeasure.beatLength += beatLength;
    beatCursor += beatLength;
  });

  return measures;
}
