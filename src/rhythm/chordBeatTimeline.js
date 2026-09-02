export const RHYTHM_CHORD_BEAT_LENGTHS = Object.freeze([1, 2, 4]);
export const RHYTHM_CHORD_REST_ID = "rhythm-chord-rest";

export function isRhythmChordRest(chord) {
  return Boolean(chord?.isRest || chord?.id === RHYTHM_CHORD_REST_ID);
}

export function normalizeRhythmChordBeatLength(value) {
  const numericValue = Number(value);
  return RHYTHM_CHORD_BEAT_LENGTHS.includes(numericValue) ? numericValue : 4;
}

export function getRhythmChordBeatLabel(value) {
  const numericValue = Number(value);
  const displayBeatLength = Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : normalizeRhythmChordBeatLength(value);
  return `${displayBeatLength}박`;
}

function createAutomaticRest(beatLength, startBeat) {
  return {
    beatLength,
    chord: {
      beatLength,
      displayName: "자동 쉼",
      id: `${RHYTHM_CHORD_REST_ID}-auto-${startBeat}`,
      isAutoRest: true,
      isRest: true,
    },
    endBeat: startBeat + beatLength,
    index: -1,
    isAutoRest: true,
    isContinuation: false,
    isRest: true,
    sourceBeatLength: beatLength,
    sourceBeatOffset: 0,
    startBeat,
  };
}

export function createRhythmChordBeatTimeline(progression = [], beatsPerMeasure = 4) {
  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  let beatCursor = 0;
  const items = [];
  (Array.isArray(progression) ? progression : []).forEach((chord, index) => {
    const beatLength = normalizeRhythmChordBeatLength(chord?.beatLength);
    const beatInMeasure = beatCursor % safeBeatsPerMeasure;
    const remainingBeats = beatInMeasure === 0
      ? safeBeatsPerMeasure
      : safeBeatsPerMeasure - beatInMeasure;
    if (beatInMeasure > 0 && beatLength > remainingBeats) {
      items.push(createAutomaticRest(remainingBeats, beatCursor));
      beatCursor += remainingBeats;
    }
    let sourceBeatOffset = 0;
    while (sourceBeatOffset < beatLength) {
      const segmentBeatInMeasure = beatCursor % safeBeatsPerMeasure;
      const segmentRemainingBeats = segmentBeatInMeasure === 0
        ? safeBeatsPerMeasure
        : safeBeatsPerMeasure - segmentBeatInMeasure;
      const segmentBeatLength = Math.min(
        beatLength - sourceBeatOffset,
        segmentRemainingBeats,
      );
      const item = {
        beatLength: segmentBeatLength,
        chord,
        endBeat: beatCursor + segmentBeatLength,
        index,
        isAutoRest: false,
        isContinuation: sourceBeatOffset > 0,
        isRest: isRhythmChordRest(chord),
        sourceBeatLength: beatLength,
        sourceBeatOffset,
        startBeat: beatCursor,
      };
      items.push(item);
      beatCursor += segmentBeatLength;
      sourceBeatOffset += segmentBeatLength;
    }
  });

  const finalBeatInMeasure = beatCursor % safeBeatsPerMeasure;
  if (items.length && finalBeatInMeasure > 0) {
    const finalRestBeats = safeBeatsPerMeasure - finalBeatInMeasure;
    items.push(createAutomaticRest(finalRestBeats, beatCursor));
    beatCursor += finalRestBeats;
  }

  return {
    beatsPerMeasure: safeBeatsPerMeasure,
    cycleBeats: beatCursor,
    items,
  };
}

export function getRhythmChordItemAtBeat(timeline, absoluteBeat = 0) {
  const items = Array.isArray(timeline?.items) ? timeline.items : [];
  const cycleBeats = Number(timeline?.cycleBeats) || 0;
  if (!items.length || cycleBeats <= 0) return null;

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
      return item;
    }
  }

  return items.at(-1) ?? null;
}

export function getRhythmChordIndexAtBeat(timeline, absoluteBeat = 0) {
  return getRhythmChordItemAtBeat(timeline, absoluteBeat)?.index ?? 0;
}

