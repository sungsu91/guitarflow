import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PROFILES } from '../src/fretboard/instruments.js';
import { getShooterInstrumentNotes, getShooterInstrumentStep, getShooterInstrumentRound, getShooterInstrumentAnalysis } from '../src/shooter/instrumentTraining.js';
import { detectPitchYinDetailed, centsBetween } from '../src/tuner/tunerMath.js';
import { createShooterPitchJudgmentState, observeShooterPitchFrame } from '../src/shooter/pitchJudgment.js';
import { midiMatchesShooterTarget } from '../src/shooter/midiJudgment.js';

test('every instrument and difficulty uses real string positions and sounding pitches', () => {
  for (const profile of Object.values(VIEWER_PROFILES)) {
    for (const difficulty of ['easy', 'normal', 'difficult', 'easy-random', 'normal-random', 'difficult-random']) {
      const notes = getShooterInstrumentNotes(profile, difficulty);
      const usedStrings = new Set();
      for (const note of notes) {
        const string = profile.tuning.find(string => string.stringNumber === note.stringNumber);
        assert.ok(string, `${profile.id} ${difficulty} has string ${note.stringNumber}`);
        assert.equal(note.midi, string.midi + note.fretNumber);
        assert.ok(Math.abs(note.frequency - 440 * 2 ** ((note.midi - 69) / 12)) < 0.00001);
        assert.ok(note.fretNumber >= (difficulty === 'normal' ? 5 : 0));
        assert.ok(note.fretNumber <= (difficulty.startsWith('difficult') ? 12 : difficulty === 'normal' ? 10 : 3));
        if (difficulty === 'easy-random' || difficulty === 'normal') assert.ok(!note.noteName.includes('#'));
        usedStrings.add(note.stringNumber);
      }
      assert.equal(usedStrings.size, profile.stringCount);
      if (!difficulty.endsWith('-random')) {
        assert.ok(notes[0].isSectionStart);
        assert.ok(notes.at(-1).isRoundEnding);
        assert.equal(getShooterInstrumentStep(profile, difficulty, notes.length), notes[0]);
        assert.equal(getShooterInstrumentRound(profile, difficulty, notes.length), 1);
      }
    }
  }
});

test('High G and Low G keep physical string 4 and use their actual octave', () => {
  for (const [id,pitch] of [['ukulele-high-g','G4'],['ukulele-low-g','G3']]) {
    const notes = getShooterInstrumentNotes(VIEWER_PROFILES[id], 'easy');
    assert.equal(notes.find(note => note.stringNumber === 4 && note.fretNumber === 0).pitch, pitch);
    const open = notes.filter(note => note.sectionId === 1);
    assert.equal(open[0].pitch, id.endsWith('high-g') ? 'C4' : 'G3');
  }
});

test('PCM detection and MIDI judgment cover low bass B0, guitar B1 and high ukulele A5', () => {
  for (const sampleRate of [44100, 48000, 96000]) {
    for (const [id, midi] of [['bass-5',23], ['bass-6',23], ['guitar-7',35], ['ukulele-high-g',81]]) {
      const profile = VIEWER_PROFILES[id];
      const note = getShooterInstrumentNotes(profile,'difficult-random').find(note => note.midi === midi);
      const config = getShooterInstrumentAnalysis(profile,sampleRate);
      const buffer = Float32Array.from({length:config.fftSize}, (_,index) => {
        const phase = 2 * Math.PI * note.frequency * index / sampleRate;
        return 0.1 * (Math.sin(phase) + 0.4 * Math.sin(phase * 2) + 0.2 * Math.sin(phase * 3));
      });
      const result = detectPitchYinDetailed(buffer,sampleRate,config.minFrequency,config.maxFrequency,0.12);
      assert.ok(result, `${id} detected at ${sampleRate}`);
      assert.ok(Math.abs(centsBetween(result.frequency,note.frequency)) < 3);
      assert.equal(observeShooterPitchFrame(createShooterPitchJudgmentState(), {...result, now:100, rms:0.1, target:note}).accepted,true);
      assert.equal(midiMatchesShooterTarget({type:'noteon',note:midi},note),true);
      assert.equal(midiMatchesShooterTarget({type:'noteon',note:midi+12},note),false);
    }
  }
});
