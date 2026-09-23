import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
// Original, deterministic studies. Links are authored inside cells; a cell's
// first note is picked again. Rests give beginners time to prepare a new grip.
const quarter = ['4','4','4','4'];
const eighth = Array(8).fill('8');
const sixteenth = Array(16).fill('16');
const repeat = (cell, times) => Array.from({length:times}, () => cell).flat();

const make = (id, level, type, name, english, bpm, shape, patterns, rhythm, purpose, goal, extra = {}) => ({
  id, level, type, name, english, bpm, shape, patterns, family:'major', style:ko["etudes.basics"], complete:true,
  rhythms: patterns.map((_, i) => Array.isArray(rhythm[0]) ? rhythm[i] : rhythm),
  purpose, difficultyReason:`${level} · ${goal}`, ...extra,
});

function techniqueStudies() {
  const result = [];
  const definitions = [
    ['hammer',ko["etudes.hammerOn"],'H','Hammer-on'], ['pull',ko["etudes.pullOff"],'P','Pull-off'],
    ['slide',ko["etudes.slide"],'S','Slide'], ['legato',ko["etudes.legato"],'HP','Legato'],
  ];
  const singleShape = [[3,5],[3,7],[2,1],[2,3]]; // C–D on either string.
  // Three notes per string in a connected G-major route; no random voicing lookup.
  const route = [[6,3],[6,5],[6,7],[5,3],[5,5],[5,7],[4,4],[4,5],[4,7],[3,4],[3,5],[3,7]];
  for (const [prefix, type, kind, english] of definitions) {
    const pair = (base, reverse = false) => kind === 'H' ? [base,base+1,base,-1]
      : kind === 'P' ? [base+1,base,base+1,-1]
      : kind === 'HP' ? [base,base+1,base,-1]
      : reverse ? [base+1,base,base+1,-1] : [base,base+1,base,-1];
    const pairMarks = row => {
      const marks={};
      for(let i=0;i<2;i++) {
        if(row[i]<0 || row[i+1]<0 || row[i]===row[i+1]) continue;
        const direction=singleShape[row[i+1]][1]>singleShape[row[i]][1]?'H':'P';
        if(kind==='HP' || (i===0 && (kind==='S'||kind===direction))) marks[i]=kind==='S'?'S':direction;
      }
      return marks;
    };
    const opening = Array.from({length:8}, (_, bar) => pair(0, bar % 2 === 1));
    opening[7] = kind === 'P' ? [1,0,0,0] : [0,1,0,0];
    const beginnerPurpose = kind === 'HP'
      ? ko["etudes.connectLowHighLowNotesOnOneStringWithHPRest"]
      : formatMessage(ko["etudes.connectOnlyTheTwoNotesMarkedValuePickUnmarkedNotesAndRelax"], { value1: type });
    const single = make(`${prefix}-single`, ko["etudes.beginner"], type, kind === 'HP' ? ko["etudes.oneStringHammerOnPullOff"] : formatMessage(ko["etudes.twoNoteValueOnOneString"], { value1: type }),
      `Single-string ${english}`, kind === 'HP' ? 44 : 48, singleShape, opening, quarter,
      beginnerPurpose, ko["etudes.learnOneConnectionUsingATwoFretIntervalOnOneStringQuarter"],
      {techniqueMap:opening.map(pairMarks)});
    result.push(single);
    if (prefix === 'slide' || prefix === 'legato') {
      const rows = [0,0,2,2,0,2,2,0].map(base => pair(base));
      rows[7] = [0,1,0,0];
      result.push(make(`${prefix}-pairs`, ko["etudes.beginner"], type, formatMessage(ko["etudes.valueAcrossTwoStrings"], { value1: type }), `Two-string ${english}`, 52,
        singleShape, rows, rows.map((_,bar)=>bar===1||bar===3?['8','8','2','4']:quarter),
        ko["etudes.completeEachBarOnOneStringPrepareTheNextStringSStarting"],
        ko["etudes.alternateTheConnectionBetweenTwoStringsAndSustainTheLongNoteAfter"],
        {techniqueMap:rows.map(pairMarks)}));
    }
    const cell = (base, variation = false) => kind === 'H' ? (variation ? [base,base+2,base,base+1] : [base,base+1,base+2,base])
      : kind === 'P' ? (variation ? [base+2,base,base+1,base] : [base+2,base+1,base,base+1])
      : kind === 'S' ? (variation ? [base+1,base+2,base+1,base] : [base,base+1,base+2,base+1])
      : variation ? [base+2,base+1,base,base+1] : [base,base+1,base+2,base+1];
    const marksFor = rows => rows.map(row => {
      const marks = {};
      for (let i=0; i<row.length-1; i++) {
        if (i%4===3) continue;
        const a=route[row[i]], b=route[row[i+1]];
        if (!a || !b || a[0]!==b[0] || a[1]===b[1]) continue;
        const direction=b[1]>a[1]?'H':'P';
        if (kind==='HP' || kind==='S' || kind===direction) marks[i]=kind==='S'?'S':direction;
      }
      return marks;
    });
    const finish = row => [...row.slice(0,-4), 2,1,0,0];
    const specifications = [
      ['three',ko["etudes.intermediate"],formatMessage(ko["etudes.threeNoteValue"], { value1: type }),'Three-note',60,[0,0,0,0,0,0,0,0],2,false,
        ko["etudes.connectThreeNotesOnOneStringPickTheFirstNoteOfEach"],
        ko["etudes.controlThreeNotesSpanningUpToFourFretsInEighthNotes"]],
      ['crossing',ko["etudes.intermediate"],formatMessage(ko["etudes.valueWithStringChanges"], { value1: type }),'String Crossing',64,[0,3,6,9,6,3,0,0],2,false,
        ko["etudes.moveToTheNextStringEachBarPickItsFirstNoteAnd"],
        ko["etudes.addAdjacentStringChangesAndMutingToThreeNoteConnections"]],
      ['drive',ko["etudes.advanced"],formatMessage(ko["etudes.continuousSixteenthNoteValue"], { value1: type }),'Sixteenth Drive',72,[0,3,6,9,9,6,3,0],4,false,
        ko["etudes.connectFourNoteGroupsInSteadySixteenthsMatchTheVolumeOfPicked"],
        ko["etudes.maintainContinuousSixteenthsThreeNoteConnectionsAndStringChangesForEightBars"]],
      ['sequence',ko["etudes.advanced"],formatMessage(ko["etudes.valueWithDirectionChanges"], { value1: type }),'Changing Sequence',76,[0,3,6,9,6,3,0,0],4,true,
        ko["etudes.alternateAThreeNotePatternWithAVariationInItsIntervalsPick"],
        ko["etudes.changePatternsPickingPointsAndPositionsInSixteenthNotes"]],
    ];
    for (const [suffix,level,name,en,bpm,bases,times,varied,purpose,goal] of specifications) {
      // Existing studies already cover these steps in the slide/legato tracks.
      if (prefix==='slide' && suffix==='three') continue;
      if (prefix==='legato' && suffix!=='three' && suffix!=='drive') continue;
      const rows = bases.map((base, bar) => Array.from({length:times}, (_, part) => cell(base,varied&&(part+bar)%2===1)).flat());
      rows[7]=finish(rows[7]);
      const id=prefix==='legato'&&suffix==='drive'?'legato-chain':`${prefix}-${suffix}`;
      result.push(make(id,level,type,name,`${en} ${english}`,bpm,route,rows,times===4?sixteenth:eighth,purpose,goal,
        {fixedRoot:'G',techniqueMap:marksFor(rows)}));
    }
  }
  return result;
}

