export const METRONOME_SUBDIVISION_OPTIONS = Object.freeze([
  Object.freeze({
    id: "quarter",
    label: "♩",
    longLabel: "4분음표 — 1박당 1회",
    clicksPerBeat: 1,
  }),
  Object.freeze({
    id: "eighth",
    label: "♪♪",
    longLabel: "8분음표 — 1박당 2회",
    clicksPerBeat: 2,
  }),
  Object.freeze({
    id: "eighth-triplet",
    label: null,
    longLabel: "8분 셋잇단음표 — 1박당 3회",
    notation: "eighth-triplet",
    clicksPerBeat: 3,
  }),
  Object.freeze({
    id: "sixteenth",
    label: "♬♬",
    longLabel: "16분음표 — 1박당 4회",
    clicksPerBeat: 4,
  }),
  Object.freeze({
    id: "sixteenth-triplet",
    label: null,
    longLabel: "16분 셋잇단음표 — 1박당 6회",
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