export function getRhythmChordStartBeat(timeline, progressionIndex = 0) {
  const safeProgressionIndex = Number(progressionIndex);
  return timeline?.items?.find(
    (item) => !item.isAutoRest && item.index === safeProgressionIndex,
  )?.startBeat ?? 0;
}

export function muteRhythmChordRestEvents(events = [], timeline = null, beatSeconds = 0) {
  const safeBeatSeconds = Number(beatSeconds);
  if (!Array.isArray(events) || !Number.isFinite(safeBeatSeconds) || safeBeatSeconds <= 0) {
    return Array.isArray(events) ? events : [];
  }
  const restRanges = (timeline?.items ?? [])
    .filter((item) => item.isRest)
    .map((item) => ({
      end: item.endBeat * safeBeatSeconds,
      start: item.startBeat * safeBeatSeconds,
    }));
  if (!restRanges.length) return events;

  return events.flatMap((event) => {
    const offsetSeconds = Number(event?.offsetSeconds);
    if (!Number.isFinite(offsetSeconds)) return [];
    const startsInsideRest = restRanges.some(
      (range) => offsetSeconds >= range.start - 1e-9 && offsetSeconds < range.end - 1e-9,
    );
    if (startsInsideRest) return [];

    const duration = Number(event?.duration);
    if (!Number.isFinite(duration) || duration <= 0) return [event];
    const nextRest = restRanges.find(
      (range) => range.start > offsetSeconds + 1e-9 && range.start < offsetSeconds + duration - 1e-9,
    );
    if (!nextRest) return [event];
    return [{
      ...event,
      duration: nextRest.start - offsetSeconds,
    }];
  });
}

export function clampRhythmChordMelodicEvents(events = [], timeline = null, beatSeconds = 0) {
  const safeBeatSeconds = Number(beatSeconds);
  if (!Array.isArray(events) || !Number.isFinite(safeBeatSeconds) || safeBeatSeconds <= 0) {
    return Array.isArray(events) ? events : [];
  }
  return events.map((event) => {
    if (event?.instrument !== "bass" && event?.instrument !== "piano") return event;
    const offsetSeconds = Number(event?.offsetSeconds);
    const duration = Number(event?.duration);
    if (!Number.isFinite(offsetSeconds) || !Number.isFinite(duration) || duration <= 0) return event;
    const item = getRhythmChordItemAtBeat(timeline, offsetSeconds / safeBeatSeconds);
    if (!item) return event;
    const boundarySeconds = item.endBeat * safeBeatSeconds;
    const remainingSeconds = boundarySeconds - offsetSeconds - 0.004;
    if (remainingSeconds >= duration) return event;
    return {
      ...event,
      duration: Math.max(0.001, remainingSeconds),
      clippedAtRhythmChordBoundary: true,
    };
  });
}

function getRhythmChordPlaybackSlotBeats(timeline, beatsPerMeasure) {
  const requiresOneBeatSlots = timeline.items.some(
    (item) => item.beatLength % 2 !== 0,
  );
  return requiresOneBeatSlots || beatsPerMeasure % 2 !== 0 ? 1 : 2;
}

