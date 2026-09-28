import test from 'node:test';
import assert from 'node:assert/strict';
import {nightBloomsAgain as song,nightBloomsAgainDocument as document,NIGHT_BLOOMS_SHIFTS as shifts} from '../src/etudes/nightBloomsAgain.js';
import {ETUDES} from '../src/etudes/catalog.js';
import {originalGuitarPieces} from '../src/etudes/originalGuitarPieces.js';
import {etudeDifficulty} from '../src/etudes/difficultyRatings.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {parseChord,validateEtude} from '../src/etudes/notationData.js';
import {scoreBarOrder} from '../src/etudes/scoreRepeats.js';
import {guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';

const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i-1);
const route=[...range(1,16),...range(17,24),...range(17,24),...range(25,40)];
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
const timeline=guitarVoiceTimeline(song),bar=n=>document.measures[n-1];
const sounded=n=>song.measures[n-1].filter(e=>!e.rest).flatMap(e=>(e.tones??[e]).map(t=>({...t,onset:e.onset,voice:e.voice})));
const melody=n=>song.measures[n-1].filter(e=>e.voice==='melody'&&!e.rest);

test('a fifth original keeps the preceding pieces and performs 48 visits from 40 written bars',()=>{
 assert.deepEqual(originalGuitarPieces.map(s=>s.title),['달빛의 편지','아직 전하지 못한 말','창문을 열면','빛이 머무는 자리','다시 피어나는 밤']);
 assert.strictEqual(ETUDES.find(e=>e.id===song.id),song);
 assert.equal(song.measures.length,40);assert.equal(song.bpm,72);assert.equal(song.keySignature,'Am');
 assert.deepEqual(song.tuning,[64,59,55,50,45,40]);assert.equal(song.capo,0);assert.equal(etudeDifficulty(song),4);
 assert.deepEqual(scoreBarOrder(song),route);assert.equal(route.length,48);near(timeline.duration,160);
 assert.equal(document.playback.repeatCount,1);assert.equal(bar(40).endBarline,'final');
 assert.deepEqual(document.measures.flatMap((m,i)=>m.repeatStart?[i+1]:[]),[17]);
 assert.deepEqual(document.measures.flatMap((m,i)=>m.repeatEnd?[i+1]:[]),[24]);
 const slots=playbackSlots(song,route);
 route.forEach((b,visit)=>{assert.equal(slotAtTick(slots,visit*1920+1).bar,b);near(timeline.voices.find(v=>v.visit===visit).start,visit*10/3);});
 assert.deepEqual(validateEtude(song),[]);
});

test('every voice fills four beats; sparse I, low V, U and denser H retain their prescribed attacks',()=>{
 for(const m of document.measures)for(const voice of new Set(m.events.map(e=>e.voice))){
  let end=0;for(const e of m.events.filter(e=>e.voice===voice)){assert.equal(e.onset,end);end+=ticksOf(e);}assert.equal(end,1920);
 }
 for(let n=1;n<=4;n++){
  assert.deepEqual(bar(n).events.map(e=>e.duration),['8','8','4','8','8','4']);
  assert.deepEqual(bar(n).events.map(e=>e.onset),[0,240,480,960,1200,1440]);
  assert(bar(n).events.every(e=>e.notes.length===1&&!e.voice));
 }
 for(let n=1;n<=12;n++)assert(sounded(n).every(e=>e.string!==1));
 for(let n=5;n<=12;n++){
  assert.deepEqual(melody(n).map(e=>[e.onset,e.string,e.duration]),[[0,2,'2'],[960,2,'2']]);
  assert.deepEqual(bar(n).events.filter(e=>e.voice==='accompaniment').map(e=>e.notes[0].string).filter((_,i)=>i%4!==0),[4,3,4,4,3,4]);
 }
 assert.deepEqual([13,14,15,16].map(n=>melody(n).map(e=>e.fret)),[[1,1],[3,3],[5,5],[7,7]]);
 for(const n of [18,19,20,21,22,23,24,30,31,32,33,35,36])for(const half of [0,1]){
  const m=bar(n).events.filter(e=>e.voice==='accompaniment'&&!e.rest&&Math.floor(e.onset/960)===half);
  assert.deepEqual(m.map(e=>e.notes.map(t=>t.string)).slice(1),[[3,2],[4],[3,2]]);
  assert.deepEqual(m.map(e=>e.onset-half*960),[0,240,480,720]);
 }
 for(const n of [25,26,27,28])assert(bar(n).events.filter(e=>e.voice==='accompaniment'&&!e.rest).every(e=>e.notes.length===1));
});

test('L opens the chorus and reaches high E with one four-beat melody attack above eight moving attacks',()=>{
 for(const [n,fret] of [[17,8],[29,8],[34,12]]){
  assert.deepEqual(melody(n).map(e=>[e.onset,e.string,e.fret,e.duration]),[[0,1,fret,'1']]);
  const backing=bar(n).events.filter(e=>e.voice==='accompaniment'&&!e.rest);
  assert.equal(backing.length,8);assert.deepEqual(backing.map(e=>e.onset),[0,240,480,720,960,1200,1440,1680]);
  assert.deepEqual(backing.filter(e=>e.onset%960===0).map(e=>e.notes.map(t=>[t.string,t.fret])),[[[5,0]],[[5,0]]]);
  for(const voice of timeline.voices.filter(v=>v.bar===n-1&&v.string===1))near(voice.duration,10/3);
 }
 const chorus=[[8],[7,7],[5,3],[5,7],[8,10],[8,7],[5,5],[7,7]];
 chorus.forEach((frets,i)=>assert.deepEqual(melody(i+17).map(e=>e.fret),frets));
 assert.deepEqual(melody(33).map(e=>e.fret),[8,10]);assert.deepEqual(melody(34).map(e=>e.fret),[12]);
 assert.equal(Math.max(...song.measures.flat().filter(e=>!e.rest).flatMap(e=>(e.tones??[e]).map(n=>n.midi))),76);
 assert.deepEqual(melody(39).map(e=>[e.string,e.fret]),[[1,0],[2,1]]);
});

