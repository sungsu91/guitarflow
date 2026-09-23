import ko from "../i18n/locales/ko.js";
import {compileScoreDocument} from './scoreDocument.js';

// A separate authored composition: no random notes or default-grip lookup.
// Frets are ordered 6→1. Each row below explicitly chooses its sounding strings.
export const DAYLIGHT_VOICINGS={
 Am7:{name:'Am7',frets:[null,0,2,0,1,0],family:'minor',quality:'m7',root:9},
 Am7g:{name:'Am7',frets:[null,0,2,0,1,3],family:'minor',quality:'m7',root:9},
 Cmaj7G:{name:'Cmaj7/G',frets:[3,3,2,0,0,0],family:'major',quality:'maj7',root:0,bass:7},
 F:{name:'Fmaj7',frets:[null,null,3,2,1,0],family:'major',quality:'maj7',root:5},
 Flow:{name:'Fmaj7',frets:[1,null,3,2,1,0],family:'major',quality:'maj7',root:5},
 Es:{name:'Esus4',frets:[0,2,2,2,0,0],family:'major',quality:'sus4',root:4},
 E7:{name:'E7',frets:[0,2,0,1,0,0],family:'major',quality:'7',root:4},
 Em7:{name:'Em7',frets:[0,2,2,0,3,0],family:'minor',quality:'m7',root:4},
 C9:{name:'Cadd9',frets:[null,3,2,0,3,0],family:'major',quality:'add9',root:0},
 Dm7:{name:'Dm7',frets:[null,null,0,2,1,1],family:'minor',quality:'m7',root:2},
 AmC:{name:'Am/C',frets:[null,3,2,2,1,0],family:'minor',quality:'none',root:9,bass:0},
 B7:{name:'B7',frets:[null,2,1,2,0,2],family:'major',quality:'7',root:11},
 G6:{name:'G6',frets:[3,2,0,0,0,0],family:'major',quality:'6',root:7},
 Gs:{name:'Gsus4',frets:[3,null,0,0,1,3],family:'major',quality:'sus4',root:7},
 G:{name:'G',frets:[3,2,0,0,0,3],family:'major',quality:'none',root:7},
 GB:{name:'G/B',frets:[null,2,0,0,3,3],family:'major',quality:'none',root:7,bass:11},
 CE:{name:'C/E',frets:[0,3,2,0,1,0],family:'major',quality:'none',root:0,bass:4},
 Cmaj7:{name:'Cmaj7',frets:[null,3,2,0,0,0],family:'major',quality:'maj7',root:0},
 Em7G:{name:'Em7/G',frets:[3,2,0,0,0,0],family:'minor',quality:'m7',root:4,bass:7},
 FA:{name:'Fmaj7/A',frets:[null,0,3,2,1,0],family:'major',quality:'maj7',root:5,bass:9},
 // A compact Cadd9 grip at VIII, with the melody D on fret 10.
 C9hi:{name:'Cadd9',frets:[8,null,10,9,8,10],family:'major',quality:'add9',root:0},
 GBhi:{name:'G/B',frets:[7,null,9,7,8,7],family:'major',quality:'none',root:7,bass:11},
 Am7hi:{name:'Am7',frets:[5,null,5,5,5,8],family:'minor',quality:'m7',root:9},
 Em7hi:{name:'Em7',frets:[null,7,9,7,8,7],family:'minor',quality:'m7',root:4},
 Fhi:{name:'Fmaj7',frets:[null,8,7,5,5,5],family:'major',quality:'maj7',root:5},
 CEhi:{name:'C/E',frets:[null,7,5,5,5,8],family:'major',quality:'none',root:0,bass:4},
 Dm7hi:{name:'Dm7',frets:[null,5,7,5,6,5],family:'minor',quality:'m7',root:2},
 Ghi:{name:'G',frets:[null,10,9,7,8,7],family:'major',quality:'none',root:7},
};