export function expandRhythmChordPlaybackSlots(progression = [], beatsPerMeasure = 4) {
  const safeProgression = Array.isArray(progression) ? progression : [];
  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  if (
    !safeProgression.length
    || safeProgression.some((chord) => Number.isInteger(chord?.miniChordSlotIndex))
    || !safeProgression.every((chord) => chord && typeof chord === "object" && "beatLength" in chord)
  ) {
    return {
      expandedProgression: safeProgression,
      isRhythmChordTimeline: false,
      playbackCycleBeats: null,
      playbackSlotBeats: null,
      playbackSlotsPerMeasure: null,
      timeline: null,
    };
  }

  const timeline = createRhythmChordBeatTimeline(safeProgression, safeBeatsPerMeasure);
  const playbackSlotBeats = getRhythmChordPlaybackSlotBeats(
    timeline,
    safeBeatsPerMeasure,
  );
  const playbackSlotsPerMeasure = safeBeatsPerMeasure / playbackSlotBeats;
  const expandedProgression = [];
  timeline.items.forEach((item) => {
    const chord = item.chord;
    const rhythmChordIndex = item.index;
    const rhythmChordBeatLength = item.sourceBeatLength;
    const slotCount = item.beatLength / playbackSlotBeats;
    for (let slotOffset = 0; slotOffset < slotCount; slotOffset += 1) {
      const miniChordSlotIndex = expandedProgression.length;
      expandedProgression.push({
        ...chord,
        beatLength: rhythmChordBeatLength,
        isAutoRest: item.isAutoRest,
        isContinuation: item.isContinuation,
        isRest: item.isRest,
        miniChordSlotHasExplicitChord: !item.isRest && !item.isContinuation && slotOffset === 0,
        miniChordSlotInBar: miniChordSlotIndex % playbackSlotsPerMeasure,
        miniChordSlotIndex,
        rhythmChordBeatLength,
        rhythmChordIndex,
        rhythmChordSlotOffset: item.sourceBeatOffset / playbackSlotBeats + slotOffset,
      });
    }
  });

  return {
    expandedProgression,
    isRhythmChordTimeline: true,
    playbackCycleBeats: timeline.cycleBeats,
    playbackSlotBeats,
    playbackSlotsPerMeasure,
    timeline,
  };
}

export function getRhythmChordPlaybackPosition({
  audioTime = 0,
  beatSeconds = 0,
  beatsPerMeasure = 4,
  displayStartTime = 0,
  timeline = null,
} = {}) {
  const safeBeatSeconds = Number(beatSeconds);
  const cycleBeats = Number(timeline?.cycleBeats) || 0;
  if (!Number.isFinite(safeBeatSeconds) || safeBeatSeconds <= 0 || cycleBeats <= 0) {
    return null;
  }

  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  const elapsedSeconds = Math.max(0, Number(audioTime) - Number(displayStartTime));
  const absoluteBeat = elapsedSeconds / safeBeatSeconds;
  const absoluteBeatIndex = Math.floor(absoluteBeat);
  const cycleBeat = ((absoluteBeat % cycleBeats) + cycleBeats) % cycleBeats;
  const beatInMeasure = absoluteBeatIndex % safeBeatsPerMeasure;
  const currentItem = getRhythmChordItemAtBeat(timeline, absoluteBeat);

  return {
    absoluteBeat,
    absoluteBeatIndex,
    beatInMeasure,
    chordIndex: currentItem?.index ?? 0,
    cycleBeat,
    elapsedSeconds,
    isAutoRest: Boolean(currentItem?.isAutoRest),
    isRest: Boolean(currentItem?.isRest),
    measureProgress: (absoluteBeat % safeBeatsPerMeasure) / safeBeatsPerMeasure,
  };
}

export function groupRhythmChordProgressionMeasures(progression = [], beatsPerMeasure = 4) {
  const safeBeatsPerMeasure = Math.max(1, Math.round(Number(beatsPerMeasure) || 4));
  const timeline = createRhythmChordBeatTimeline(progression, safeBeatsPerMeasure);
  const measures = [];
  timeline.items.forEach((item) => {
    const measureIndex = Math.floor(item.startBeat / safeBeatsPerMeasure);
    while (measures.length <= measureIndex) {
      measures.push({ autoRestBeats: 0, beatLength: 0, items: [], measureIndex: measures.length });
    }
    const measure = measures[measureIndex];
    measure.beatLength += item.beatLength;
    if (item.isAutoRest) {
      measure.autoRestBeats += item.beatLength;
      measure.items.push({
        beatLength: item.beatLength,
        chord: item.chord,
        endBeat: item.endBeat,
        index: item.index,
        isAutoRest: true,
        isRest: true,
        startBeat: item.startBeat,
      });
      return;
    }
    if (item.isContinuation) return;
    measure.items.push({
      beatLength: item.sourceBeatLength,
      chord: item.chord,
      endBeat: item.endBeat,
      index: item.index,
      isAutoRest: false,
      isRest: item.isRest,
      startBeat: item.startBeat,
    });
  });

  return measures;
}
