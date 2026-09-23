import ko from "../i18n/locales/ko.js";
export const METRONOME_SUBDIVISION_OPTIONS = Object.freeze([
  Object.freeze({
    id: "quarter",
    label: "♩",
    longLabel: ko["metronome.quarterNotes1PerBeat"],
    clicksPerBeat: 1,
  }),
  Object.freeze({
    id: "eighth",
    label: "♪♪",
    longLabel: ko["metronome.eighthNotes2PerBeat"],
    clicksPerBeat: 2,
  }),
  Object.freeze({
    id: "eighth-triplet",
    label: null,
    longLabel: ko["metronome.eighthNoteTriplets3PerBeat"],
    notation: "eighth-triplet",
    clicksPerBeat: 3,
  }),
  Object.freeze({
    id: "sixteenth",
    label: "♬♬",
    longLabel: ko["metronome.sixteenthNotes4PerBeat"],
    clicksPerBeat: 4,
  }),
  Object.freeze({
    id: "sixteenth-triplet",
    label: null,
    longLabel: ko["metronome.sixteenthNoteTriplets6PerBeat"],
    notation: "sixteenth-triplet",
    clicksPerBeat: 6,
  }),
]);

export function getMetronomeSubdivisionOption(id) {
  return METRONOME_SUBDIVISION_OPTIONS.find((option) => option.id === id)
    ?? METRONOME_SUBDIVISION_OPTIONS[0];
}

export function getMetronomeSubdivisionTickMs(bpm, subdivision) {
  const beatsPerMinute = Number(bpm);
  const safeBpm = Number.isFinite(beatsPerMinute) && beatsPerMinute > 0
    ? beatsPerMinute
    : 80;
  const clicksPerBeat = Math.max(1, Number(subdivision?.clicksPerBeat) || 1);
  return 60000 / safeBpm / clicksPerBeat;
}