// Written 40 bars / performed 56. Pre 2 has its own answer rhythm, so there
// is no distant section jump to decipher on a narrow mobile screen.
export const DAYLIGHT_SECTIONS=[
 {name:'INTRO',start:0,count:2,mark:'INT'},
 {name:'VERSE A',start:2,count:8,mark:'VERSE',repeat:true},
 {name:'PRE',start:10,count:2,mark:'B'},
 {name:'CHORUS',start:12,count:8,mark:'CHORUS',repeat:true},
 {name:'INTERLUDE',start:20,count:2,mark:'INTERLUDE'},
 {name:'VERSE B',start:22,count:4,mark:'VERSE'},
 {name:'PRE 2',start:26,count:2,mark:'B'},
 {name:'FINAL CHORUS',start:28,count:8,mark:'CHORUS'},
 {name:'OUTRO',start:36,count:4,mark:'OUT'},
];

// Harmony: key@beats; event: strings:duration. '+' is a simultaneous pinch,
// '|' separates beats for the author, '-' is a rest, '~' explicitly lets ring.
// Melody slots are intentional; intervening inner voices are not scale runs.
const rows=[
 // Intro: a melody pickup inside beat one; the thumb joins on its offbeat.
 ['Am7@2 Cmaj7G@2','1:8 5:16 4:16 | 3+2:16 1:8 2:16 | 6+1:8 5:8 | 4:8 3+2:16 1:16'],
 ['F@2 Es@1 E7@1','4+1:8 3:16 2:16 | 1:16 3+2:8 -:16 | 6+3:8 5+2:8 | 6+3:8 4+2+1:8'],
 // Verse A: an eight-bar question / answer, with breathing room at bar ends.
 ['Am7g@4','5+2:8 4:8 | 1:8 3:16 2:16 | 5:4 | 3+1:8 -:8'],
 ['Em7@4','6+1:8 5:16 3:16 | 2:8 4:8 | 6:8 3+2:8 | 1:8 -:8'],
 ['F@4','4+1:8 3:8 | 2:16 3:8 1:16 | 4:8 2+1:8 | 3:8 2:8'],
 ['C9@4','5:8 4:16 3:16 | 2:8 1:8 | 5:4 | 3+2:8 -:8'],
 ['Dm7@4','4+1:8 3:8 | 2:8 3:16 1:16 | 4:4 | 2+1:8 -:8'],
 ['AmC@4','5+1:8 4:16 3:16 | 2:8 1:8 | 5:8 3+2:8 | 1:8 -:8'],
 ['B7@4','5:8 -:16 4:16 | 3:16 2+1:8 4:16 | 5+1:4 | 3:8 2:8'],
 ['E7@4','6:8 4:8 | 3+2:16 1:8 5:16 | 6+1:8 4:16 3:16 | 2+1:8 -:8'],
 // Compressed Pre: the last beat makes the C→B suspension explicit.
 ['F@2 G6@2','4+1:8 3:16 2:16 | 1:16 3+2:8 4:16 | 6+1:8 5:16 4:16 | 3+2:16 1:8 4:16'],
 ['Em7@1 Am7@1 Dm7@1 Gs@0.5 G@0.5','6+2:8 5+3:8 | 5+1:8 4+3+2:8 | 4+1:8 3+2:8 | 6+4+2+1:8 6+4+2+1:8'],
 // Chorus: bass + sung top note, then an inner dyad answering between them.
 ['C9@4','5+1~:8 4:16 3:16 | 2:16 3+1:8 4:16 | 1:4 | 5:16 3+2:8 1:16'],
 ['GB@4','1:8 5:16 3:16 | 2:16 3:16 1:8 | 5+2:8 3:8 | 1:16 4+2:8 -:16'],
 ['Am7g@4','5+1~:8 4:16 3:16 | 2:16 3+1:8 4:16 | 1:4 | 5:16 3+2:8 1:16'],
 ['Em7@4','1:8 6:16 5+3:16 | 2:16 4:16 1:8 | 6+2:8 3:8 | 1:16 3+2:8 -:16'],
 ['F@4','4+2+1:8 3:16 2:16 | 1:16 3+2:8 4:16 | 1:4 | 3:16 2+1:8 4:16'],
 ['CE@4','1:8 6:16 4+3:16 | 2:16 3:16 1:8 | 5+2:8 3:8 | 1:16 3+2:8 -:16'],
 ['Dm7@2 G@2','4+1:8 3:16 2:16 | 1:16 3+2:8 4:16 | 6+1:8 4:16 3:16 | 2:16 3+1:8 4:16'],
 ['C9@4','5+1:8 4:16 3:16 | 2:8 3+1:8 | 5+2:4 | 1:8 -:8'],
 // Interlude: two short top-string replies; there is no ornamental filler.
 ['Am7@2 GB@2','5+2:8 3:16 1:16 | 4:8 2+1:8 | 5+1:8 4:16 3:16 | 2:16 1:8 -:16'],
 ['Cmaj7@2 E7@2','5+1:8 4:16 3:16 | 2:8 1:8 | 6+2:8 4:16 3:16 | 1:16 2:8 -:16'],
 // Verse B: A→G→F→E over two bars. First half of each bar answers its second.
 ['Am7@2 Em7G@2','5+1:8 4:8 | 3+2:16 1:8 -:16 | 6+1:8 5:8 | 4+2:8 3:8'],
 ['Flow@2 CE@2','6+1:8 3:8 | 2:16 1:8 3:16 | 6+2:8 5:8 | 4+3:8 1:8'],
 ['Dm7@2 FA@2','4+1:8 3:8 | 2:16 3+1:8 -:16 | 5+1:8 4:8 | 3+2:8 1:8'],
 ['B7@2 E7@2','5:8 4:16 3:16 | 2+1:8 -:8 | 6+1:8 4:8 | 3+2:16 1:8 5:16'],
 // Pre 2: same harmony, a changed answer and longer melody arrivals.
 ['F@2 G6@2','4+1:8 3:16 2:16 | 1:4 | 6+1:8 5:16 4:16 | 3+2:16 1:8 4:16'],
 ['Em7@1 Am7@1 Dm7@1 Gs@0.5 G@0.5','6+2:16 5:16 3:8 | 5+1:8 4+3+2:8 | 4+1:16 3:16 2:8 | 6+4+2+1:8 6+4+2+1:8'],
 // Final: the same rhythmic identity, now voiced as D–B–C–B–A–C–B–D.
 ['C9hi@4','6+1~:8 4:16 3:16 | 2:16 3+1:8 4:16 | 1:4 | 6:16 3+2:8 1:16'],
 ['GBhi@4','1:8 6:16 3:16 | 2:16 3:8 1:16 | 6+2:8 3:8 | 1:16 4+2:8 -:16'],
 ['Am7hi@4','6+1~:8 4:16 3:16 | 2:16 3+1:8 4:16 | 1:4 | 6:16 3+2:8 1:16'],
 ['Em7hi@4','1:8 5:16 4+3:16 | 2:16 3:8 1:16 | 5+2:8 3:8 | 1:16 3+2:8 -:16'],
 ['Fhi@4','5+2+1:8 4:16 3:16 | 2:16 3+1:8 4:16 | 1:4 | 5:16 3+2:8 1:16'],
 ['CEhi@4','1:8 5:16 4+3:16 | 2:16 3:8 1:16 | 5+2:8 3:8 | 1:16 4+2:8 -:16'],
 ['Dm7hi@2 Ghi@2','5+1:8 4:16 3:16 | 2:16 3+1:8 4:16 | 5+1:8 4:16 3:16 | 2:16 3+1:8 4:16'],
 ['C9hi@4','6+1:8 4:16 3:16 | 2:8 3+1:8 | 6+2:4 | 1:8 -:8'],
 // Outro: keep 92 BPM; relax only the final two bars, never a big strum.
 ['F@2 G6@2','4+1:8 3:16 2:16 | 1:16 3+2:8 4:16 | 6+1:8 5:16 4:16 | 2:16 3+1:8 4:16'],
 ['Em7@1 Am7@1 Dm7@2','6+2:8 5+3:8 | 5+1:8 4+3+2:8 | 4+1:8 3:16 2:16 | 1:16 3+2:8 4:16'],
 ['Gs@2 G@2','6+2:4 4+1:8 3:8 | 6+2:4 4+1:8 -:8'],
 ['C9@4','5~:4 4+3~:8 2+1~:8 | -:4 -:4'],
];

