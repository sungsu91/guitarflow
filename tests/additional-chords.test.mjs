import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadChordRuntime, snapshotChordRuntime } from "./helpers/chord-runtime.mjs";
import { ADDITIONAL_CHORD_SHAPES, NEW_CHORD_FORMULAS, isPermittedChordOmission, parseAdditionalChordName } from "../src/chords/additionalChords.js";
import { CHORD_TONE_INTERVALS } from "../src/chords/chordTheory.js";
import { CHROMATIC_NOTES, NOTE_INDEX } from "../src/music/noteNotation.js";
const runtime = await loadChordRuntime();
const plain = value => JSON.parse(JSON.stringify(value));
const baseline = JSON.parse(await readFile(new URL("./fixtures/chords-before-badd9.json", import.meta.url), "utf8"));

test("restored existing voicings, fingering, windows and all position ordering remain unchanged", () => {
  const current = snapshotChordRuntime(runtime);
  for (const [key, before] of Object.entries(baseline)) {
    if (key.endsWith(":major:6/9") || key.endsWith(":minor:m7b5")) continue; // Previously missing templates, explicitly repaired.
    if (key.endsWith(":major:add9") && !key.startsWith("B:")) continue; // Explicitly authorized fixed add-family data; separately covered by fixed-add-voicings tests.
    // Only the user-requested m(add9) display spelling changes.
    const normalize = value => JSON.parse(JSON.stringify(value).replaceAll("m(add9)", "madd9"));
    assert.deepEqual(normalize(current[key]), normalize(before), key);
  }
});

test("every additional template at every supported transposition has exact declared tones and feasible finger/barre assignments", () => {
  let checked = 0;
  for (const root of CHROMATIC_NOTES) for (const [quality, extensions] of Object.entries(ADDITIONAL_CHORD_SHAPES)) for (const extension of Object.keys(extensions)) {
    const displayName = runtime.getChordNameFromParts(root, "natural", quality, extension);
    const candidates = runtime.getChordShapeTemplateCandidates(root, quality, extension);
    assert.ok(candidates.length, displayName);
    for (const candidate of candidates) {
      const chord = runtime.buildGeneratedChordShapeOption({root,quality,extension,displayName,candidate});
      const message = `${displayName}/${candidate.template.id}/${candidate.baseFret}`;
      const theory = CHORD_TONE_INTERVALS[quality][extension];
      const pitches = chord.notes.map(n => runtime.pitchToMidi(n.pitch));
      assert.equal(Math.min(...pitches) % 12, NOTE_INDEX[root], message + " bass");
      assert.equal(new Set(chord.notes.map(n=>n.stringNumber)).size,chord.notes.length,message);
      assert.deepEqual(plain(chord.voicing.theoreticalTones.map(t=>t.interval)), [...theory],message);
      const actual = new Set(pitches.map(p=>(p-NOTE_INDEX[root]+120)%12));
      assert.deepEqual([...actual].sort((a,b)=>a-b),theory.filter(i=>!chord.voicing.omittedIntervals.includes(i)).map(i=>i%12).sort((a,b)=>a-b),message);
      for (const note of chord.notes) {
        assert.equal(note.pitch,runtime.getPitchForStringFret(note.stringNumber,note.fretNumber),message);
        if(note.fretNumber>0) assert.match(note.finger,/^[1-4]$/,message);
      }
      for (const finger of ["1","2","3","4"]) {
        const notes=chord.notes.filter(n=>n.fretNumber>0&&n.finger===finger);
        assert.ok(new Set(notes.map(n=>n.fretNumber)).size<=1,message+" finger crosses frets");
        if(notes.length>1) {
          const lo=Math.min(...notes.map(n=>n.stringNumber)),hi=Math.max(...notes.map(n=>n.stringNumber));
          assert.ok(chord.barres.some(b=>b.label===finger&&b.fromString>=hi&&b.toString<=lo),message+" missing barre");
        }
      }
      for(const barre of chord.barres) for(const note of chord.notes) {
        if(note.stringNumber<=barre.fromString&&note.stringNumber>=barre.toString) assert.ok(note.fretNumber>=barre.fret,message+" barre blocks lower/open note");
      }
      const position=runtime.buildStoredChordReferencePosition(chord);
      for(const string of [1,2,3,4,5,6]) {
        const note=chord.notes.find(n=>n.stringNumber===string);
        assert.equal(position.stringStates[string],!note?"x":note.fretNumber===0?"o":undefined,message+" X/O");
      }
      if(extension==="add2") assert.ok(pitches.includes(Math.min(...pitches)+2),message+" actual second register");
      if(["13","maj13","m13"].includes(extension)) {
        assert.equal(theory.length,7);
        assert.ok(chord.voicing.omittedIntervals.every(i=>i===7||i===17));
        for(const interval of [quality==="minor"?3:4,extension==="maj13"?11:10,14,21]) assert.ok(actual.has(interval%12),message+" defining tone");
        assert.equal(chord.voicing.completeness,"conventional-omission");
      } else assert.equal(chord.voicing.completeness,"complete",message);
      checked++;
    }
  }
  assert.ok(checked>300);
});

test("new symbols round trip through existing quality/extension controls including sharp and flat spelling",()=>{
  for(const [quality, formulas] of Object.entries(NEW_CHORD_FORMULAS)) for(const extension of Object.keys(formulas)) {
    assert.equal(runtime.normalizeChordExtensionForQuality(quality,extension),extension);
    for(const [base,accidental] of [["B","natural"],["F","sharp"],["B","flat"],["C","sharp"],["C","flat"]]) {
      const displayName=runtime.getChordNameFromParts(base,accidental,quality,extension);
      const meta=runtime.getChordMetaFromLabel(displayName);
      assert.equal(meta.extension,extension);assert.equal(meta.quality,quality);
      const chord=runtime.buildGeneratedChordShapeOption({...meta});
      const letters="CDEFGAB";const rootLetter=letters.indexOf(base);
      for(const tone of chord.voicing.theoreticalTones) assert.equal(tone.label[0],letters[(rootLetter+tone.degreeOffset)%7],displayName+" "+tone.label);
    }
  }
  assert.equal(parseAdditionalChordName("C6/9").extension,"6/9");
  for(const name of ["C/E","G/B","D/F#","Am/G"]) assert.equal(parseAdditionalChordName(name),null);
  assert.equal(runtime.getChordMetaFromLabel("Cm(add9)").quality,"minor");
  const dim=runtime.buildGeneratedChordShapeOption({root:"C",quality:"dim",extension:"dim7",displayName:"Cdim7"});
  assert.deepEqual(plain(dim.voicing.theoreticalTones.map(t=>t.label)),["C","Eb","Gb","Bbb"]);
});

test("omissions cannot silently drop identity tones or simplify other chord types", () => {
  for (const [quality, extension] of [["major","13"],["major","maj13"],["minor","m13"]]) {
    assert.equal(isPermittedChordOmission(quality, extension, [17]), true);
    assert.equal(isPermittedChordOmission(quality, extension, [7,17]), true);
    for (const omitted of [[4,17],[3,17],[10,17],[11,17],[14,17],[21,17]]) assert.equal(isPermittedChordOmission(quality,extension,omitted),false);
  }
  for (const [quality, extensions] of Object.entries(ADDITIONAL_CHORD_SHAPES)) for (const extension of Object.keys(extensions)) {
    if (["13","maj13","m13"].includes(extension)) continue;
    assert.equal(isPermittedChordOmission(quality,extension,[7]),false);
  }
});
