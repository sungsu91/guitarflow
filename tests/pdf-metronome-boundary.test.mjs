import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as clock from '../src/audio/transportClock.js';
import {practiceCountIn} from '../src/etudes/practiceCountIn.js';

function metronome(options={}){
 const refs=[],effects=[],sounds=[];let refIndex=0,timer;
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const audio={currentTime:0,state:'running',createGain:()=>({gain:param,connect(){},disconnect(){}}),createOscillator:()=>({frequency:{value:0},connect(){},disconnect(){},start(time){sounds.push(time);},stop(){}})};
 const sandbox={...clock,practiceCountIn,ko:{},AUDIO_BUS_IDS:{METRONOME:'metro'},getAudioBusInput:()=>null,resumeSharedAudioContext:async()=>audio,smoothAudioParam(){},
  useRef(value){return refs[refIndex++]??(refs[refIndex-1]={current:value});},useState:value=>[value,()=>{}],useCallback:f=>f,useEffect:f=>effects.push(f),useMetronomeVolume:()=>({volume:1}),
  setInterval:f=>{timer=f;return 1;},clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},document:{addEventListener(){},removeEventListener(){}},
 };
 const source=fs.readFileSync(new URL('../src/etudes/useEtudeMetronome.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default function useEtudeMetronome','function useEtudeMetronome');
 vm.runInNewContext(source+'\nglobalThis.useMetro=useEtudeMetronome;',sandbox);
 const render=bpm=>{refIndex=0;effects.length=0;return sandbox.useMetro(bpm,{liveTempo:true,...options});};
 const metro=render(240);
 return {metro,audio,sounds,advance(to){while(audio.currentTime<to){audio.currentTime+=.025;timer();}},tempo(bpm){render(bpm);effects[2]();}};
}

test('finite PDF playback never queues a click beyond its last beat even when painting is delayed',async()=>{
 const m=metronome({endBeat:40});await m.metro.start();m.advance(12);
 assert.equal(m.sounds.length,40);m.sounds.forEach((time,i)=>assert.ok(Math.abs(time-(.06+i*.25))<1e-8));
});

test('count-in and subdivided final beats are retained but the following downbeat is excluded',async()=>{
 const m=metronome({endBeat:4,clicksPerBeat:2});await m.metro.start({leadIn:practiceCountIn(true,[4,4],240)});m.advance(4);
 assert.equal(m.sounds.length,12);assert.ok(Math.max(...m.sounds)<2.06);
});

test('seeked playback keeps its absolute ending after a live tempo change',async()=>{
 const m=metronome({endBeat:8});await m.metro.start({beatOffset:4});m.advance(.4);const before=m.sounds.length,now=m.audio.currentTime;m.tempo(120);m.advance(4);
 // A tempo change may replace a scheduled click; no attack reaches or exceeds the new endpoint.
 const position=4+(now-.06)/.25,stopTime=now+(8-position)*.5;
 assert.ok(m.sounds.every(time=>time<stopTime+1e-8));
 assert.equal(m.sounds.slice(before).length,2);
});

test('unbounded practice loops continue across the same ending',async()=>{
 const m=metronome();await m.metro.start();m.advance(3);assert.ok(m.sounds.length>8);
});