export function trackStudies({penta, pentaIntervals}) {
  const triad = [[5,3],[4,2],[3,0]]; // C E G on adjacent strings, distinct frets.
  const pentaPairs = [[6,5],[6,8],[5,5],[5,7]];
  const pentaRows = [0,1,2,3,3,2,1,0].map((s, bar) => {
    const cell = bar<4 ? [s,s+2,s+1,s+2,s+3,s+2,s+1,s] : [s+3,s+1,s+2,s+1,s,s+1,s+2,s];
    return repeat(cell,2);
  });
  return [
    ...techniqueStudies(),
    make('penta-pairs',ko["etudes.beginner"],ko["app.pentatonics"],ko["etudes.twoNotePentatonicSpacing"],'Pentatonic Finger Pairs',48,pentaPairs,
      [[0,1,0,-1],[0,1,1,-1],[2,3,2,-1],[2,3,3,-1],[0,1,0,-1],[2,3,2,-1],[2,3,2,-1],[1,0,0,0]],quarter,
      ko["etudes.playTwoQuarterNotesOnOneStringPrepareTheNextStringDuring"],
      ko["etudes.learnMinorPentatonicFingerSpacingUsingTwoStringsQuarterNotesAndRests"],{family:'minor',intervals:pentaIntervals}),
    make('penta-turns',ko["etudes.advanced"],ko["app.pentatonics"],ko["etudes.pentatonicCrossPattern"],'Pentatonic Crossing Turns',80,penta,pentaRows,sixteenth,
      ko["etudes.continuouslyMoveTwoNotesAheadThenOneNoteBackKeepSixteenthNote"],
      ko["etudes.alternateStepwiseMovementAndLeapsInContinuousSixteenths"],{family:'minor',intervals:pentaIntervals,style:ko["etudes.rock"]}),
    make('triad-three-strings',ko["etudes.beginner"],ko["etudes.chordToneRuns"],ko["etudes.firstStepsWith135AcrossThreeStrings"],'Three-string Triad',48,triad,
      [[0,1,2,1],[0,1,2,-1],[0,1,2,1],[0,1,0,-1],[0,1,2,1],[0,1,2,-1],[2,1,0,1],[2,1,0,0]],quarter,
      ko["etudes.playAMajorChordS1st3rdAnd5thOneAtA"],
      ko["etudes.learnTheThreeTriadTonesInOnePositionAcrossThreeStringsUsing"]),
    make('triad-eighth-answer',ko["etudes.beginner"],ko["etudes.chordToneRuns"],ko["etudes.threeStringEighthNoteRoundTrip"],'Triad Eighth-note Return',56,triad,
      [[0,1,2,1,0,1,2,1],[0,1,2,1,0,1,0,-1],[0,1,2,1,2,1,0,1],[2,1,0,1,2,1,0,-1],[0,1,2,1,0,1,0,1],[2,1,0,1,0,1,2,1],[0,1,2,1,0,1,0,-1],[2,1,0,1,2,1,0,0]],eighth,
      ko["etudes.playThePreviousExerciseSThreeStringFingeringUpAndDownIn"],
      ko["etudes.connectEighthNotesAndRestsWhileKeepingTheThreeStringFingering"]),
  ];
}
