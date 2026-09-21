import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setNoteConnection,setRest} from '../src/etudes/editorCommands.js';
import {scoreTimeline,guitarVoiceTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {bendSemitones,scheduleScoreExpressions} from '../src/audio/scoreExpressions.js';
import {tabPositions} from '../src/etudes/tabPositions.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const cursor={bar:0,event:0,string:1};
const fixture=()=>enterFret(createBlankDocument(),cursor,10);
test('open tie and slide outs accept a note/chord without a destination; ordinary ties still validate pitch',()=>{
 let d=fixture();d=setNoteConnection(d,cursor,'let-ring');d=setNoteConnection(d,cursor,'slide-out-down');assert.equal(d.measures[0].events[0].letRing,true);assert.equal(d.measures[0].events[0].slideOut,'down');assert.throws(()=>setNoteConnection(d,cursor,'tie'));
 assert.deepEqual(compileDocumentV2(d).errors,[]);assert.deepEqual(compileDocumentV2(d).issues,[]);
 d=enterFret(d,{...cursor,string:2},9);d=setNoteConnection(d,cursor,'slide-out-up');assert.equal(d.measures[0].events[0].notes.length,2);
 d=setNoteConnection(d,cursor,'clear');assert.equal(d.measures[0].events[0].slideOut,null);assert.equal(d.measures[0].events[0].letRing,false);
});
test('each bend phase and parenthesized pitch round trips without changing fret or rhythmic duration',()=>{
 for(const phase of ['up','hold','release','up-release']){let d=setNoteConnection(fixture(),cursor,'bend-'+phase);d=setNoteConnection(d,cursor,'parentheses');const r=compileDocumentV2(d);assert.deepEqual(r.errors,[]);assert.equal(r.score.measures[0][0].duration,'4');assert.equal(r.score.measures[0][0].midi,74);assert.equal(tabPositions(r.score.measures[0][0],6)[0].fret,'(10)');const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};assert(saveLibraryDocument(storage,d).saved);assert.deepEqual(loadLibrary(storage).records[d.id].document,d);d=setNoteConnection(d,cursor,'bend-'+phase);assert.equal(d.measures[0].events[0].notes[0].bendEffect,null);}
});
test('full bend phases use written time and keep exact endpoints',()=>{
 for(const [phase,expected] of [['up',[0,1,2]],['hold',[2,2,2]],['release',[2,1,0]],['up-release',[0,2,0]]])assert.deepEqual([0,.5,1].map(t=>bendSemitones({amount:2,phase},t)),expected);
 const score=compileDocumentV2(setNoteConnection(fixture(),cursor,'bend-up-release')).score;
 assert.equal(scoreTimeline(score).duration,1);const phrase=guitarVoiceTimeline(score).voices[0],calls=[];
 scheduleScoreExpressions({detune:{setValueCurveAtTime:(curve,at,len)=>calls.push({curve,at,len}),setValueAtTime:()=>{}}},phrase,10);assert.equal(calls[0].at,10);assert.equal(calls[0].len,1);assert.equal(calls[0].curve[0],0);assert.equal(calls[0].curve.at(-1),0);assert(Math.max(...calls[0].curve)>195);
 const resumed=voicesFrom({voices:[phrase]},.75)[0];calls.length=0;scheduleScoreExpressions({detune:{setValueCurveAtTime:(curve,at,len)=>calls.push({curve,at,len}),setValueAtTime:()=>{}}},resumed,20);assert.equal(calls[0].curve[0],100);assert.equal(calls[0].at,20);assert.equal(calls[0].len,.25);
});
test('open tie rings over written rests without changing the common timeline',()=>{
 let d=setNoteConnection(fixture(),cursor,'let-ring');d=setRest(d,{bar:0,event:1,string:1});d=enterFret(d,{bar:0,event:2,string:1},8);const s=compileDocumentV2(d).score,p=guitarVoiceTimeline(s);assert.equal(p.voices[0].duration,2);assert.equal(p.voices[0].silenceAt,undefined);assert.equal(p.duration,3);assert.equal(scoreTimeline(s,60).events.length,2);
});
test('bend on a chord affects only the selected string and invalid combinations are rejected',()=>{
 let d=enterFret(fixture(),{...cursor,string:2},12);d=setNoteConnection(d,cursor,'bend-up');assert.equal(d.measures[0].events[0].notes[1].bendEffect,undefined);
 const s=compileDocumentV2(d).score,p=guitarVoiceTimeline(s);assert(p.voices[0].expressions[0].bendEffect);assert.equal(p.voices[1].expressions[0].bendEffect,null);
 d=structuredClone(d);d.measures[0].events[0].notes[0].bendEffect={amount:99,phase:'up'};assert(compileDocumentV2(d).errors.length);
});