test('inversions, sevenths and inner resolutions are sounding pitches, not just chord labels',()=>{
 for(const [b,m] of song.measures.entries())for(const e of m.filter(e=>!e.rest)){
  const shape=document.measures[b].sketchVoicings.find(v=>e.onset>=v.startTick&&e.onset<v.endTick),chord=parseChord(shape.name);
  for(const n of e.tones??[e]){assert.equal(n.fret,shape.frets[6-n.string]);assert(chord.intervals.includes((n.midi-chord.pc+120)%12));assert.equal(n.finger,undefined);assert.equal(n.rightFinger,undefined);}
 }
 for(const n of [2,6])assert(sounded(n).some(e=>e.onset===0&&e.string===4&&e.fret===2&&e.midi===52));
 for(const n of [3,8,10,38]){
  const dm=bar(n).sketchVoicings.find(v=>v.name==='Dm/F');
  const tones=sounded(n).filter(e=>e.onset>=dm.startTick&&e.onset<dm.endTick);
  assert(tones.some(e=>e.string===4&&e.fret===3));
  assert.deepEqual([...new Set(tones.map(e=>e.midi%12))].sort((a,b)=>a-b),[2,5,9]);
 }
 for(const n of [4,12])for(const half of [0,1]){
  const tones=sounded(n).filter(e=>Math.floor(e.onset/960)===half);
  assert(tones.some(e=>e.string===3&&e.fret===(half?1:2)&&e.midi===(half?56:57)));
  assert(tones.some(e=>e.string===2&&e.fret===3&&e.midi===62));
 }
 for(const n of [16,24])for(const half of [0,1])assert(sounded(n).some(e=>Math.floor(e.onset/960)===half&&e.string===2&&e.fret===(half?9:10)));
 assert(sounded(27).some(e=>e.string===3&&e.fret===8&&e.midi===63));
 assert(sounded(28).some(e=>e.onset<960&&e.string===2&&e.fret===8&&e.midi===67));
 assert(sounded(28).some(e=>e.onset>=960&&e.string===2&&e.fret===9&&e.midi===68));
});

test('position changes release backing early, sustain melody independently, and preserve the quiet final Am tail',()=>{
 for(const key of shifts){
  const [n,h]=key.split(':').map(Number),events=bar(n).events,first=h*960;
  assert(events.some(e=>e.voice==='accompaniment'&&e.onset===first+720&&e.duration==='16'&&!e.rest));
  assert(events.some(e=>e.voice==='accompaniment'&&e.onset===first+840&&e.duration==='16'&&e.rest));
  assert(!events.some(e=>e.voice==='melody'&&e.rest));
 }
 assert(!bar(16).events.some(e=>e.rest),'the build flows straight into the chorus');
 for(const v of timeline.voices){
  if(v.bar===39)continue;
  const barStart=v.visit*10/3,half=Math.floor((v.start-barStart+1e-7)/(5/3));
  const end=barStart+([16,28,33].includes(v.bar)&&v.voice==='melody'?10/3:(half+1)*5/3);
  assert(v.start+v.duration<=end+1e-7);near(v.silenceAt,v.start+v.duration);
  const next=timeline.voices.find(n=>n.string===v.string&&n.start>v.start+1e-7);if(next)assert(v.silenceAt<=next.start+1e-7);
 }
 const final=timeline.voices.filter(v=>v.bar===39);
 assert.deepEqual(final.map(v=>[v.string,v.fret]).sort((a,b)=>a[0]-b[0]),[[2,1],[3,2],[4,2],[5,0]]);
 assert(final.every(v=>v.duration===10/3&&v.releaseTail===1.8&&v.silenceAt===undefined));
});

test('authored dynamics actually strengthen the repeat and final climax without letting accompaniment dominate',()=>{
 const lead=n=>melody(n)[0].velocity;
 assert(lead(17)>lead(12));assert(lead(34)>lead(17)+.15);
 assert(lead(13)<lead(14)&&lead(14)<lead(15)&&lead(15)<lead(16));
 assert(lead(25)<lead(26)&&lead(26)<lead(27)&&lead(27)<lead(28));
 assert(lead(34)>lead(35)&&lead(35)>lead(36));
 assert(lead(37)>lead(38)&&lead(38)>lead(39)&&lead(39)>lead(40));
 for(let n=5;n<=40;n++)for(const e of bar(n).events.filter(e=>e.voice==='accompaniment'&&!e.rest))assert(e.velocity<lead(n));
 for(let n=17;n<=24;n++){
  const voices=timeline.voices.filter(v=>v.bar===n-1&&v.voice==='melody');
  assert(voices.at(-1).velocity>voices[0].velocity);assert(voices.at(-1).velocity<lead(34));
 }
 assert(document.measures.every(m=>m.events.every(e=>!e.dynamicText)),'practice score omits expression text while keeping velocities');
});

test('editable save/reload retains every voice, dynamic label, repeated pass and release',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert(saveLibraryDocument(storage,document,ETUDES).saved);
 const saved=loadLibrary(storage,ETUDES).records[song.id].document;
 assert.deepEqual(saved,document);assert.deepEqual(guitarVoiceTimeline(compileScoreDocument(saved).score),timeline);
 const bad=structuredClone(document);bad.measures[0].events[0].dynamicText='x'.repeat(41);
 assert(compileScoreDocument(bad).errors.length>0);
});
