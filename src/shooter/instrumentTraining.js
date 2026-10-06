import { buildInstrumentNotes, getViewerProfile } from '../fretboard/instruments.js';
import ko from '../i18n/locales/ko.js';

const cache = new Map();
const roundTrip = notes => [...notes, ...notes.slice(0, -1).reverse()];
const ascending = notes => [...notes].sort((a, b) => a.midi - b.midi || b.stringNumber - a.stringNumber);

// Use the same tuning data as the fretboard. Re-entrant High G is ordered by
// sounding pitch while retaining its physical string number for the hints.
export function getShooterInstrumentNotes(profile, difficulty) {
  const key = `${profile.id}:${difficulty}`;
  if (cache.has(key)) return cache.get(key);
  const range = (from, to, natural = false) => ascending(buildInstrumentNotes(profile.tuning, from, to))
    .filter(note => !natural || !note.noteName.includes('#'));
  let sections;
  if (difficulty.endsWith('-random')) {
    const notes = range(0, difficulty === 'difficult-random' ? 12 : 3, difficulty === 'easy-random');
    cache.set(key, notes);
    return notes;
  }
  if (difficulty === 'easy') {
    sections = [
      [ko['shooter.instrumentOpenStrings'], roundTrip(range(0, 0)), ko['shooter.moveFromLowToHighUsingOpenStrings']],
      [ko['shooter.stage2NaturalNotesUpAndDown'], roundTrip(range(0, 3, true)), ko['shooter.followTheNaturalNotesAtFrets03']],
      [ko['shooter.stage3IntroductionToSemitones'], roundTrip(range(0, 3)), ko['shooter.learnTheSemitoneAtTheAdjacentFretToo']],
      ...ascending(range(0, 0)).map(open => [ko['shooter.stage4Frets03RoundTrip'],
        roundTrip(buildInstrumentNotes(profile.tuning.filter(string => string.stringNumber === open.stringNumber), 0, 3)), ko['shooter.moveThrough0123AndBackOneFretAtA']]),
    ];
  } else {
    const notes = difficulty === 'normal' ? range(5, 10, true) : range(0, 12);
    sections = [
      [ko['shooter.instrumentAscent'], notes, ko['shooter.moveUpToAHigherPosition']],
      [ko['shooter.instrumentDescent'], [...notes].reverse(), ko['shooter.comeBackDownFromTheHighNotes']],
    ];
  }
  const raw = sections.flatMap(([sectionLabel, notes, sectionAnnouncement], sectionIndex) => notes.map((note, index) => ({
    ...note, label: note.pitch, sectionId: sectionIndex + 1, sectionLabel,
    sectionAnnouncement, isSectionStart: index === 0,
    direction: sectionIndex === 1 && difficulty !== 'easy' ? 'descending' : 'ascending',
    beats: 2, isSharp: note.noteName.includes('#'),
  })));
  const scenario = raw.map((note, index) => ({ ...note, index, order: index + 1, isRoundEnding: index === raw.length - 1 }));
  cache.set(key, scenario);
  return scenario;
}

export function getShooterInstrumentStep(profile, difficulty, count = 0) {
  const notes = getShooterInstrumentNotes(profile, difficulty);
  return notes[Math.max(0, Math.floor(count)) % notes.length];
}

export function getShooterInstrumentRound(profile, difficulty, count = 0) {
  return Math.floor(Math.max(0, count) / getShooterInstrumentNotes(profile, difficulty).length);
}

export function getShooterInstrumentAnalysis(profile = getViewerProfile('guitar-6'), sampleRate = 48000) {
  const lowest = Math.min(...profile.tuning.map(string => string.midi));
  const highest = Math.max(...profile.tuning.map(string => string.midi)) + 12;
  const minFrequency = Math.min(75, 440 * 2 ** ((lowest - 69) / 12) * 0.8);
  return {
    minFrequency,
    maxFrequency: Math.max(900, 440 * 2 ** ((highest - 69) / 12) * 1.15),
    fftSize: Math.min(32768, Math.max(2048, 2 ** Math.ceil(Math.log2(2 * sampleRate / minFrequency + 2)))),
    highpassFrequency: Math.min(62, minFrequency * 0.7),
  };
}
