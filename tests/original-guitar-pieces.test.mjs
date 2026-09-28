import test from 'node:test';
import assert from 'node:assert/strict';
import {originalGuitarPieces} from '../src/etudes/originalGuitarPieces.js';
import {ETUDES} from '../src/etudes/catalog.js';
import {compileScoreDocument,toScoreDocument} from '../src/etudes/scoreDocument.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {validateEtude} from '../src/etudes/notationData.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {scoreBarOrder} from '../src/etudes/scoreRepeats.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const songs=originalGuitarPieces.slice(0,3);
const [moon,ballad,pop]=songs;
const pairs=e=>e.notes.map(n=>[n.string,n.fret]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≈ ${b}`);
const bars=Array.from({length:16},(_,i)=>i);

test('three named complete pieces are registered with standard tuning and exactly 16 four-beat bars',()=>{
 assert.deepEqual(songs.map(s=>[s.title,s.keySignature,s.bpm]),[['달빛의 편지','Am',72],['아직 전하지 못한 말','C',66],['창문을 열면','G',96]]);
 for(const song of songs){
  assert.strictEqual(ETUDES.find(e=>e.id===song.id),song);
  assert.deepEqual(validateEtude(song),[]);
  assert.deepEqual(song.tuning,[64,59,55,50,45,40]);assert.equal(song.capo,0);assert.deepEqual(song.meter,[4,4]);
  assert.equal(song.measures.length,16);assert.equal(song.document.playback.repeatCount,1);assert.equal(song.document.measures[15].endBarline,'final');
  assert.deepEqual(scoreBarOrder(song),bars);
  for(const m of song.document.measures){
   let tick=0;for(const e of m.events){assert.equal(e.onset,tick);tick+=ticksOf(e);assert.equal(e.rest,false);assert.equal(e.arpeggio,undefined);assert.equal(e.picking,undefined);assert.equal(e.pickStroke,undefined);
    for(const n of e.notes){assert(Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=3);assert.equal(n.finger,undefined);assert.equal(n.rightFinger,undefined);}
   }assert.equal(tick,1920);
  }
 }
});

test('all harmony progressions match the authored 16-bar plans',()=>{
 assert.deepEqual(moon.harmony,['Am','E7','Am','Dm','G','C','Fmaj7','E7','Dm','Am/C','Fmaj7','E7','Am','Dm','E7','Am']);
 assert.deepEqual(ballad.harmony,['C','G/B','Am','Fmaj7','C/E','Dm7','G7','Cmaj7','Am','Em','Fmaj7','C/E','Dm7','G7','Cmaj7','C']);
 assert.deepEqual(pop.harmony,['G','Dsus4 → D','Em7','Cadd9','G/B','Am7','Cadd9','Dsus4 → D','Em7','Cadd9','G','D','Cadd9','G/B','Dsus4 → D','G']);
});

test('Moonlight Letter uses eight eighths, only the requested strings, and two final K2 pinches',()=>{
 const expected={Am:[5,0,2,1,0],Dm:[4,0,2,3,1],G:[6,3,0,0,3],C:[5,3,0,1,0],Fmaj7:[4,3,2,1,0],E7:[6,0,1,0,0],'Am/C':[5,3,2,1,0]};
 for(const [bar,m] of moon.document.measures.entries()){
  const [b,f,third,second,first]=expected[moon.harmony[bar]];
  assert.deepEqual(m.events.map(e=>e.duration),Array(8).fill('8'));
  const half=[[[b,f]],[[3,third]],[[2,second],[1,first]],[[3,third]]];
  assert.deepEqual(m.events.map(pairs),bar===15?[...half,...half]:[[[b,f]],[[3,third]],[[2,second]],[[1,first]],[[2,second]],[[3,third]],[[2,second]],[[3,third]]]);
 }
});

test('ballad breathes on beats one and three, moves only in bars 9–12, and holds the final C for four beats',()=>{
 const expected={C:[5,3,0,1,0],'G/B':[5,2,0,0,3],Am:[5,0,2,1,0],Fmaj7:[4,3,2,1,0],'C/E':[4,2,0,1,0],Dm7:[4,0,2,1,1],G7:[6,3,0,0,1],Em:[6,0,0,0,0],Cmaj7:[5,3,0,0,0]};
 for(const [bar,m] of ballad.document.measures.entries()){
  const [b,f,third,second,first]=expected[ballad.harmony[bar]],moving=bar>=8&&bar<=11;
  if(bar===15){assert.deepEqual(m.events.map(e=>e.duration),['1']);assert.deepEqual(pairs(m.events[0]),[[5,3],[3,0],[2,1],[1,0]]);continue;}
  assert.deepEqual(m.events.map(e=>e.duration),moving?Array(8).fill('8'):['4','8','8','4','8','8']);
  assert.deepEqual(m.events.map(e=>e.onset),moving?[0,240,480,720,960,1200,1440,1680]:[0,480,720,960,1440,1680]);
  const half=[[[b,f]],[[3,third]],[[2,second],[1,first]],[[3,third]]];
  assert.deepEqual(m.events.map(pairs),moving?[...half,...half]:[[[b,f]],[[3,third]],[[2,second]],[[1,first]],[[2,second]],[[3,third]]]);
 }
});

test('pop alternates the specified basses and resolves Dsus4 exactly at beat three',()=>{
 const expected={G:[6,3,4,0,0,3,3],Em7:[6,0,4,2,0,3,3],Cadd9:[5,3,4,2,0,3,3],'G/B':[5,2,4,0,0,3,3],Am7:[5,0,4,2,0,1,0],D:[4,0,5,0,2,3,2]};
 for(const [bar,m] of pop.document.measures.entries()){
  if([1,7,14].includes(bar)){
   assert.deepEqual(m.events.map(e=>e.duration),Array(8).fill('8'));
   assert.deepEqual(m.events.map(pairs),[[[4,0]],[[3,2]],[[2,3],[1,3]],[[3,2]],[[4,0]],[[3,2]],[[2,3],[1,2]],[[3,2]]]);
   assert.deepEqual(m.sketchVoicings.map(v=>[v.name,v.startTick,v.endTick]),[['Dsus4',0,960],['D',960,1920]]);assert.equal(m.events[4].onset,960);continue;
  }
  if(bar===15){assert.deepEqual(m.events.map(e=>e.duration),['4','4','2']);assert.deepEqual(m.events.map(pairs),[[[6,3]],[[3,0],[2,3],[1,3]],[[6,3],[3,0],[2,3],[1,3]]]);continue;}
  const [b,f,a,af,third,second,first]=expected[pop.harmony[bar]];
  assert.deepEqual(m.events.map(e=>e.duration),['4','4','4','4']);
  assert.deepEqual(m.events.map(pairs),[[[b,f]],[[3,third],[2,second],[1,first]],[[a,af]],[[2,second],[1,first]]]);
 }
});

test('every written note sounds at its exact onset, simultaneous chords share starts, and playhead slots agree',()=>{
 for(const song of songs){
  const timeline=scoreTimeline(song),voices=guitarVoiceTimeline(song),slots=playbackSlots(song,timeline.order);
  near(timeline.duration,64*60/song.bpm);near(voices.duration,timeline.duration);
  assert.equal(timeline.events.length,song.document.measures.reduce((sum,m)=>sum+m.events.reduce((sum,e)=>sum+e.notes.length,0),0));
  song.document.measures.forEach((m,bar)=>m.events.forEach((event,index)=>{
   const sounding=timeline.events.filter(n=>n.id===event.id),start=(bar*1920+event.onset)/480*60/song.bpm;
   assert.equal(sounding.length,event.notes.length);assert.equal(new Set(sounding.map(n=>n.start)).size,1);
   for(const [i,note] of sounding.entries()){near(note.start,start);near(note.duration,ticksOf(event)/480*60/song.bpm);assert.equal(note.midi,song.tuning[event.notes[i].string-1]+event.notes[i].fret);assert.equal(note.velocity,event.velocity);}
   const position=slotAtTick(slots,bar*1920+event.onset+1);assert.equal(position.bar,bar);assert.equal(position.event,index);
  }));
  assert(voices.voices.every(v=>v.start+v.duration<=timeline.duration+1e-8));
 }
});

test('soft opening, middle growth and quiet return are retained in audio voices',()=>{
 const levels=moon.measures.map(m=>m[0].velocity);
 assert(levels.slice(0,8).every(v=>v===levels[0]));
 for(let i=8;i<12;i++)assert(levels[i]>levels[i-1]);
 for(let i=12;i<16;i++)assert(levels[i]<levels[i-1]);
 assert(ballad.measures[10][0].velocity>ballad.measures[0][0].velocity);
 assert(pop.measures.slice(8,12).every(m=>m[0].velocity>pop.measures[0][0].velocity));
 for(const song of songs)for(const voice of guitarVoiceTimeline(song).voices)assert.equal(voice.velocity,song.measures[voice.bar][0].velocity);
});

test('saving and reloading actual editable scores preserves all notes, durations, dynamics and one-shot playback',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 for(const song of songs){const document=JSON.parse(JSON.stringify(toScoreDocument(song)));const saved=saveLibraryDocument(storage,document,ETUDES);assert.equal(saved.saved,true);assert.equal(saved.record.status,'saved');}
 const records=loadLibrary(storage,ETUDES).records;
 for(const song of songs){const document=records[song.id].document;assert.deepEqual(document,song.document);const compiled=compileScoreDocument(document,song);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);assert.deepEqual(scoreTimeline(compiled.score),scoreTimeline(song));}
});
