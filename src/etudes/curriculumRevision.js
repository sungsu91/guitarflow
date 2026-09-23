import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
// Authored additions fill a specific transition, not transpositions of a course.
const q=['4','4','4','4'],e=Array(8).fill('8');
const make=(id,type,level,name,shape,patterns,rhythms,purpose,extra={})=>({id,type,level,name,english:name,fixedRoot:'C',family:'major',style:ko["etudes.basics"],complete:true,bpm:level===ko["etudes.beginner"]?52:level===ko["etudes.intermediate"]?64:72,shape,patterns,rhythms:patterns.map((_,i)=>Array.isArray(rhythms[0])?rhythms[i]:rhythms),purpose,difficultyReason:`${level} · ${purpose}`,...extra});
export function curriculumAdditions(){
 const out=[];
 const g=[[6,3],[6,5],[5,2],[5,3],[5,5],[4,2],[4,4],[4,5]];
 out.push(make('scale-rhythm-bridge',ko["app.scales"],ko["etudes.beginner"],ko["etudes.connectStringsOneBeatAtATime"],g,[[0,1,2,1,0],[2,3,4,3,2],[4,5,6,5,4],[5,6,7,6,5],[7,6,5,6,7],[6,5,4,5,6],[4,3,2,3,2],[2,1,0,1,0]],['4','8','8','4','4'],ko["etudes.useEighthNotesOnJustOneBeatInBars14Then"],{fixedRoot:'G'}));
 const am=[[6,5],[6,8],[5,5],[5,7],[4,5],[4,7],[3,5],[3,7]];
 const minor={fixedRoot:'A',family:'minor',intervals:[0,3,5,7,10],style:ko["etudes.rock"]};
 out.push(make('penta-landing',ko["app.pentatonics"],ko["etudes.beginner"],ko["etudes.twoStringRoundTripToTheRoot"],am,[[0,1,2,1,0],[2,3,4,3,2],[4,5,6,5,4],[6,7,6,5,5],[4,5,4,3,2],[2,3,2,1,0],[0,1,2,1,0],[2,1,0,0,0]],['8','8','4','4','4'],ko["etudes.connectTwoNotesOnOneBeatToALongDestinationNoteCheck"],minor));
 out.push(make('penta-string-skip',ko["app.pentatonics"],ko["etudes.intermediate"],ko["etudes.pentatonicStringSkippingResponse"],am,[[0,1,4,5,4,1,0,-1],[2,3,6,7,6,3,2,-1],[4,5,0,1,0,5,4,-1],[6,7,2,3,2,7,6,-1],[0,4,1,5,1,4,0,-1],[2,6,3,7,3,6,2,-1],[4,2,5,3,2,1,0,-1],[2,1,0,1,2,1,0,0]],e,ko["etudes.skipStringsInTwoNoteGroupsInBars14ThenAlternate"],minor));
 out.push(make('penta-rhythm-application',ko["app.pentatonics"],ko["etudes.advanced"],ko["etudes.offbeatsWithStringSkipping"],am,[[ -1,0,4,1,5,4,1,0],[ -1,2,6,3,7,6,3,2],[0,1,4,5,4,1,0,-1],[2,3,6,7,6,3,2,-1],[-1,0,4,1,5,1,4,0],[-1,2,6,3,7,3,6,2],[4,2,5,3,2,1,0,-1],[2,1,0,1,2,1,0,0]],['8','16','16','16','16','8','4','4'],ko["etudes.connectAnOpeningRestAndSixteenthNoteLeapsToALongNote"],minor));
 const triads=[[5,3],[4,2],[3,0],[5,0],[4,2],[3,2]];
 out.push(make('triad-major-minor',ko["etudes.chordToneRuns"],ko["etudes.beginner"],ko["etudes.distinguishCAndAmChordTones"],triads,[[0,1,2,-1],[3,4,5,-1],[0,2,1,-1],[3,5,4,-1],[2,1,0,-1],[5,4,3,-1],[0,1,2,1],[3,4,0,0]],q,ko["etudes.distinguishCEGInBars135And7From"],{chordNames:['C','Am','C','Am','C','Am','C','C']}));
 // Correct Am shape: A2, C3, E3. One neighbouring string per note.
 out[out.length-1].shape=[[5,3],[4,2],[3,0],[5,0],[5,3],[4,2]];
 out[out.length-1].patterns[7]=[0,1,2,0];
 const c=[[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
 out.push(make('codetone-guide-tones',ko["etudes.chordToneRuns"],ko["etudes.advanced"],ko["etudes.connectThirdsAndSevenths"],c,[[3,5,7,9,10,9,7,5],[4,6,8,10,11,10,8,6],[2,4,6,7,9,7,6,4],[2,6,9,13,9,6,4,2],[5,7,9,10,9,7,5,3],[6,8,10,11,10,8,6,4],[6,7,9,11,9,7,6,2],[9,6,4,2,4,6,7,7]],e,ko["etudes.connectThe3rdsAnd7thsOfDm7G7Cmaj7PrepareFB"],{style:ko["metronome.jazz"],chordNames:['Dm7','G7','Cmaj7','Cmaj7','Dm7','G7','Cmaj7','Cmaj7']}));
 // Every pitch in the guide-tone run is a member of the named seventh chord.
 out[out.length-1].patterns=[[3,5,7,10,7,5,3,3],[6,8,10,11,10,8,6,6],[2,4,6,7,9,7,6,4],[2,6,9,13,9,6,4,2],[5,7,10,12,10,7,5,3],[6,8,10,11,10,8,6,4],[6,7,9,11,9,7,6,2],[9,6,4,2,4,6,7,7]];
 out.push(make('lick-legato-answer',ko["etudes.licks"],ko["etudes.intermediate"],ko["etudes.hammerOnAndPullOffResponse"],c,[[0,1,2,1,0,-1],[3,4,5,4,3,-1],[6,7,8,7,6,-1],[9,10,11,10,9,-1],[0,1,2,1,0,-1],[3,4,5,4,3,-1],[6,7,8,7,6,-1],[2,1,0,1,0,0]],['8','8','8','8','4','4'],ko["etudes.applyHHPToTheFirstFourNotesOfBars1"],{style:ko["components.pop"],techniqueMap:Array.from({length:8},(_,i)=>i<7?{0:'H',1:'H',2:'P'}:{0:'P',1:'P'})}));
 for(const [prefix,type,kind] of [['hammer',ko["etudes.hammerOn"],'H'],['pull',ko["etudes.pullOff"],'P'],['slide',ko["etudes.slide"],'S'],['legato',ko["etudes.legato"],'HP']]){
  const shape=[[3,5],[3,7],[3,9],[2,5],[2,6],[2,8]];
  const cell=(base,reverse=false)=>kind==='P'?[base+2,base+1,base,base+1]:reverse?[base+1,base+2,base+1,base]:[base,base+1,base+2,base+1];
  const mark=(rows,onlyMiddle=false)=>rows.map(row=>{const marks={};for(let i=0;i<row.length-1;i++){const a=shape[row[i]],b=shape[row[i+1]];if(!a||!b||a[0]!==b[0]||a[1]===b[1]||i%4===3||(onlyMiddle&&i!==1))continue;const dir=b[1]>a[1]?'H':'P';if(kind==='HP'||kind==='S'||kind===dir)marks[i]=kind==='S'?'S':dir;}return marks;});
  const beginner=Array.from({length:8},(_,i)=>{const base=i===2||i===3||i===5?3:0;return kind==='P'?[base+1,base+1,base,base]:[base,base,base+1,base+1];});beginner[7]=kind==='P'?[1,1,0,0]:[0,0,1,0];
  if(kind==='HP')for(const i of [1,3,5]){const base=i===3||i===5?3:0;beginner[i]=[base+1,base+1,base,base];}
  const beginRhythm=['4','8','8','2'];
  out.push(make(`${prefix}-contrast`,type,ko["etudes.beginner"],formatMessage(ko["etudes.comparePickedAndValueNoteVolume"], { value1: type }),shape,beginner,beginRhythm,formatMessage(ko["etudes.pickOnBeat1AndUseValueForTheTwoNotesOn"], { value1: type }),{techniqueMap:mark(beginner,true)}));
  const middle=[0,0,3,3,0,3,0,0].map((b,i)=>[...cell(b),...cell(b===0?3:0,i%2===1)]);middle[7]=[2,1,0,1,3,4,3,0];
  out.push(make(`${prefix}-handoff`,type,ko["etudes.intermediate"],formatMessage(ko["etudes.valueWithAMidBarStringChange"], { value1: type }),shape,middle,e,formatMessage(ko["etudes.changeStringsOnBeat3InBars12PracticePickingThe"], {  }),{techniqueMap:mark(middle)}));
  const advanced=[0,3,0,3,3,0,3,0].map((b,i)=>[...cell(b,i%2===1),...cell(b===0?3:0,true)]);advanced[7]=[2,1,0,1,3,4,3,0];
  out.push(make(`${prefix}-phrasing`,type,ko["etudes.advanced"],formatMessage(ko["etudes.valueControlDensityAndArrival"], { value1: type }),shape,advanced,['16','16','16','16','8','8','4','4'],formatMessage(ko["etudes.connectTheFourNotesOnBeat1WithValueChangeStringsOn"], { value1: type }),{techniqueMap:mark(advanced)}));
 }
 return out;
}
export function reviseTemplate(t){
 if(t.id==='triad-engine'||t.id==='seventh-weave'){const patterns=t.patterns.map(row=>[...row]);patterns[7][14]=2;return {...t,patterns,revision:2};}
 const c=[[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
 if(['blues-burst','density-switch','advanced-finale'].includes(t.id)){
  const progression=['C','Am','F','G','C','Am','F','C'];
  const target=[[2,3,4,2,2,-1],[5,4,2,0,5,-1],[3,4,5,7,5,-1],[6,5,4,1,4,-1],[9,8,7,4,7,-1],[5,6,7,9,5,-1],[10,9,7,5,3,-1],[9,8,7,6,7,7]];
  const motif=[[0,1,2,4,2,-1],[0,2,1,4,5,-1],[3,4,5,7,5,-1],[4,6,5,8,6,-1],[7,8,9,11,9,-1],[5,7,6,9,7,-1],[3,5,4,7,5,-1],[4,2,0,2,0,0]];
  const solo=[[2,3,4,2,7,-1],[-1,5,7,9,7,5],[3,4,5,7,5,-1],[-1,6,8,11,10,6],[7,8,9,11,9,7,9,7],[5,6,7,9,7,5],[10,9,7,5,3,-1],[9,8,7,6,7,7]];
  const names={ 'blues-burst':ko["etudes.landOnTargetNotesAtChordChanges"],'density-switch':ko["etudes.developAMotifThroughTheHarmony"],'advanced-finale':ko["etudes.targetNotesRestsAndLegatoMiniSolo"]};
  const patterns=t.id==='blues-burst'?target:t.id==='density-switch'?motif:solo;
  const rhythms=patterns.map(row=>row.length===8?['16','16','16','16','8','8','4','4']:['8','8','8','8','4','4']);
  return {...t,name:names[t.id],english:names[t.id],shape:c,patterns,rhythms,fixedRoot:'C',family:'major',intervals:[0,2,4,5,7,9,11],style:ko["components.pop"],chordNames:progression,bpm:72,revision:2,
   purpose:t.id==='blues-burst'?ko["etudes.endEachBarOnALongChordToneFirstPracticeTheE"]:t.id==='density-switch'?ko["etudes.reorderBar1SAscendingMotifInBar2ThenAdaptIt"]:ko["etudes.combineIntermediateOffbeatsHPAndTwoPositionsWithinEightBarsAnswer"],
   techniqueMap:t.id==='advanced-finale'?[{}, {},{0:'H',1:'H'}, {}, {}, {},{0:'P'}, {}]:undefined,
   difficultyReason:ko["etudes.advancedPrioritizeHarmonicArrivalsMotifContinuityRhythmAndExpressionAlongsideSpeed"]};
 }
 return t;
}
