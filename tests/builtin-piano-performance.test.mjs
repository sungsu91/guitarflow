import { readFileSync } from "./helpers/i18n-source.mjs";
import assert from "node:assert/strict";
import test from "node:test";

import vm from "node:vm";
import { arrangeBuiltinPianoEvents, chooseBuiltinPianoVoicing, getBuiltinChordPitchClasses,
  markBuiltinPianoProgression, matchesBuiltinMiniSlots, resolveMiniChordPianoPerformance } from "../src/audio/builtinPianoPerformance.js";
import { RHYTHM_RECOMMENDED_PROGRESSIONS } from "../src/rhythm/recommendedProgressions.js";
import { VOICING_MOVEMENT_COURSES } from "../src/rhythm/voicingMovementCourses.js";
import { getMiniChordRecommendedProgressions } from "../src/mini-chord/originalPracticeSongs.js";
import { getMiniChordPersonalRecommendedProgressions } from "../src/mini-chord/personalPracticeProjects.js";
import { transposeMiniChordLabel } from "../src/mini-chord/capo.js";
import { loadChordRuntime } from "./helpers/chord-runtime.mjs";
import * as dynamics from "../src/mini-chord/playbackDynamics.js";
import * as timeline from "../src/rhythm/chordBeatTimeline.js";
import * as playback from "../src/mini-chord/playbackPosition.js";
import * as capo from "../src/mini-chord/capo.js";
import * as theory from "../src/chords/chordTheory.js";

const runtime = await loadChordRuntime();
const chord = (name, mode = "mini") => ({ ...runtime.getChordMetaFromLabel(name),
  displayName: name, builtinPianoPerformance: mode });
const pitchClasses = (notes) => [...new Set(notes.map((midi) => midi % 12))].sort((a, b) => a - b);
const allMini = [...getMiniChordRecommendedProgressions(), ...getMiniChordPersonalRecommendedProgressions()];
const attack = (offsetSeconds, chordIndex, pianoAttackId, style = "chord", duration = 0.8) =>
  [60, 64, 67].map((midi, index) => ({ instrument: "piano", sample: "piano", midi,
    offsetSeconds: offsetSeconds + index * 0.012, chordIndex, pianoAttackId,
    duration, volume: 0.3, releaseSeconds: 0.5, pianoArticulation: style, stepIndex: offsetSeconds * 8 }));

test("C to Am retains C4 and E4 and moves only G3 to A3", () => {
  const first = chooseBuiltinPianoVoicing(chord("C"));
  const next = chooseBuiltinPianoVoicing(chord("Am"), first);
  assert.deepEqual(first, [55, 60, 64]);
  assert.deepEqual(next, [57, 60, 64]);
});

test("triads, suspended chords and named extensions use only their actual notes", () => {
  for (const [name, expected] of Object.entries({ C: [0, 4, 7], Am: [0, 4, 9],
    Cmaj7: [0, 4, 7, 11], Cadd9: [0, 2, 4, 7], G7: [2, 5, 7, 11], Csus4: [0, 5, 7] })) {
    assert.deepEqual(pitchClasses(chooseBuiltinPianoVoicing(chord(name))), expected, name);
  }
});

test("all shipped progressions and every supported transposition stay ordered and in range", () => {
  const sequences = [...RHYTHM_RECOMMENDED_PROGRESSIONS.map((preset) => preset.progression.map((entry) => entry.chord)),
    ...VOICING_MOVEMENT_COURSES.map((preset) => preset.slots.map((entry) => entry.chord)),
    ...allMini.map((preset) => preset.slots.filter((name) => /^[A-G]/.test(name)))];
  for (const sequence of sequences) for (let shift = -12; shift <= 12; shift++) {
    let previous = [];
    for (const name of sequence) {
      const current = chord(transposeMiniChordLabel(name, shift));
      const notes = chooseBuiltinPianoVoicing(current, previous);
      assert.deepEqual(pitchClasses(notes), getBuiltinChordPitchClasses(current).sort((a, b) => a - b), name);
      assert.ok(notes.every((note) => note >= 48 && note <= 76), name);
      assert.ok(notes.every((note, index) => index === 0 || note > notes[index - 1]), name);
      assert.ok(notes.filter((note) => note < 60).length <= 2, name);
      assert.ok(notes[0] >= 36 + capo.getMiniChordBackingRootPitch(current.root).pitchIndex + 5, `${name}: bass clearance`);
      previous = notes;
    }
  }
});

