import ko from "../i18n/locales/ko.js";
export const LICK_TECHNIQUES = Object.freeze({
  PICK: "pick",
  HAMMER_ON: "hammer-on",
  PULL_OFF: "pull-off",
  SLIDE: "slide",
  SLIDE_UP: "slide-up",
  SLIDE_DOWN: "slide-down",
  VIBRATO: "vibrato",
  BEND: "bend",
  BEND_RELEASE: "bend-release",
  MUTE: "mute",
  HARMONIC: "harmonic",
  REST: "rest",
});

export const LICK_RELATION_TECHNIQUES = new Set([
  LICK_TECHNIQUES.HAMMER_ON,
  LICK_TECHNIQUES.PULL_OFF,
  LICK_TECHNIQUES.SLIDE,
  LICK_TECHNIQUES.SLIDE_UP,
  LICK_TECHNIQUES.SLIDE_DOWN,
]);

const TECHNIQUE_ALIASES = {
  h: LICK_TECHNIQUES.HAMMER_ON,
  hammer: LICK_TECHNIQUES.HAMMER_ON,
  hammeron: LICK_TECHNIQUES.HAMMER_ON,
  p: LICK_TECHNIQUES.PULL_OFF,
  pull: LICK_TECHNIQUES.PULL_OFF,
  pulloff: LICK_TECHNIQUES.PULL_OFF,
  "/": LICK_TECHNIQUES.SLIDE_UP,
  "\\": LICK_TECHNIQUES.SLIDE_DOWN,
  vibrato: LICK_TECHNIQUES.VIBRATO,
  "~": LICK_TECHNIQUES.VIBRATO,
  bending: LICK_TECHNIQUES.BEND,
  release: LICK_TECHNIQUES.BEND_RELEASE,
  "bending-release": LICK_TECHNIQUES.BEND_RELEASE,
  x: LICK_TECHNIQUES.MUTE,
  "natural-harmonic": LICK_TECHNIQUES.HARMONIC,
  "natural-harmonics": LICK_TECHNIQUES.HARMONIC,
  "natural-harmonic-note": LICK_TECHNIQUES.HARMONIC,
  pause: LICK_TECHNIQUES.REST,
};

export function normalizeLickTechnique(technique) {
  const normalized = String(technique ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  return TECHNIQUE_ALIASES[normalized] ?? normalized;
}

export function isLickRestStep(step) {
  return Boolean(step?.rest) || normalizeLickTechnique(step?.technique) === LICK_TECHNIQUES.REST;
}

export function isLickMuteStep(step) {
  return Boolean(step?.mute) || normalizeLickTechnique(step?.technique) === LICK_TECHNIQUES.MUTE;
}

export function isLickHarmonicStep(step) {
  return Boolean(step?.harmonic) || normalizeLickTechnique(step?.technique) === LICK_TECHNIQUES.HARMONIC;
}

function isPlayableFrettedStep(step) {
  return !isLickRestStep(step)
    && Number.isFinite(Number(step?.stringNumber))
    && Number.isFinite(Number(step?.fretNumber));
}

function isValidRelation(technique, from, to) {
  if (!isPlayableFrettedStep(from) || !isPlayableFrettedStep(to)) return false;
  if (Number(from.stringNumber) !== Number(to.stringNumber)) return false;
  const fromFret = Number(from.fretNumber);
  const toFret = Number(to.fretNumber);
  if (fromFret === toFret) return false;

  if (technique === LICK_TECHNIQUES.HAMMER_ON || technique === LICK_TECHNIQUES.SLIDE_UP) {
    return fromFret < toFret;
  }
  if (technique === LICK_TECHNIQUES.PULL_OFF || technique === LICK_TECHNIQUES.SLIDE_DOWN) {
    return fromFret > toFret;
  }
  return technique === LICK_TECHNIQUES.SLIDE;
}

export function resolveLickTechniqueRelation(steps, techniqueIndex) {
  const list = Array.isArray(steps) ? steps : [];
  const step = list[techniqueIndex];
  const technique = normalizeLickTechnique(step?.technique);
  if (!LICK_RELATION_TECHNIQUES.has(technique)) return null;

  const previous = list[techniqueIndex - 1];
  const next = list[techniqueIndex + 1];
  const previousRelation = isValidRelation(technique, previous, step)
    ? { from: previous, fromIndex: techniqueIndex - 1, to: step, toIndex: techniqueIndex }
    : null;
  const nextRelation = isValidRelation(technique, step, next)
    ? { from: step, fromIndex: techniqueIndex, to: next, toIndex: techniqueIndex + 1 }
    : null;

  const relation = previousRelation ?? nextRelation;
  if (!relation) return null;
  const resolvedTechnique = technique === LICK_TECHNIQUES.SLIDE
    ? Number(relation.to.fretNumber) > Number(relation.from.fretNumber)
      ? LICK_TECHNIQUES.SLIDE_UP
      : LICK_TECHNIQUES.SLIDE_DOWN
    : technique;
  return { ...relation, technique: resolvedTechnique, techniqueIndex };
}

export function buildLickTechniqueRelations(steps) {
  const list = Array.isArray(steps) ? steps : [];
  return list.flatMap((step, index) => {
    const relation = resolveLickTechniqueRelation(list, index);
    return relation ? [relation] : [];
  });
}

export function getLickTechniqueSymbol(technique) {
  return {
    [LICK_TECHNIQUES.HAMMER_ON]: "h",
    [LICK_TECHNIQUES.PULL_OFF]: "p",
    [LICK_TECHNIQUES.SLIDE_UP]: "/",
    [LICK_TECHNIQUES.SLIDE_DOWN]: "\\",
  }[normalizeLickTechnique(technique)] ?? "";
}

export function getLickTechniqueLabel(technique) {
  return {
    [LICK_TECHNIQUES.PICK]: ko["etudes.picking"],
    [LICK_TECHNIQUES.HAMMER_ON]: ko["music.hammerOn"],
    [LICK_TECHNIQUES.PULL_OFF]: ko["etudes.pullOff"],
    [LICK_TECHNIQUES.SLIDE]: ko["etudes.slide"],
    [LICK_TECHNIQUES.SLIDE_UP]: ko["music.slideUp"],
    [LICK_TECHNIQUES.SLIDE_DOWN]: ko["music.slideDown"],
    [LICK_TECHNIQUES.VIBRATO]: ko["etudes.vibrato"],
    [LICK_TECHNIQUES.BEND]: ko["etudes.bending"],
    [LICK_TECHNIQUES.BEND_RELEASE]: ko["music.bendRelease"],
    [LICK_TECHNIQUES.MUTE]: ko["etudes.muted"],
    [LICK_TECHNIQUES.HARMONIC]: ko["music.naturalHarmonic"],
    [LICK_TECHNIQUES.REST]: ko["app.restApp"],
  }[normalizeLickTechnique(technique)] ?? "";
}

export function getLickBendAmountLabel(step) {
  const explicit = String(step?.bendAmount ?? step?.amount ?? "").trim();
  if (explicit) return explicit;
  const fret = Number(step?.fretNumber);
  const targetFret = Number(step?.targetFret ?? step?.bendTargetFret);
  if (!Number.isFinite(fret) || !Number.isFinite(targetFret)) return "Full";
  const semitones = Math.max(0, targetFret - fret);
  if (semitones === 1) return "1/2";
  if (semitones === 2) return "Full";
  if (semitones === 3) return "1 1/2";
  return semitones > 0 ? `${semitones / 2}` : "Full";
}
