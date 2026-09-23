import ko from "../i18n/locales/ko.js";
// Each course has its own concert-pitch progression and actual chord grips.
const grip=(frets,fingers,barre)=>({frets,fingers,...(barre?{barre}:{})});
export const OPEN_CHORD_SHAPES={
 D:grip([null,null,0,2,3,2],[null,null,null,1,3,2]),
 Dm:grip([null,null,0,2,3,1],[null,null,null,2,3,1]),
 E7:grip([0,2,0,1,0,0],[null,2,null,1,null,null]),
 C:grip([null,3,2,0,1,0],[null,3,2,null,1,null]),
 Am:grip([null,0,2,2,1,0],[null,null,2,3,1,null]),
 F:grip([null,null,3,2,1,1],[null,null,3,2,1,1],{fret:1,from:2,to:1}),
 G:grip([3,2,0,0,0,3],[2,1,null,null,null,3]),
 Em:grip([0,2,2,0,0,0],[null,2,3,null,null,null]),
 D7:grip([null,null,0,2,1,2],[null,null,null,2,1,3]),
 Bmaj7:grip([null,2,4,3,4,2],[null,1,3,2,4,1],{fret:2,from:5,to:1}),
 'D#m':grip([null,6,8,8,7,6],[null,1,3,4,2,1],{fret:6,from:5,to:1}),
 Emaj7:grip([null,7,9,8,9,7],[null,1,3,2,4,1],{fret:7,from:5,to:1}),
 Em7:grip([null,7,9,7,8,7],[null,1,3,1,2,1],{fret:7,from:5,to:1}),
};
const CHORDS=OPEN_CHORD_SHAPES;
// The fifth is selected for this voicing; it is not always the adjacent string.
const FIFTH={D:3,Dm:3,E7:5,C:3,Am:4,F:2,G:4,Em:5,D7:3,Bmaj7:4,'D#m':4,Emaj7:4,Em7:4};
const B='bass', V='fifth';
const FIRST=[[[B,2],3,1,3],[[B,2],4,3,-1],[[B,1],3,2,3],[[B,2],4,B,-1],[[B,2],3,[B,1],3],[[B,1],2,3,-1],[[B,2],4,3,-1],[[B,2],3,1,B]];
const CHANGES=[[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,[B,1],-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,2],3,1,B]];
const ADDITIONAL_PROGRESSIONS={
 'chord-bass-answer':{fixedRoot:'G',chords:['G','D','Em','C','Am','D7','G','G'],name:ko["etudes.alternatingBassAccompanimentInGMajor"],english:'G Major Alternating Bass',purpose:ko["etudes.moveThroughGDEmCAndReturnViaAmD7G"],goal:ko["etudes.connectGMajorChordChangesWithAlternatingBass"]},
 'chord-sixteenths':{fixedRoot:'A',family:'minor',chords:['Am','Dm','G','C','F','Dm','E7','Am'],name:ko["etudes.aMinorCycleWithSixteenthNoteAccompaniment"],english:'A Minor Circle Arpeggio',purpose:ko["etudes.followAmDmGCFDmE7AmTheGIn"],goal:ko["etudes.expressMinorKeyTensionAndResolutionWithIndependentBassAndSixteenthNote"]},
 'chord-density':{fixedRoot:'G',chords:['Em','C','G','D','Em','Am','D7','G'],name:ko["etudes.emToGPinchesAndOffbeats"],english:'Em to G Offbeat Arpeggio',purpose:ko["etudes.startOnEmMoveThroughCGDAndFinishWithAm"],goal:ko["etudes.useOffbeatsAndRestsToDistinguishTheRelativeMinorOpeningFromThe"]},
 'chord-melody-response':{fixedRoot:'C',chords:['C','G','Am','Em','F','C','G','C'],name:ko["etudes.descendingCMajorFlowEighthSixteenthResponse"],english:'C Major Mixed Rhythm Response',purpose:ko["etudes.bassAndTrebleAnswerInEighthAndSixteenthNoteRhythmsOverC"],goal:ko["etudes.matchChangingRhythmicDensityAndLongDestinationNotesToTheChordProgression"]},
};
function study(spec) {
 const chordShapes=spec.chords.map(name=>CHORDS[name]),shape=[];
 const patterns=spec.rows.map((row,bar)=>{
  const chord=chordShapes[bar],bass=6-chord.frets.findIndex(f=>f!==null);
  const add=token=>{
   const string=token===B?bass:token===V?FIFTH[spec.chords[bar]]:token;
   const fret=chord.frets[6-string];
   if(fret===null)throw new Error(spec.id+': muted string '+string);
   shape.push([string,fret]);return shape.length-1;
  };
  return row.map(cell=>cell===-1?-1:Array.isArray(cell)?cell.map(add).filter((index,i,indices)=>indices.findIndex(other=>shape[other][0]===shape[index][0])===i):add(cell));
 });
 return {...spec,type:ko["etudes.arpeggios"],style:ko["etudes.ballad"],family:spec.family??'major',complete:true,accompaniment:true,
  shape,patterns,chordShapes,chordNames:spec.chords,rhythms:spec.rhythms??spec.rows.map(row=>Array(row.length).fill(String(row.length))),difficultyReason:spec.level+' · '+spec.goal};
}
export function chordStudies() {
 const progression=['C','Am','F','G','C','Am','G','C'];
 const sevenths=['Bmaj7','D#m','Emaj7','Em7','Bmaj7','D#m','Em7','Bmaj7'];
 const mixed=(id,root,chords,name)=>study({id,fixedRoot:root,family:root==='A'?'minor':'major',level:ko["etudes.intermediate"],name,english:name,bpm:56,chords,
 rows:chords.map((_,i)=>i%2?[[B,1],2,3,2,1,3,B]:[[B,2],3,1,2,3,1,B,2]),
 rhythms:chords.map((_,i)=>i%2?['8','8','8','8','8','4','4']:['8','16','16','8','8','4','8','8']),
 tupletMap:chords.map((_,i)=>i%2?[[0,1,2]]:[]),purpose:ko["etudes.alternateEighthSixteenthResponsesAndEighthNoteTripletsFromBarToBar"],goal:ko["etudes.distinguishTwoFourAndThreeSubdivisionsAtTheSameTempo"]});
 return [
  mixed('chord-am-triplet','A',['Am','G','F','E7','Dm','Am','E7','Am'],ko["etudes.amTripletAndEighthSixteenthAccompaniment"]),
  mixed('chord-g-triplet','G',['G','Em','C','D','Am','D7','G','G'],ko["etudes.gMajorTripletAndEighthSixteenthAccompaniment"]),
  study({id:'chord-small-barre',fixedRoot:'C',level:ko["etudes.beginner"],name:ko["etudes.fromCToASmallFBarre"],english:'Open C to Small F Barre',bpm:44,chords:['C','C','F','F','C','F','C','C'],rows:[[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,[B,1],-1],[[B,1],3,2,B]],purpose:ko["etudes.inBars34BeginByBarringOnlyStrings1And2"],goal:ko["etudes.afterCAndAmIntroduceASmallFBarreWithSlowQuarter"]}),
  study({id:'chord-moving-preparation',fixedRoot:'B',level:ko["etudes.intermediate"],name:ko["etudes.prepareToMoveOneBarreShape"],english:'Barre Shape Shift Preparation',bpm:48,chords:['Bmaj7','Bmaj7','Emaj7','Emaj7','D#m','D#m','Em7','Bmaj7'],rows:[[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],3,1,B]],purpose:ko["etudes.moveTheSameShapeForBmaj7Emaj7InBars14Change"],goal:ko["etudes.prepareShiftsBetweenFrets29WithSlowQuarterNotesAndRests"]}),
  study({id:'chord-melody-response',fixedRoot:'B',level:ko["etudes.advanced"],name:ko["etudes.bassAndTrebleDensityResponse"],english:'Bass and Treble Rhythm Response',bpm:60,chords:sevenths,rows:sevenths.map((_,i)=>i%2?[[B,1],2,3,2,[V,1],3,2,B]:[[B,2],3,1,2,[V,2],1,3,B]),rhythms:sevenths.map((_,i)=>i%2?['8','8','8','8','4','8','16','16']:['8','8','16','16','8','4','8','8']),purpose:ko["etudes.inBars135And7FollowTrebleSixteenthNoteResponses"],goal:ko["etudes.combineFamiliarChordShiftsWithDifferentBassAndTrebleRhythmicPositionsLong"]}),
  study({id:'chord-three-strings',fixedRoot:'C',level:ko["etudes.beginner"],name:ko["etudes.firstAccompanimentWithACChord"],english:'Open C Chord First Accompaniment',bpm:44,chords:Array(8).fill('C'),rows:FIRST,
   purpose:ko["etudes.holdTheStandardCShapeX32010PluckTheFifthStringBassAnd"],goal:ko["etudes.holdOneStandardCChordAndPluckBassAndTrebleTogetherIn"]}),
  study({id:'chord-two-grips',fixedRoot:'C',level:ko["etudes.beginner"],name:ko["etudes.openCAndAmAccompaniment"],english:'C and Am Open Chord Changes',bpm:48,chords:['C','C','Am','Am','C','C','Am','C'],rows:CHANGES,
   purpose:ko["etudes.accompanyByChangingBetweenCAndAmMuteTheRingingStringsDuring"],goal:ko["etudes.changeBetweenTwoOpenChordsAtFrets03DuringTheRests"]}),
  study({id:'chord-accompaniment',fixedRoot:'C',level:ko["etudes.intermediate"],name:ko["etudes.cAmFGAccompaniment"],english:'C Am F G Chord Progression',bpm:56,chords:progression,
   rows:progression.map((_,bar)=>bar<4?[[B,2],3,2,3,[B,1],2,3,B]:[[B,1],2,3,2,[B,2],3,2,B]),
   purpose:ko["etudes.prepareCAmFGAndPluckBassAndTrebleTogetherOn"],goal:ko["etudes.connectFourChordChangesASmallBarreAndBrokenChordEighthNote"]}),
  study({id:'chord-bass-answer',fixedRoot:'B',level:ko["etudes.intermediate"],name:ko["etudes.bmaj7DMEmaj7Em7ChordShifts"],english:'Moving Between Chord Shapes',bpm:56,chords:sevenths,
   rows:sevenths.map((_,bar)=>bar<4?[[B,1],3,2,3,[V,2],3,1,B]:[[B,2],1,3,2,[V,1],2,3,B]),
   purpose:ko["etudes.moveThroughBmaj724DM68Emaj779"],goal:ko["etudes.changeBarrePositionsAndChordShapesWhileMaintainingEighthNoteAccompanimentAnd"]}),
  study({id:'chord-sixteenths',fixedRoot:'B',level:ko["etudes.advanced"],name:ko["etudes.independentBassAndSixteenthsOverChordShifts"],english:'Moving Chords with Steady Bass',bpm:60,chords:sevenths,
   rows:sevenths.map((_,bar)=>[[B,1],3,2,1,[V,2],3,2,1,[B,1],2,3,2,[V,2],3,...(bar<4?[2,B]:[1,B])]),
   purpose:ko["etudes.useTheBmaj7DMEmaj7Em7ShiftsLearnedAtIntermediateLevel"],goal:ko["etudes.addAlternatingBassOnEveryBeatAndIndependentRhythmicAndDynamicControl"]}),
  study({id:'chord-density',fixedRoot:'B',level:ko["etudes.advanced"],name:ko["etudes.threeNotePinchesAndOffbeatResponses"],english:'Three-note Pinch and Offbeat Response',bpm:64,chords:sevenths,
   rows:sevenths.map((_,bar)=>bar%2===0?[[B,3,1],2,3,1,[V,2],-1,3,1,[B,1],3,2,-1,[V,2],3,1,B]:[[B,3,1],2,V,1,[B,2],-1,V,B]),
   purpose:ko["etudes.addThreeNotePinchesAndEighthSixteenthVariationsToThePreviousBmaj7"],goal:ko["etudes.keepFamiliarChordShapesAndPositionShiftsWhileCombiningSimultaneousPluckingAlternating"]}),
 ].flatMap(original=>{
  const addition=ADDITIONAL_PROGRESSIONS[original.id];
  if(!addition)return [original];
  const id={ 'chord-bass-answer':'chord-g-alternating','chord-sixteenths':'chord-am-circle','chord-density':'chord-em-offbeat','chord-melody-response':'chord-c-response'}[original.id];
  return [original,study({...original,...addition,id})];
 });
}