test("built-in provenance requires canonical data and users keep identical event objects", () => {
  const preset = RHYTHM_RECOMMENDED_PROGRESSIONS[0];
  const progression = preset.progression.map((entry) => ({ ...chord(entry.chord), builtinPianoPerformance: undefined, beatLength: entry.beats }));
  const marked = markBuiltinPianoProgression(progression, preset, "rhythm");
  assert.ok(marked.every((entry) => entry.builtinPianoPerformance === "rhythm"));
  assert.equal(markBuiltinPianoProgression(progression, null, "rhythm"), progression);
  const edited = progression.map((entry, index) => index ? entry : { ...entry, displayName: "Dm" });
  assert.equal(markBuiltinPianoProgression(edited, preset, "rhythm"), edited);
  for (const preset of allMini) {
    assert.ok(matchesBuiltinMiniSlots(preset, preset.slots, preset.barCount));
    assert.equal(matchesBuiltinMiniSlots(null, preset.slots, preset.barCount), false);
    assert.equal(matchesBuiltinMiniSlots(preset, ["Dm", ...preset.slots.slice(1)], preset.barCount), false);
  }
  const events = attack(0, 0, 1);
  assert.equal(arrangeBuiltinPianoEvents(events, progression, 2, 0.5, 8), events);
});

test("layers preserve attacks, drums, input data and end before the next harmony or rest", () => {
  for (const mode of ["mini", "rhythm"]) for (const bpm of [40, 76, 132, 240]) {
    const beat = 60 / bpm;
    const progression = [chord("C", mode), chord("Am", mode), { isRest: true, builtinPianoPerformance: mode }];
    const drum = { instrument: "drum", offsetSeconds: 0, chordIndex: 0 };
    const events = [drum, ...attack(0, 0, 1, "hold", beat * 4), ...attack(beat, 1, 2, "arpUp", beat * 4)];
    const snapshot = JSON.stringify(events);
    const result = arrangeBuiltinPianoEvents(events, progression, beat, beat, beat * 3);
    assert.equal(JSON.stringify(events), snapshot);
    assert.ok(result.includes(drum));
    assert.deepEqual(new Set(result.filter((e) => e.instrument === "piano").map((e) => e.pianoAttackId)), new Set([1, 2]));
    assert.deepEqual(new Set(result.filter((e) => e.instrument === "piano").map((e) => e.performanceRole)), new Set(["bass", "middle", "upper"]));
    for (const event of result.filter((e) => e.instrument === "piano")) {
      assert.ok(event.offsetSeconds + event.duration + event.releaseSeconds <= (event.chordIndex + 1) * beat + 1e-8);
      assert.ok(event.duration > 0 && event.releaseSeconds > 0);
      assert.ok(event.playbackRate >= 0.125 && event.playbackRate <= 4);
      assert.ok(event.midi >= (event.performanceRole === "bass" ? 36 : 48));
    }
    assert.deepEqual(result, arrangeBuiltinPianoEvents(events, progression, beat, beat, beat * 3));
  }
});

test("mini saved copies retain their sound independently of ownership and edits", () => {
  const preset = allMini[0];
  const original = JSON.stringify(preset);
  const mode = resolveMiniChordPianoPerformance(preset, preset.slots, preset.barCount, allMini);
  assert.equal(mode, "mini");
  const saved = JSON.parse(JSON.stringify({ ...preset, id: "user-copy", builtIn: false,
    libraryType: "user", pianoPerformance: mode }));
  saved.slots[0] = "Dm";
  assert.equal(resolveMiniChordPianoPerformance(saved, saved.slots, saved.barCount, allMini), mode);
  assert.equal(JSON.stringify(preset), original);
  assert.equal(resolveMiniChordPianoPerformance({}, preset.slots, preset.barCount, allMini), mode);
  assert.equal(resolveMiniChordPianoPerformance({ pianoPerformance: "standard" }, preset.slots, preset.barCount, allMini), "standard");
  assert.equal(resolveMiniChordPianoPerformance({}, ["C"], 1, allMini), "standard");
});

