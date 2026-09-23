import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {mixedTechniqueStudies,applyStudyExpressions} from './mixedTechniqueStudies.js';
import {compositionSketch} from './compositionSketch.js';
import {daylightFingerstyle} from './daylightFingerstyle.js';
// Authored patterns materialize once into editable string/fret documents.
// Display and playback derive sounding MIDI from that document; notation is one octave up.
import { curriculumTemplates } from './curriculum.js';
import { trackStudies } from './trackStudies.js';
import { TRACK_ORDER, getTrack } from './tracks.js';
import { chordStudies } from './openChordStudies.js';
import {curriculumAdditions,reviseTemplate} from './curriculumRevision.js';
import {educationIssues,lessonPedagogy} from './pedagogy.js';
import scoreOverrides from './scoreOverrides.json' with {type:'json'};
import {compileScoreDocument,toScoreDocument} from './scoreDocument.js';
import { TUNING, ROOTS, NATURAL, MAJOR, MINOR, PENTA, BLUES, TECHNIQUES, spellMidi, parseChord, validateEtude } from './notationData.js';
export { TUNING, ROOTS, TECHNIQUES, spellMidi, parseChord, validateEtude } from './notationData.js';
export const LEVELS = Object.freeze([ko["etudes.beginner"], ko["etudes.intermediate"], ko["etudes.advanced"]]);
// Authored concert-pitch routes: G major/minor, C major and A blues, all within frets 0–8.
// Different string choices are written explicitly, never guessed at runtime.
const MAJOR_SHAPE = [[6,3],[6,5],[5,2],[5,3],[5,5],[4,2],[4,4],[4,5],[3,2],[3,4],[3,5],[2,3],[2,5],[1,2],[1,3]];
const PENTA_SHAPE = [[6,3],[6,6],[5,3],[5,5],[4,3],[4,5],[4,8],[3,5],[3,7],[2,6],[2,8]];
const BLUES_SHAPE = [[6,5],[6,8],[5,5],[5,6],[5,7],[4,5],[4,7],[3,5],[3,7],[3,8],[2,5],[2,8],[1,5]];
// G-major finger pairs at frets 2–5: one fretted pair per string.
const BEGINNER_FINGER_PAIR_SHAPE = [[6,2],[6,3],[5,2],[5,3],[4,2],[4,4],[3,2],[3,5],[2,3],[2,5],[1,2],[1,3]];
// C-major route with three notes per string, explicitly placed at frets 3–8.
const CONNECTED_SHAPE = [[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
const bars = (...patterns) => patterns;
const techniques = (...rows) => rows.map(row => Object.fromEntries(row.map(([index, kind]) => [index, kind])));
export const TEMPLATES = Object.freeze([
  { id: 'first-path', level: ko["etudes.beginner"], style: ko["etudes.basics"], type: ko["app.scales"], name: ko["etudes.scaleAcrossTwoStrings"], english: 'Scale String Crossing', bpm: 60, family: 'major', shape: MAJOR_SHAPE,
    purpose: ko["etudes.moveBackAndForthBetweenTwoStringsCarryingTheSamePatternOnto"],
    patterns: bars([0,1,2,1,0,1,2,3],[2,3,4,3,2,3,4,5],[4,5,6,5,4,5,6,7],[7,6,5,4,3,2,1,0]) },
  { id: 'pop-answer', level: ko["etudes.beginner"], style: ko["components.pop"], type: ko["etudes.licks"], name: ko["etudes.ascendingAndDescendingLick"], english: 'Ascending & Descending Lick', bpm: 72, family: 'major', shape: MAJOR_SHAPE,
    purpose: ko["etudes.playAShortRisingPhraseAndAFallingResponseInSteadyEighth"],
    patterns: bars([0,2,1,2,3,2,1,0],[2,4,3,4,5,4,3,2],[4,6,5,6,7,6,5,4],[7,5,6,4,5,3,1,0]) },
  { id: 'ballad-line', level: ko["etudes.beginner"], style: ko["etudes.ballad"], type: ko["etudes.licks"], name: ko["etudes.quarterAndEighthNoteLick"], english: 'Quarter & Eighth Note Lick', bpm: 64, family: 'major', shape: MAJOR_SHAPE, durations: ['4','8','8','4','4'],
    purpose: ko["etudes.distinguishQuarterNotesFromEighthNotesAndHoldTheFinalNoteOf"],
    patterns: bars([0,1,2,4,2],[3,4,5,4,3],[4,5,6,7,5],[3,2,1,0,0]) },
  { id: 'rock-penta', level: ko["etudes.intermediate"], style: ko["etudes.rock"], type: ko["app.pentatonics"], name: ko["etudes.pentatonicPositionRoundTrip"], english: 'Pentatonic Position Run', bpm: 84, family: 'minor', intervals: PENTA, shape: PENTA_SHAPE,
    purpose: ko["etudes.retraceThreeNoteMinorPentatonicGroupsAcrossTwoOctaves"],
    patterns: bars([0,1,2,1,2,3,4,3],[4,5,6,5,6,7,8,7],[8,9,10,9,8,7,8,6],[7,5,6,4,5,3,1,0]) },
  { id: 'blue-turn', level: ko["etudes.beginner"], style: ko["metronome.blues"], type: ko["etudes.licks"], name: ko["etudes.blueNoteStaircase"], english: 'Stepwise Blues Note Run', bpm: 64, family: 'minor', intervals: BLUES, shape: BLUES_SHAPE, complete: true,
    purpose: ko["etudes.moveOnlyBetweenAdjacentStringsPassingThroughTheBlueNote5One"],
    difficultyReason: ko["etudes.lateBeginnerLearnTheBlueNoteInContinuousEighthNotesUsingAdjacent"],
    patterns: bars([0,1,0,1,2,3,4,3],[2,3,4,3,2,3,4,5],[4,5,6,5,4,5,6,7],[6,7,8,7,8,9,8,7],[7,8,9,8,9,10,11,10],[10,11,12,11,10,9,8,7],[7,8,7,6,5,4,3,2],[2,3,4,3,2,1,0,0]) },
  { id: 'jazz-seventh', level: ko["etudes.intermediate"], style: ko["metronome.jazz"], type: ko["etudes.chordToneRuns"], name: ko["etudes.jazzMajorSeventhArpeggio"], english: 'Seventh Arpeggio Workout', bpm: 88, family: 'major', shape: CONNECTED_SHAPE,
    purpose: ko["etudes.connectThe1st3rd5thAnd7thWithStringSkipsAndPosition"],
    patterns: bars([0,2,4,6,4,2,4,6],[7,6,4,6,7,9,11,13],[14,13,11,9,11,13,11,9],[7,6,7,4,6,2,4,0]) },
  { id: 'diagonal-sequence', level: ko["etudes.advanced"], style: ko["etudes.basics"], type: ko["app.scales"], name: ko["etudes.sixteenthNotePositionShifts"], english: 'Sixteenth Note Scale Run', bpm: 80, family: 'major', shape: CONNECTED_SHAPE, duration: '16',
    purpose: ko["etudes.ascendAndDescendInFourNoteSequencesAcrossSeveralPositionsPlayFour"],
    patterns: bars([0,1,2,1,2,3,4,3,4,5,6,5,6,7,8,7],[8,9,10,9,10,11,12,11,12,13,14,13,12,11,10,9],[10,9,8,9,8,7,6,7,6,5,4,5,4,3,2,3],[2,3,4,3,4,5,6,5,6,5,4,3,2,1,2,0]) },
  { id: 'triad-start', fixedRoot:'G', level: ko["etudes.beginner"], style: ko["etudes.basics"], type: ko["app.scales"], name: ko["etudes.firstStepsInFingerSpacing"], english: 'Finger Pair Foundation', bpm: 48, family: 'major', shape: BEGINNER_FINGER_PAIR_SHAPE, duration: '4', complete: true,
    purpose: ko["etudes.stayOnOneStringForEachBarAndExploreTheDistanceFrom"],
    difficultyReason: ko["etudes.earlyBeginnerRepeatJustTwoNotesOnOneStringInQuarterNotes"],
    patterns: bars([0,1,0,1],[2,3,2,3],[4,5,4,5],[6,7,6,7],[8,9,8,9],[10,11,10,11],[11,10,9,8],[7,5,2,1]) },
  { id: 'hammer-start', level: ko["etudes.beginner"], style: ko["etudes.basics"], type: ko["etudes.hammerOn"], name: ko["etudes.twoNoteHammerOn"], english: 'Two-note Hammer-on Exercise', bpm: 50, family: 'major', shape: MAJOR_SHAPE,
    purpose: ko["etudes.soundTheSecondNoteMarkedHByHammeringDownWithYourFinger"],
    patterns: bars([0,1,0,1,2,4,2,4],[2,4,2,4,5,6,5,6],[8,9,8,9,11,12,11,12],[5,6,2,4,0,1,1,0]),
    techniqueMap: techniques([[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H']]) },
  { id: 'pull-return', level: ko["etudes.beginner"], style: ko["etudes.rock"], type: ko["etudes.pullOff"], name: ko["etudes.descendingPullOffLick"], english: 'Descending Pull-off Lick', bpm: 60, family: 'major', shape: MAJOR_SHAPE,
    purpose: ko["etudes.fretTheDestinationNoteMarkedPInAdvanceThenConnectTheHigher"],
    patterns: bars([0,1,0,1,0,4,2,2],[3,2,4,2,6,5,6,5],[9,8,9,8,12,11,12,11],[6,5,4,2,3,2,1,0]),
    techniqueMap: techniques([[1,'P'],[3,'P'],[5,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']]) },
  { id: 'slide-path', level: ko["etudes.intermediate"], style: ko["etudes.ballad"], type: ko["etudes.slide"], name: ko["etudes.connectPositionsWithSlides"], english: 'Position Slide Exercise', bpm: 60, family: 'major', shape: CONNECTED_SHAPE,
    purpose: ko["etudes.connectTheTwoNotesMarkedSlWithTheSameFingerArrivingOn"],
    patterns: bars([0,1,2,1,3,4,5,4],[6,7,8,7,9,10,11,10],[12,13,14,13,12,13,14,12],[11,10,9,8,7,6,1,0]),
    techniqueMap: techniques([[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[3,'S'],[6,'S']]) },
  { id: 'triad-cross', level: ko["etudes.intermediate"], style: ko["components.pop"], type: ko["etudes.chordToneRuns"], name: ko["etudes.twoOctaveTriads"], english: 'Two-octave Triad Arpeggio', bpm: 68, family: 'major', shape: CONNECTED_SHAPE,
    purpose: ko["etudes.connectThe1st3rdAnd5thAcrossTwoOctavesWhilePracticingString"],
    patterns: bars([0,2,4,2,4,7,4,2],[4,7,9,7,9,11,9,7],[7,9,11,14,11,9,11,9],[7,4,7,4,2,4,2,0]) },
  { id: 'legato-phrase', level: ko["etudes.intermediate"], style: ko["etudes.rock"], type: ko["etudes.legato"], name: ko["etudes.mixedHammerOnPullOffAndSlideLick"], english: 'Mixed Legato Lick', bpm: 76, family: 'major', shape: CONNECTED_SHAPE,
    purpose: ko["etudes.combineHPAndSlWhilePickingUnmarkedNotesToKeepThe"],
    patterns: bars([0,1,2,1,3,4,5,4],[6,7,8,7,9,10,11,10],[12,13,14,13,12,13,14,12],[11,10,9,8,7,6,1,0]),
    techniqueMap: techniques([[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'H'],[2,'P'],[4,'S'],[5,'H'],[6,'P']],[[0,'P'],[1,'P'],[3,'S'],[4,'P'],[6,'P']]) },
  ...curriculumTemplates({major:MAJOR_SHAPE,connected:CONNECTED_SHAPE,penta:PENTA_SHAPE,blues:BLUES_SHAPE,pentaIntervals:PENTA,bluesIntervals:BLUES}),
  ...trackStudies({penta:PENTA_SHAPE,pentaIntervals:PENTA}),
  ...chordStudies(),
  ...curriculumAdditions(),
  ...mixedTechniqueStudies,
].map(reviseTemplate).map(template=>({...template,fixedRoot:template.fixedRoot ?? (template.shape===MAJOR_SHAPE || template.shape===PENTA_SHAPE ? 'G' : template.family==='minor' ? 'A' : 'C')})));

const COURSE_ORDER = TRACK_ORDER;
// Four development bars between the opening three bars and the final cadence.
// Technique studies rearrange intact two-beat cells, preserving their links.
const DEVELOPMENT = {
  'first-path': bars([7,8,9,8,7,8,9,10],[9,10,11,10,9,10,11,12],[11,12,13,12,11,10,9,8],[9,8,7,6,7,8,7,6]),
  'pop-answer': bars([6,8,7,8,9,8,7,6],[8,10,9,10,11,10,9,8],[10,11,12,11,13,12,11,10],[9,7,8,6,7,5,6,7]),
  'ballad-line': bars([5,6,7,9,7],[7,8,9,11,9],[9,10,11,9,7],[7,6,5,4,3]),
  'rock-penta': bars([5,6,7,6,7,8,9,8],[8,9,10,8,9,7,8,6],[6,7,8,6,7,5,6,4],[4,5,6,4,5,6,7,6]),
  'triad-cross': bars([7,9,11,9,11,14,11,9],[11,9,7,9,7,4,7,9],[7,4,2,4,7,9,7,4],[2,4,7,4,7,9,7,4]),
  'jazz-seventh': bars([9,11,13,11,9,7,6,7],[6,4,2,4,6,7,9,7],[9,11,13,14,13,11,9,7],[6,7,9,7,6,4,6,7]),
  'diagonal-sequence': bars([8,7,6,7,8,9,10,9,10,11,12,11,12,13,14,13],[12,11,10,11,10,9,8,9,8,7,6,7,6,5,4,5],[4,5,6,7,6,7,8,9,8,9,10,11,10,11,12,13],[12,11,10,9,10,9,8,7,8,7,6,5,6,5,4,3]),
};

function expandedBars(template) {
  if(template.complete) return template.patterns.map((pattern,i)=>({pattern, marks:template.techniqueMap?.[i]}));
  const opening = template.patterns.map((pattern, i) => ({pattern, marks:template.techniqueMap?.[i]}));
  const development = DEVELOPMENT[template.id]?.map(pattern => ({pattern})) ?? [2,1,0,1].map((bar, section) => {
    const pattern = template.patterns[bar];
    if (section === 3) return {pattern, marks:template.techniqueMap[bar]};
    return {pattern:[...pattern.slice(4), ...pattern.slice(0,4)],
      marks:Object.fromEntries(Object.entries(template.techniqueMap[bar]).filter(([i]) => Number(i)!==3).map(([i,kind]) => [(Number(i)+4)%8,kind]))};
  });
  return [...opening.slice(0,3), ...development, opening[3]];
}
const TECHNIQUE_TIPS = {
  H: ko["etudes.hammerOnHPickTheFirstNoteThenPressAHigherFret"],
  P: ko["etudes.pullOffPFretTheLowerNoteInAdvanceGentlyPullThe"],
  S: ko["etudes.slideSlPickTheFirstNoteThenKeepTheSameFingerOn"],
};

// Editorial difficulty, evaluated at the recommended tempo, not a certificate
// of player proficiency. Genre and technique names do not determine level.
const DIFFICULTY = {
  'triad-start': ko["etudes.earlyBeginnerRepeatJustTwoNotesOnOneStringInQuarterNotes"],
  'ballad-line': ko["etudes.beginnerFocusOnQuarterAndEighthNoteLengthsAndConnectingShortPatterns"],
  'first-path': ko["etudes.beginnerDevelopSteadyEighthNotesAndMovementBetweenAdjacentStrings"],
  'pop-answer': ko["etudes.beginnerConnectShortAscendingAndDescendingPatternsInOnePosition"],
  'hammer-start': ko["etudes.beginnerFocusOnOneTechniqueSlowTwoNoteHammerOns"],
  'pull-return': ko["etudes.beginnerFocusOnSlowTwoNotePullOffsFretTheLowerNote"],
  'blue-turn': ko["etudes.beginnerSteadyEighthNotesAndChromaticMovementWithinASmallPositionThe"],
  'slide-path': ko["etudes.intermediateControlPositionShiftsAcrossStringsAndTheTimingOfSlideArrivals"],
  'rock-penta': ko["etudes.intermediateChangeTheDirectionOfThreeNoteGroupsWhileConnectingSeveralPositions"],
  'triad-cross': ko["etudes.intermediateMoveAcrossTwoOctavesInEighthNotesWhileControllingStringSkips"],
  'jazz-seventh': ko["etudes.intermediateFocusOnLeapsBetween1357AndPositionShifts"],
  'legato-phrase': ko["etudes.intermediateSwitchBetweenHammerOnsPullOffsAndSlidesInEighthNotes"],
  'diagonal-sequence': ko["etudes.advancedTheUpperLevelOfThisCurriculumSustainContinuousSixteenthNotesAt"],
};

export function buildEtude(template) {
  const root = template.fixedRoot;
  const spelling = (midi,bar) => {
    const chord=template.chordNames?.[bar] ? parseChord(template.chordNames[bar]) : null;
    return spellMidi(midi,chord?.root??root,chord?.family??template.family,template.intervals===BLUES);
  };
  const measures = expandedBars(template).map(({pattern, marks}, bar) => pattern.map((index, i) => {
    const indices = Array.isArray(index) ? index : [index];
    const [string, baseFret] = template.shape[Math.max(0,indices[0])];
    const fret = baseFret;
    const midi = TUNING[string - 1] + fret;
    const nextPosition = template.shape[pattern[i+1]];
    const automatic = template.autoTechnique && index>=0 && nextPosition?.[0]===string && nextPosition[1]!==baseFret
      ? (i%4===1 ? 'S' : nextPosition[1]>baseFret?'H':'P') : null;
    const tones = indices.length > 1 ? indices.map(position => {
      const [s, f] = template.shape[position];
      const sounding = TUNING[s-1] + f;
      return {string:s, fret:f, midi:sounding, pitch:spelling(sounding,bar)};
    }) : undefined;
    return { string, fret, midi, tones, rest:index<0, duration: template.rhythms?.[bar]?.[i] ?? template.durations?.[i] ?? template.duration ?? '8', technique: marks?.[i] ?? automatic,
      pitch: spelling(midi,bar) };
  }));
  return { id: `${root}-${template.id}`, root, templateId: template.id, title: template.name,
    english: template.english, level: template.level, style: template.style, type: template.type,
    purpose: template.purpose, bpm: template.bpm, lesson: COURSE_ORDER.indexOf(template.id) + 1,
    trackLesson: getTrack(template.type).stages[LEVELS.indexOf(template.level)][1].indexOf(template.id) + 1,
    difficultyReason: template.difficultyReason ?? DIFFICULTY[template.id],
    accompaniment:Boolean(template.accompaniment),
    chordShapes:template.chordShapes,
    harmony:template.chordNames ?? template.harmony?.map(([degree,quality])=>{
      const pitch=spellMidi(48+NATURAL[root]+MAJOR[degree],root,'major');
      return `${pitch.letter}${pitch.alter===1?'♯':pitch.alter===-1?'♭':''}${quality}`;
    }),
    tips: [template.difficultyReason ?? DIFFICULTY[template.id], template.purpose, template.complete ? ko["etudes.learnTwoBarsAtATimeThenConnectFourAndEightBars"] : ko["etudes.bars13IntroduceThePatternBars47VaryItsRange"], ...[...new Set(measures.flat().map(n => n.technique).filter(Boolean))].map(t => TECHNIQUE_TIPS[t]),
      template.accompaniment ? ko["etudes.playVerticallyStackedTabNumbersTogetherUseYourThumbPForBass"] : template.type === ko["etudes.chordToneRuns"] ? ko["etudes.thisIsALeadGuitarChordToneExercisePlayOneNoteAt"] : ko["etudes.pickUnmarkedNotesRepeatOneBarAtATimeThenConnectBars"],
      ...(template.accompaniment ? [ko["etudes.chordDiagramsShowStrings16FromTopToBottomWithHigher"]] : []),
      formatMessage(ko["etudes.suggestedStartingTempoValueBpmStartSlowlyAndCheckThatVolumeAnd"], { value1: template.bpm }),
      ko["etudes.afterThreeUninterruptedRunsAtTheSameTempoTryIncreasingBy4"]],
    keySignature: root + (template.family === 'minor' ? 'm' : ''),
    meter: [4,4], intervals: template.intervals ?? MAJOR, measures };
}

export const BASE_ETUDES = TEMPLATES.map(template=>{
 const base=buildEtude(template),document=toScoreDocument(base);applyStudyExpressions(document,template);
 document.id=base.id;document.kind='builtin';document.origin={templateId:base.templateId,revision:template.revision??1};
 const result=compileScoreDocument(document,base);
 if(!result.score||result.issues.length)throw Error(`${base.id}: ${[...result.errors,...result.issues].join(', ')}`);
 return {...result.score,edited:false};
}).sort((a,b) => a.lesson - b.lesson);
export const ETUDES = BASE_ETUDES.map(base=>{
  const document=scoreOverrides[base.templateId];
  if(!document)return base;
  const result=compileScoreDocument(document,base);
  if(!result.score)throw new Error(`${base.templateId}: ${result.errors.join(', ')}`);
  const normalized={...toScoreDocument(result.score),id:base.id,kind:'builtin',origin:document.origin??base.document.origin};
  const ready=compileScoreDocument(normalized,base);
  if(!ready.score||ready.issues.length)throw new Error(`${base.templateId}: ${[...ready.errors,...ready.issues].join(', ')}`);
  return {...ready.score,edited:false};
});
for (const etude of ETUDES) {
  const errors = [...validateEtude(etude),...educationIssues(etude)];
  if (errors.length) throw new Error(`${etude.id}: ${errors.join(', ')}`);
  etude.pedagogy=lessonPedagogy(etude);
}
// Long-form editable composition sample, outside the fixed eight-bar syllabus.
ETUDES.push(compositionSketch);
ETUDES.push(daylightFingerstyle);
