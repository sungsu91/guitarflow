import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setNoteConnection,setRest,deleteTone} from '../src/etudes/editorCommands.js';
import {guitarVoiceTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {createPalmMuteGate,palmMuteOffset} from '../src/audio/scorePalmMute.js';
const c={bar:0,event:0,string:6};
test('P.M. toggles, persists, clears and never changes pitch or rhythm',()=>{
 const plain=enterFret(createBlankDocument(),c,3),muted=setNoteConnection(plain,c,'palmMute');
 const result=compileDocumentV2(JSON.parse(JSON.stringify(muted)));assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 const voice=guitarVoiceTimeline(result.score).voices[0];assert.equal(voice.midi,43);assert.equal(voice.duration,1);assert.equal(voice.palmMute,true);
 assert.equal(setNoteConnection(muted,c,'palmMute').measures[0].events[0].palmMute,false);
 for(const next of [setRest(muted,c),deleteTone(muted,c),setNoteConnection(muted,c,'clear')])assert.equal(next.measures[0].events[0].palmMute,false);
 assert.throws(()=>setNoteConnection(createBlankDocument(),c,'palmMute'));
 assert(compileDocumentV2({...muted,measures:[{...muted.measures[0],events:muted.measures[0].events.map((e,i)=>i?e:{...e,palmMute:'yes'})}]}).errors.length);
});
test('P.M. applies to every chord tone and leaves next unmuted attack alone',()=>{
 let d=enterFret(createBlankDocument(),c,3);d=enterFret(d,{...c,string:5},3);d=setNoteConnection(d,c,'palmMute');d=enterFret(d,{...c,event:1},5);
 const {voices}=guitarVoiceTimeline(compileDocumentV2(d).score);assert.deepEqual(voices.map(palmMuteOffset),[0,0,null]);
});
test('damping begins at the muted member of a tie, including seek into the tie',()=>{
 let d=enterFret(createBlankDocument(),c,3);d=enterFret(d,{...c,event:1},3);d=setNoteConnection(d,c,'tie');d=setNoteConnection(d,{...c,event:1},'palmMute');
 const timeline=guitarVoiceTimeline(compileDocumentV2(d).score);assert.equal(timeline.voices.length,1);assert.equal(timeline.voices[0].duration,2);assert.equal(palmMuteOffset(timeline.voices[0]),1);assert.equal(palmMuteOffset(voicesFrom(timeline,1.2)[0]),0);
});
test('audio gate damps a pitched sound without creating noise or altering transport duration',()=>{
 const calls=[],output={},gate={gain:{setValueAtTime:(...a)=>calls.push(['set',...a]),exponentialRampToValueAtTime:(...a)=>calls.push(['ramp',...a])},connect:o=>assert.equal(o,output)};
 const audio={createGain:()=>gate},phrase={start:0,duration:2,palmMute:true,segments:[]};
 assert.equal(createPalmMuteGate(audio,phrase,10,output),gate);assert.deepEqual(calls,[['set',1,10],['set',1,10.008],['ramp',.0001,10.18]]);assert.equal(phrase.duration,2);
 assert.equal(createPalmMuteGate(audio,{...phrase,palmMute:false},10,output),null);
});
