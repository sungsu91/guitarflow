import test from 'node:test';
import assert from 'node:assert/strict';
import {lightStays as song,lightStaysDocument as document,LIGHT_STAYS_SHIFTS as shifts} from '../src/etudes/lightStays.js';
import {ETUDES} from '../src/etudes/catalog.js';
import {originalGuitarPieces} from '../src/etudes/originalGuitarPieces.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {parseChord,validateEtude} from '../src/etudes/notationData.js';
import {scoreBarOrder} from '../src/etudes/scoreRepeats.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i-1);
const route=[...range(1,4),...range(5,12),...range(5,12),...range(13,20),...range(13,20),...range(21,32)];
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
const audio=guitarVoiceTimeline(song);

test('a fourth independent piece retains 32 written bars and performs the exact 48-bar route at 72 BPM',()=>{
 assert.deepEqual(originalGuitarPieces.slice(0,4).map(s=>s.title),['달빛의 편지','아직 전하지 못한 말','창문을 열면','빛이 머무는 자리']);
 assert.equal(ETUDES.filter(s=>s.id===song.id).length,1);
 assert.equal(song.measures.length,32);assert.equal(song.bpm,72);assert.equal(song.keySignature,'Em');
 assert.deepEqual(song.tuning,[64,59,55,50,45,40]);assert.equal(song.capo,0);
 assert.deepEqual(scoreBarOrder(song),route);assert.equal(route.length,48);near(audio.duration,160);
 assert.equal(document.playback.repeatCount,1);assert.equal(document.measures.at(-1).endBarline,'final');
 assert.deepEqual(validateEtude(song),[]);
 assert.deepEqual(document.measures.flatMap((m,i)=>m.repeatStart?[i+1]:[]),[5,13]);
 assert.deepEqual(document.measures.flatMap((m,i)=>m.repeatEnd?[i+1]:[]),[12,20]);
});

test('both voices independently fill every bar; ties sustain one melody attack, not extra plucks',()=>{
 for(const bar of document.measures)for(const voice of ['melody','accompaniment']){
  let end=0;for(const e of bar.events.filter(e=>e.voice===voice)){assert.equal(e.onset,end);end+=ticksOf(e);}assert.equal(end,1920);
 }
 assert.equal(audio.voices.length,538);
 const slots=playbackSlots(song,route);
 for(let visit=0;visit<48;visit++){
  assert.equal(slotAtTick(slots,visit*1920+1).bar,route[visit]);
  const attacks=audio.voices.filter(v=>v.visit===visit);
  near(attacks[0].start,visit*10/3);
  for(const half of route[visit]===31?[0]:[0,1]){
   const start=visit*10/3+half*5/3,first=attacks.filter(v=>Math.abs(v.start-start)<1e-7);
   assert(first.some(v=>v.string===1));assert(first.some(v=>v.string>=4));
   const melody=first.find(v=>v.string===1);
   near(melody.duration,route[visit]===31?10/3:shifts.has(`${route[visit]+1}:${half}`)?35/24:5/3);
  }
 }
});

test('all specified melodies and the inner sus4 resolutions are actual sounding notes',()=>{
 const expected=[[0,3],[0,0],[0,0],[2,2],[3,2],[0,0],[3,2],[0,0],[0,0],[3,2],[0,0],[2,2],[3,5],[7,7],[7,5],[3,2],[5,3],[3,2],[0,0],[2,2],[3,2],[0,0],[3,2],[0,0],[0,0],[3,2],[2,2],[3,0],[0,0],[0,2],[2,2],[0]];
 for(const [bar,melody] of expected.entries())assert.deepEqual(song.measures[bar].filter(e=>e.voice==='melody'&&!e.rest&&e.onset%960===0).map(e=>e.fret),melody);
 for(const number of [4,12,20,27]){
  const notes=audio.voices.filter(n=>n.bar===number-1&&n.string===4);
  assert(notes.some(n=>n.fret===2&&n.midi===52));assert(notes.some(n=>n.fret===1&&n.midi===51));
 }
 for(const number of [10,18,26])assert.deepEqual(expected[number-1],[3,2]);
 assert.deepEqual(parseChord('B7sus4').intervals,[0,5,7,10]);
 for(const [bar,measure] of song.measures.entries())for(const e of measure.filter(e=>!e.rest)){
  const shape=document.measures[bar].sketchVoicings.find(v=>e.onset>=v.startTick&&e.onset<v.endTick),chord=parseChord(shape.name);
  for(const n of e.tones??[e]){assert.equal(shape.frets[6-n.string],n.fret);assert(chord.intervals.includes((n.midi-chord.pc+120)%12)||n.midi%12===chord.bassPc);assert.equal(n.finger,undefined);assert.equal(n.rightFinger,undefined);}
 }
});

test('reviewed high-position moves have written sixteenth rests and no impossible held strings',()=>{
 for(const key of shifts){const [number,half]=key.split(':').map(Number),bar=document.measures[number-1],end=half*960+840;
  for(const voice of ['melody','accompaniment'])assert(bar.events.some(e=>e.voice===voice&&e.rest&&e.onset===end&&e.duration==='16'));
 }
 for(const voice of audio.voices){
  if(voice.bar===31)continue;
  const half=Math.floor((voice.start-voice.visit*10/3+1e-7)/(5/3));
  const boundary=voice.visit*10/3+half*5/3+(shifts.has(`${voice.bar+1}:${half}`)?35/24:5/3);
  assert(voice.start+voice.duration<=boundary+1e-7);near(voice.silenceAt,voice.start+voice.duration);
  const next=audio.voices.find(n=>n.string===voice.string&&n.start>voice.start+1e-7);
  if(next)assert(voice.silenceAt<=next.start+1e-7);
 }
 const last=audio.voices.filter(n=>n.bar===31);
 assert.deepEqual(last.map(n=>[n.string,n.fret]).sort((a,b)=>a[0]-b[0]),[[1,0],[2,0],[3,0],[6,0]]);
 assert(last.every(n=>n.releaseTail===1.6&&n.silenceAt===undefined));
});

test('melody stays above accompaniment, the second A is clearer, and return dynamics ease gradually',()=>{
 for(const [i,bar] of song.measures.entries()){
  const melody=bar.find(e=>e.voice==='melody'&&!e.rest);
  assert(bar.filter(e=>e.voice==='accompaniment'&&!e.rest).every(e=>e.velocity<melody.velocity));
  if(i>=20&&i<24)assert(melody.velocity<=song.measures[i-1].find(e=>e.voice==='melody').velocity);
 }
 for(let bar=4;bar<=11;bar++){
  const attacks=audio.voices.filter(n=>n.bar===bar&&n.string===1);
  assert(attacks[2].velocity>attacks[0].velocity);
 }
 for(let bar=20;bar<=23;bar++)assert(song.measures[bar-1][0].velocity-song.measures[bar][0].velocity<=.025);
});

test('portable save/reload preserves polyphony, repeat dynamics, damping and tail; invalid voice duration is rejected',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert(saveLibraryDocument(storage,document,ETUDES).saved);
 const saved=loadLibrary(storage,ETUDES).records[song.id].document;
 assert.deepEqual(saved,document);assert.deepEqual(guitarVoiceTimeline(compileScoreDocument(saved).score),audio);
 const bad=structuredClone(document);bad.measures[0].events.find(e=>e.voice==='melody').duration='1';
 assert(compileScoreDocument(bad).issues.length>0);
 const mistimed=structuredClone(document);mistimed.measures[0].events[1].sustainTicks=5000;
 assert(compileScoreDocument(mistimed).errors.length>0);
});