test("upper HOLD common tones retrigger at each written attack", () => {
  const progression = [chord("C"), chord("Am")];
  const result = arrangeBuiltinPianoEvents([...attack(0, 0, 1, "hold", 0.5), ...attack(0.5, 1, 2, "hold", 0.5)], progression, 0.5, 0.5, 1);
  for (const midi of [60, 64]) assert.equal(result.filter((event) => event.midi === midi).length, 2);
  const separate = arrangeBuiltinPianoEvents([...attack(0, 0, 1, "stab", 0.1), ...attack(0.5, 1, 2, "stab", 0.1)], progression, 0.5, 0.5, 1);
  assert.equal(separate.filter((event) => event.midi === 60).length, 2);
});

test("mini block chords keep upper attacks on the beat without repeated common-tone ducking", () => {
  for (const bpm of [40, 76, 96, 132, 240]) {
    const beat=60/bpm;
    const progression=[chord("C"),chord("C")];
    const events=[...attack(0,0,1),...attack(beat*4,1,2).map(event => ({...event,commonTone:true,volume:event.volume*0.86}))];
    const result=arrangeBuiltinPianoEvents(events,progression,beat*4,beat,beat*8);
    const upper=result.filter(event=>event.performanceRole==='upper');
    for(const event of upper) assert.ok(event.offsetSeconds-event.attackStartSeconds<=0.024);
    for(const first of upper.filter(event=>event.chordIndex===0)) {
      const repeated=upper.find(event=>event.chordIndex===1 && event.midi===first.midi);
      assert.ok(Math.abs(first.volume-repeated.volume)<1e-9);
      assert.equal(repeated.commonTone,false);
    }
  }
});

test("real sample playback honors bass MIDI and short boundary releases, and stops sources", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = app.indexOf("const playBackingSample = useCallback(");
  const end = app.indexOf("const schedulePreparedBackingEvent", start);
  const calls = [];
  const param = { setValueAtTime: (...args) => calls.push(["value", ...args]), linearRampToValueAtTime: (...args) => calls.push(["linear", ...args]),
    exponentialRampToValueAtTime: (...args) => calls.push(["exp", ...args]), cancelScheduledValues() {}, setTargetAtTime() {} };
  const node = () => ({ gain: param, playbackRate: { setValueAtTime: (rate) => calls.push(["rate", rate]) },
    connect() {}, disconnect() {}, start: (when) => calls.push(["start", when]), stop: (when) => calls.push(["stop", when]) });
  const ref = (current) => ({ current });
  const context = vm.createContext({ useCallback: (fn) => fn, audioRef: ref({ state: "running", currentTime: 0, createBufferSource: node, createGain: node }),
    backingSampleBuffersRef: ref({ piano: { duration: 2.124 } }), ensureBackingOutput: () => true,
    backingBassGainRef: ref({}), backingPianoGainRef: ref({}), backingDrumGainRef: ref({}), backingMasterGainRef: ref({}), backingActiveSourcesRef: ref(new Set()) });
  vm.runInContext(app.slice(start, end) + "globalThis.play = playBackingSample;", context);
  context.play("piano", 1, 0.2, 2 ** ((36 - 67) / 12), 0.2, "piano", "", { builtinPianoPerformance: true, releaseSeconds: 0.05 });
  assert.ok(calls.some(([kind, rate]) => kind === "rate" && Math.abs(rate - 2 ** (-31 / 12)) < 1e-9));
  assert.ok(calls.some(([kind, value, when]) => kind === "exp" && value === 0.0001 && Math.abs(when - 1.25) < 1e-9));
  calls.length = 0;
  context.play("piano", 2, 0.2, 1, 0.006, "piano", "", { builtinPianoPerformance: true, releaseSeconds: 0.002 });
  const envelopeTimes = calls.filter(([kind]) => ["value", "linear", "exp"].includes(kind)).map((entry) => entry[2]);
  assert.deepEqual(envelopeTimes, [...envelopeTimes].sort((a, b) => a - b), "short-note attack must precede decay and release");
  const fadeStart = app.indexOf("const fadeOutActiveBackingSources = useCallback(");
  const fadeEnd = app.indexOf("const stopBackingScheduler", fadeStart);
  vm.runInContext(app.slice(fadeStart, fadeEnd) + "fadeOutActiveBackingSources();", context);
  assert.ok(calls.some(([kind, when]) => kind === "stop" && when === 0.04));
});

