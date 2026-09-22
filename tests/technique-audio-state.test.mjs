import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,newId,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {guitarVoiceTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {expressionCents} from '../src/audio/scoreExpressions.js';
const tone=(string=2,fret=5,bendEffect)=>({id:newId('tone'),string,fret,bendEffect});
function fixture(){const d=createBlankDocument();d.bpm=60;d.measures[0].events=Array.from({length:4},(_,i)=>({...blankEvent(i*480,'4'),rest:false,blank:false,notes:[tone()]}));return d;}
test('hold and release inherit a quarter bend, one source, exact transport',()=>{
 const d=fixture(),e=d.measures[0].events;e[0].notes[0].bendEffect={amount:.5,phase:'up'};e[1].notes[0].bendEffect={amount:2,phase:'hold'};e[2].notes[0].bendEffect={amount:2,phase:'release'};
 const t=guitarVoiceTimeline(compileDocumentV2(d).score);assert.equal(t.duration,4);assert.equal(t.voices.length,2);
 const expressions=t.voices[0].segments.flatMap(s=>s.expressions);assert.equal(expressionCents(expressions[0],1),50);assert.equal(expressionCents(expressions[1],1.5),50);assert.equal(expressionCents(expressions[2],2),50);assert.equal(expressionCents(expressions[2],3),0);
 assert.equal(expressionCents(t.voices[1].expressions[0],3.2),0);
 assert.equal(expressionCents(voicesFrom(t,1.5)[0].segments[0].expressions[0],1.5),50);
});
test('bend then pull-off resets detune and leaves parallel chord string untouched',()=>{
 const d=fixture(),e=d.measures[0].events;e[0].notes=[tone(2,7,{amount:2,phase:'up'}),tone(3,5)];e[0].technique='P';e[1].notes=[tone(2,5),tone(3,5)];
 const t=guitarVoiceTimeline(compileDocumentV2(d).score),voice=t.voices.find(v=>v.string===2);assert.equal(voice.segments[1].connection,'P');assert.equal(expressionCents(voice.segments[1].expressions[0],1),0);assert.ok(t.voices.filter(v=>v.string===3).every(v=>v.expressions.every(x=>!x.bendEffect)));
});
test('slide edges stay inside written time and approach/leave the authored pitch',()=>{
 const x={start:0,duration:1};assert.equal(expressionCents({...x,slideIn:'up'},0),-300);assert.equal(expressionCents({...x,slideIn:'up'},.2),0);assert.equal(expressionCents({...x,slideOut:'down'},0),0);assert.ok(Math.abs(expressionCents({...x,slideOut:'down'},1)+300)<1e-8);
});
