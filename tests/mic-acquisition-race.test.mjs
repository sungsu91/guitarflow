import test from 'node:test';import assert from 'node:assert/strict';
import {acquireMicInput,getActiveMicInputSession,releaseActiveMicInput} from '../src/audio/micInputEngine.js';
test('a late AudioContext resume cannot steal the next screen microphone',async()=>{
 let finish;let created=0;const tracks=[];const oldWindow=globalThis.window;
 const node=()=>({connect(){},disconnect(){},gain:{value:1},frequency:{value:0},Q:{value:0},fftSize:2048,frequencyBinCount:1024});
 class Context {constructor(){this.id=++created;this.state='suspended';this.destination={};this.sampleRate=48000;}async resume(){if(this.id===1)await new Promise(r=>finish=r);this.state='running';}async close(){this.state='closed';}createMediaStreamSource(){return node();}createBiquadFilter(){return node();}createGain(){return node();}createAnalyser(){return node();}}
 globalThis.window={AudioContext:Context};
 const mediaDevices={async getUserMedia(){const track={readyState:'live',stop(){this.readyState='ended';}};tracks.push(track);return{getTracks:()=>[track],getAudioTracks:()=>[track]};}};
 try {const stale=acquireMicInput({consumerId:'old',mediaDevices});await new Promise(r=>setImmediate(r));const current=await acquireMicInput({consumerId:'tuner',mediaDevices});finish();await assert.rejects(stale,{name:'AbortError'});assert.equal(getActiveMicInputSession(),current);assert.equal(tracks[0].readyState,'ended');assert.equal(tracks[1].readyState,'live');}finally{await releaseActiveMicInput();globalThis.window=oldWindow;}
});
