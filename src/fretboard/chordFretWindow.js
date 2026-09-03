export const HIGH_CHORD_FRET_MARGIN = 1;

const stableWindowCache = new Map();

function getStableWindow(startFret, endFret, isHighChord) {
  const key = `${isHighChord ? "high" : "open"}:${startFret}:${endFret}`;
  const cached = stableWindowCache.get(key);
  if (cached) return cached;

  const visualStartFret = Math.max(1, startFret);
  const window = Object.freeze({
    displayFrets: Object.freeze(Array.from(
      { length: Math.max(1, endFret - visualStartFret + 1) },
      (_, index) => visualStartFret + index,
    )),
    endFret,
    fretRange: Object.freeze([startFret, endFret]),
    isHighChord,
    key,
    startFret,
  });
  stableWindowCache.set(key, window);
  return window;
}

function normalizeFallbackRange(fallback) {
  const values = Array.isArray(fallback)
    ? fallback.map(Number).filter(Number.isFinite)
    : [];
  if (!values.length) return [0, 3];
  const startFret = Math.max(0, Math.round(Math.min(...values)));
  const endFret = Math.max(startFret + 1, Math.round(Math.max(...values)));
  return [startFret, endFret];
}

function getPlayedFrets(notes, barres) {
  return [
    ...(Array.isArray(notes) ? notes : []).map((note) => Number(note?.fretNumber ?? note?.fret)),
    ...(Array.isArray(barres) ? barres : []).map((barre) => Number(barre?.fret)),
  ].filter((fret) => Number.isFinite(fret) && fret > 0);
}

function hasOpenString(notes, stringStates) {
  if ((Array.isArray(notes) ? notes : []).some((note) => Number(note?.fretNumber ?? note?.fret) === 0)) {
    return true;
  }
  return Object.values(stringStates ?? {}).some((state) => ["0", "o"].includes(String(state).toLowerCase()));
}

export function getChordFretWindow({
  barres = [],
  fallback = [0, 3],
  notes = [],
  stringStates = {},
} = {}) {
  const playedFrets = getPlayedFrets(notes, barres);
  if (!playedFrets.length) {
    const [fallbackStart, fallbackEnd] = normalizeFallbackRange(fallback);
    return getStableWindow(fallbackStart, fallbackEnd, false);
  }

  const minFret = Math.min(...playedFrets);
  const maxFret = Math.max(...playedFrets);
  const isHighChord = !hasOpenString(notes, stringStates);

  if (isHighChord) {
    return getStableWindow(
      Math.max(1, minFret - HIGH_CHORD_FRET_MARGIN),
      maxFret + HIGH_CHORD_FRET_MARGIN,
      true,
    );
  }

  return getStableWindow(0, Math.max(3, maxFret), false);
}
