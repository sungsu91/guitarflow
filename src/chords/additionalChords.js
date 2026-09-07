// Additive vocabulary only. Existing App.jsx templates and ranking stay intact.
// strings: [string number, root-relative fret, finger]. Standard tuning, 6 -> 1.
const grip = (id, rootString, strings, options = {}) => {
  const groups = new Map();
  for (const [s, fret, finger] of strings) {
    const key = `${fret}:${finger}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const barres = [...groups].filter(([, strings]) => strings.length > 1).map(([key, strings]) => {
    const [offset, label] = key.split(":");
    return { fretOffset: Number(offset), fromString: Math.max(...strings), toString: Math.min(...strings), label, minBaseFret: 1 - Number(offset) };
  });
  return { id, rootString, strings, barres, ...options };
};

export const NEW_CHORD_FORMULAS = {
  major: {
    "5": { intervals: [0, 7], degrees: [0, 4] },
    add2: { intervals: [0, 2, 4, 7], degrees: [0, 1, 2, 4] },
    add11: { intervals: [0, 4, 7, 17], degrees: [0, 2, 4, 3] },
    maj11: { intervals: [0, 4, 7, 11, 14, 17], degrees: [0, 2, 4, 6, 1, 3] },
    maj13: { intervals: [0, 4, 7, 11, 14, 17, 21], degrees: [0, 2, 4, 6, 1, 3, 5] },
    "11": { intervals: [0, 4, 7, 10, 14, 17], degrees: [0, 2, 4, 6, 1, 3] },
    "13": { intervals: [0, 4, 7, 10, 14, 17, 21], degrees: [0, 2, 4, 6, 1, 3, 5] },
    "7b5": { intervals: [0, 4, 6, 10], degrees: [0, 2, 4, 6] },
    "7#5": { intervals: [0, 4, 8, 10], degrees: [0, 2, 4, 6] },
    "7b9": { intervals: [0, 4, 7, 10, 13], degrees: [0, 2, 4, 6, 1] },
    "7#9": { intervals: [0, 4, 7, 10, 15], degrees: [0, 2, 4, 6, 1] },
  },
  minor: {
    m11: { intervals: [0, 3, 7, 10, 14, 17], degrees: [0, 2, 4, 6, 1, 3] },
    m13: { intervals: [0, 3, 7, 10, 14, 17, 21], degrees: [0, 2, 4, 6, 1, 3, 5] },
  },
  dim: { dim7: { intervals: [0, 3, 6, 9], degrees: [0, 2, 4, 6] } },
};

export function getAdditionalTheory(quality, property) {
  return Object.fromEntries(Object.entries(NEW_CHORD_FORMULAS[quality] ?? {})
    .map(([extension, definition]) => [extension, Object.freeze([...definition[property]])]));
}

// Omission permission belongs to the chord type, never to an ease-of-grip score.
// Omit 11 first; the unaltered fifth may also be omitted. Keep 9 and 13.
export const CHORD_OMISSION_POLICIES = {
  major: {
    "13": { required: [0, 4, 10, 14, 21], allowed: [[17], [7, 17]] },
    maj13: { required: [0, 4, 11, 14, 21], allowed: [[17], [7, 17]] },
  },
  minor: {
    m13: { required: [0, 3, 10, 14, 21], allowed: [[17], [7, 17]] },
  },
};

export function isPermittedChordOmission(quality, extension, omitted) {
  const policy = CHORD_OMISSION_POLICIES[quality]?.[extension];
  if (!policy) return omitted.length === 0;
  return !omitted.some((interval) => policy.required.includes(interval)) &&
    policy.allowed.some((allowed) => allowed.length === omitted.length && allowed.every((interval) => omitted.includes(interval)));
}

// "full" below means six sounding strings; completeness is recorded separately.
const thirteenth = (id, seventhOffset, thirdOffset) => [
  grip(`full-${id}`, 6, [[6, 0, "1"], [5, 2, "3"], [4, seventhOffset, seventhOffset === 0 ? "1" : "2"], [3, thirdOffset, thirdOffset === 0 ? "1" : "2"], [2, 2, "4"], [1, 2, "4"]], {
    omittedIntervals: [17], omissionReason: "6현 정석 13 보이싱 · 11도 생략 · 1·3·5·7·9·13 보존",
  }),
  grip(`shell-${id}`, 6, [[6, 0, "1"], [4, seventhOffset, seventhOffset === 0 ? "1" : "2"], [3, thirdOffset, thirdOffset === 0 ? "1" : "2"], [2, 2, "3"], [1, 2, "3"]], {
    priority: 10, omittedIntervals: [7, 17], omissionReason: "정석 13 보이싱 · 5·11도 생략 · 1·3·7·9·13 보존",
  }),
];

export const ADDITIONAL_CHORD_SHAPES = {
  major: {
    "5": [
      grip("e-power", 6, [[6, 0, "1"], [5, 2, "3"], [4, 2, "4"]]),
      grip("a-power", 5, [[5, 0, "1"], [4, 2, "3"], [3, 2, "4"]]),
    ],
    add2: [
      grip("c-add2", 5, [[5, 0, "4"], [4, -3, "1"], [3, -3, "1"], [2, -2, "2"], [1, -3, "1"]], { minBaseFret: 3, register: "second-above-bass-root" }),
      grip("g-add2", 6, [[6, 0, "3"], [5, -3, "1"], [4, -3, "1"], [3, -3, "1"], [2, -3, "1"], [1, 0, "4"]], { minBaseFret: 3, register: "second-above-bass-root" }),
    ],
    add11: [
      grip("e-add11", 6, [[6, 0, "1"], [5, 0, "1"], [4, 2, "3"], [3, 1, "2"], [2, 0, "1"], [1, 0, "1"]]),
      grip("c-add11", 5, [[5, 0, "3"], [4, 0, "3"], [3, -3, "1"], [2, -2, "2"], [1, -3, "1"]], { minBaseFret: 3 }),
    ],
    maj11: [grip("full-emaj11", 6, [[6, 0, "1"], [5, 0, "1"], [4, 1, "2"], [3, 1, "2"], [2, 0, "1"], [1, 2, "3"]])],
    "11": [grip("full-e11", 6, [[6, 0, "1"], [5, 0, "1"], [4, 0, "1"], [3, 1, "2"], [2, 0, "1"], [1, 2, "3"]])],
    "13": [
      grip("a13", 5, [[5, 0, "2"], [4, -1, "1"], [3, 0, "3"], [2, 0, "3"], [1, 2, "4"]], {
        minBaseFret: 1, omittedIntervals: [7, 17], omissionReason: "정석 13 보이싱 · 5·11도 생략 · 1·3·7·9·13 보존",
      }),
      ...thirteenth("e13", 0, 1),
    ],
    maj13: thirteenth("emaj13", 1, 1),
    "7b5": [
      grip("a-seven-flat-five", 5, [[5, 0, "1"], [4, 1, "2"], [3, 0, "1"], [2, 2, "3"]]),
      grip("e-seven-flat-five", 6, [[6, 0, "2"], [4, 0, "3"], [3, 1, "4"], [2, -1, "1"]], { minBaseFret: 1 }),
    ],
    "7#5": [
      grip("a-seven-sharp-five", 5, [[5, 0, "1"], [4, 3, "4"], [3, 0, "1"], [2, 2, "3"]]),
      grip("e-seven-sharp-five", 6, [[6, 0, "1"], [4, 0, "1"], [3, 1, "2"], [2, 1, "2"], [1, 0, "1"]]),
    ],
    "7b9": [
      grip("e-seven-flat-nine", 6, [[6, 0, "1"], [5, 2, "3"], [4, 0, "1"], [3, 1, "2"], [2, 0, "1"], [1, 1, "4"]]),
      grip("a-seven-flat-nine", 5, [[5, 0, "2"], [4, -1, "1"], [3, 0, "3"], [2, -1, "1"], [1, 0, "4"]], { minBaseFret: 1 }),
    ],
    "7#9": [
      grip("e-seven-sharp-nine", 6, [[6, 0, "1"], [5, 2, "3"], [4, 0, "1"], [3, 1, "2"], [2, 3, "4"], [1, 3, "4"]]),
      grip("a-seven-sharp-nine", 5, [[5, 0, "2"], [4, -1, "1"], [3, 0, "3"], [2, 1, "4"], [1, 0, "3"]], { minBaseFret: 1 }),
    ],
    // These formulas already existed; only their missing guitar data is supplied.
    "6/9": [
      grip("a-six-nine", 5, [[5, 0, "2"], [4, -1, "1"], [3, -1, "1"], [2, 0, "3"], [1, 0, "3"]], { minBaseFret: 1 }),
      grip("e-six-nine", 6, [[6, 0, "2"], [5, -1, "1"], [4, -1, "1"], [3, -1, "1"], [2, 0, "3"]], { minBaseFret: 1 }),
    ],
  },
  minor: {
    m11: [grip("full-em11", 6, [[6, 0, "1"], [5, 0, "1"], [4, 0, "1"], [3, 0, "1"], [2, 0, "1"], [1, 2, "3"]])],
    m13: [
      grip("am13", 5, [[5, 0, "2"], [4, -2, "1"], [3, 0, "3"], [2, 0, "3"], [1, 2, "4"]], {
        minBaseFret: 2, omittedIntervals: [7, 17], omissionReason: "정석 m13 보이싱 · 5·11도 생략 · 1·♭3·♭7·9·13 보존",
      }),
      ...thirteenth("em13", 0, 0),
    ],
    m7b5: [
      grip("a-half-diminished", 5, [[5, 0, "1"], [4, 1, "3"], [3, 0, "2"], [2, 1, "4"]]),
      grip("e-half-diminished", 6, [[6, 0, "2"], [4, 0, "3"], [3, 0, "3"], [2, -1, "1"]], { minBaseFret: 1 }),
    ],
  },
  dim: { dim7: [
    grip("a-diminished-seven", 5, [[5, 0, "2"], [4, 1, "3"], [3, -1, "1"], [2, 1, "4"]], { minBaseFret: 1 }),
    grip("e-diminished-seven", 6, [[6, 0, "2"], [4, -1, "1"], [3, 0, "3"], [2, -1, "1"]], { minBaseFret: 1 }),
  ] },
};

export function isAdditionalChord(quality, extension) {
  return Boolean(ADDITIONAL_CHORD_SHAPES[quality]?.[extension]);
}

export function spellAdditionalChordTone(displayRoot, interval, degreeOffset) {
  const letters = "CDEFGAB";
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const rootAlteration = [...displayRoot.slice(1)].reduce((sum, mark) => sum + (mark === "#" ? 1 : -1), 0);
  const letter = letters[(letters.indexOf(displayRoot[0]) + degreeOffset) % 7];
  const pitchClass = (natural[displayRoot[0]] + rootAlteration + interval + 12) % 12;
  const difference = ((pitchClass - natural[letter] + 18) % 12) - 6;
  return letter + (difference >= 0 ? "#".repeat(difference) : "b".repeat(-difference));
}

export function parseAdditionalChordName(label = "") {
  // 6/9 is a literal suffix. A slash followed by a bass note is not accepted here.
  const match = /^([A-G][#b]?)(5|add2|add11|maj11|maj13|11|13|7b5|7#5|7b9|7#9|m11|m13|dim7|6\/9|m\(add9\))$/.exec(label);
  if (!match) return null;
  const [, displayRoot, suffix] = match;
  const flats = { Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", "E#": "F", "B#": "C" };
  const root = flats[displayRoot] ?? displayRoot;
  const quality = suffix === "dim7" ? "dim" : suffix.startsWith("m") && !suffix.startsWith("maj") ? "minor" : "major";
  return { root, quality, extension: suffix === "m(add9)" ? "add9" : suffix, displayName: label };
}