test("the shared production timeline compiles separate attacks and layers for both modes", () => {
  const source = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const context = vm.createContext({ ...dynamics, ...timeline, ...playback, ...capo, ...theory,
    arrangeBuiltinPianoEvents, DEFAULT_BPM: 80,
    STAGE3_DEFAULT_BACKING_SETTINGS: { rhythmPattern: "4beat", bassBeat: "basic", pianoBeat: "basic" },
    MINI_CHORD_DEFAULT_PIANO_STYLE: "chord", MINI_CHORD_CUSTOM_PATTERN_ID: "custom",
    MINI_CHORD_SLOTS_PER_BAR: 4, MINI_CHORD_GROOVE_STEPS: 16, MINI_CHORD_GROOVE_STEP_LABELS: [],
    BACKING_PIANO_VOICINGS: {}, BACKING_ROOT_MIDI: { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 },
    normalizeMiniChordPianoStyle: (value) => value,
    // Inputs below are already valid pattern records; UI normalization is outside this test.
    normalizeMiniChordCustomPatterns: (value) => value ?? {},
    clampBpm: (value) => value, getBeatMs: (bpm) => 60000 / bpm,
    getTimeSignatureOption: () => ({ beats: 4 }),
  });
  vm.runInContext(source.slice(source.indexOf("const getBackingRootPitch ="), source.indexOf("const COUNT_IN_VOICE_WORDS ="))
    + "globalThis.compile = createBackingTimelineEvents;", context);
  const steps = Array.from({ length: 16 }, (_, index) => ({ active: [0, 6, 8, 14].includes(index), style: "chord", durationSteps: 1 }));
  for (const mode of ["rhythm", "mini"]) {
    const progression = [chord("Cmaj7", mode), chord("Am", mode)].map((entry, index) => mode === "rhythm"
      ? { ...entry, beatLength: 4 }
      : { ...entry, miniChordSlotIndex: index, miniChordSlotInBar: index, miniChordSlotHasExplicitChord: true });
    const options = { progression, bpm: 120, pianoBeat: "custom", resolvedPatterns: { piano: { steps, level: 1 } } };
    const session = context.compile(options);
    const legacy = context.compile({ ...options, progression: progression.map(({ builtinPianoPerformance, ...entry }) => entry) });
    assert.ok(session.events.some((event) => event.performanceRole === "middle"));
    assert.ok(session.events.some((event) => event.performanceRole === "upper"));
    assert.ok(session.events.some((event) => event.performanceRole === "bass" && event.instrument === "piano"));
    assert.equal(session.cycleSeconds, legacy.cycleSeconds);
    const drumAndBass = (value) => JSON.stringify(value.events.filter((event) => event.instrument !== "piano").map(({ performanceRole, ...event }) => event));
    assert.equal(drumAndBass(session), drumAndBass(legacy));
    assert.deepEqual(new Set(session.events.filter((event) => event.instrument === "piano").map((event) => event.pianoAttackId)),
      new Set(legacy.events.filter((event) => event.instrument === "piano").map((event) => event.pianoAttackId)));
    const firstChordNotes = session.events.filter((event) => event.instrument === "piano" && event.chordIndex === 0).map((event) => event.midi);
    assert.deepEqual(pitchClasses(firstChordNotes), [0, 4, 7, 11]);
  }
});