const id='C-daylight-fingerstyle-sketch';
export const daylightDocument={
 format:'fretiva.etude',version:2,id,templateId:'daylight-fingerstyle-sketch',kind:'builtin',
 origin:{templateId:'daylight-fingerstyle-sketch',revision:1},instrument:'guitar',tuning:[64,59,55,50,45,40],
 title:'햇살 사이로 · 핑거스타일 작곡 스케치',english:'A Little Further · Fingerstyle Sketch',
 bpm:92,meter:[4,4],keySignature:'C',viewSettings:{tabRhythm:true,notationView:'tab'},
 purpose:ko["etudes.warmUpbeatMelodicFingerstyleWithASenseOfForwardMotion40Written"],
 tips:[
  'Intro 1–2 → Verse A 3–10 ×2 → Pre 11–12 → Chorus 13–20 ×2 → Interlude 21–22 → Verse B 23–26 → Pre 27–28 → Final 29–36 → Outro 37–40.',
  ko["etudes.playStackedTabNumbersTogetherAlternateBassAndMelodyPinchesMiddleVoice"],
  ko["etudes.letTheLongNotesOnStrings1And2SingAndPlay"],
  ko["etudes.theBassInBars2324DescendsAGFEBars"],
  ko["etudes.thePreChorusIsCondensedToTwoBarsInItsFinalBar"],
  ko["etudes.listenForGsus4GOnBeat3OfBar39AndC"],
 ],
 measures:rows.map(([plan,pattern],bar)=>{
  let changeTick=0;
  const voicings=plan.split(' ').map(item=>{
   const [key,length]=item.split('@'),startTick=changeTick;changeTick+=Number(length)*480;
   return {key,...DAYLIGHT_VOICINGS[key],startTick,endTick:changeTick};
  });
  let onset=0;
  const events=pattern.split(/\s+/).filter(token=>token!=='|').map((token,i)=>{
   const [raw,duration]=token.split(':'),strings=raw.replace('~',''),rest=strings==='-',letRing=raw.includes('~');
   const grip=voicings.find(v=>onset>=v.startTick&&onset<v.endTick);
   const event={id:`${id}:${bar}:${i}`,onset,duration,rest,technique:null,letRing,
    notes:rest?[]:strings.split('+').map((s,j)=>({id:`${id}:${bar}:${i}:${j}`,string:Number(s),fret:grip.frets[6-Number(s)],locked:true}))};
   onset+=1920/Number(duration);return event;
  });
  const section=DAYLIGHT_SECTIONS.find(s=>s.start===bar),ending=DAYLIGHT_SECTIONS.find(s=>s.start+s.count-1===bar);
  return {id:`${id}:bar:${bar}`,chord:null,harmony:voicings.map(v=>v.name).join(' → '),
   ...(section?{sectionLabel:section.mark}:{}),...(section?.repeat?{repeatStart:true}:{}),
   ...(ending?.repeat?{repeatEnd:true}:{}),events,sketchVoicings:voicings};
 }),
};
const result=compileScoreDocument(daylightDocument,{root:'C',difficultyReason:ko["etudes.intermediateConnectBassAndTrebleMelodyWithMixedRhythmsAndPositionShifts"],level:ko["etudes.intermediate"],style:ko["etudes.fingerstyle"],type:ko["etudes.arpeggios"],lesson:1001,trackLesson:8});
if(!result.score||result.errors.length||result.issues.length)throw Error(JSON.stringify({errors:result.errors,issues:result.issues}));
export const daylightFingerstyle={...result.score,edited:false,pedagogy:{
 objective:daylightDocument.purpose,prerequisites:[],preparation:ko["etudes.startAfterLearningOpenChordsSmallBarresAndSimultaneousBassAndTreble"],
 instructions:daylightDocument.tips[1],keyBars:[],links:[],checks:[ko["etudes.playTheVerseAndChorusRepeatsTwiceEachOnly"],ko["etudes.bringOutTheTrebleMelodyWhileGentlyPluckingTheInnerDyads"]],
 tempo:{start:72,target:92},review:ko["etudes.aSketchForCompositionInspirationAdjustFingeringAndDynamicsToSuitYour"],
}};
