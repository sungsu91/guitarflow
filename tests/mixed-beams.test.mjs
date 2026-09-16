import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,ticksOf,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setEventDuration,setDottedEighth} from '../src/etudes/editorCommands.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
function fixture(durations,dotted=false){let d=createBlankDocument(),onset=0;d.measures[0].events=durations.map((duration,i)=>{const e={...blankEvent(onset,duration),...(dotted&&i===0?{dotted:true}:{})};onset+=ticksOf(e);return e;});for(let i=0;i<durations.length;i++)for(const [string,fret] of [[6,9],[5,7]])d=enterFret(d,{bar:0,event:i,string},fret);return d;}
for(const [label,durations,dotted,ticks] of [['eighth-sixteenth-sixteenth',['8','16','16'],false,480],['three normal sixteenths',['16','16','16'],false,360],['dotted eighth plus three sixteenths',['8','16','16','16'],true,720]])test(label+' preserves timing through grouping and reload',()=>{
const d=fixture(durations,dotted),range={bar:0,start:0,end:durations.length-1},joined=setBeamRange(d,range,'join'),loaded=JSON.parse(JSON.stringify(joined));
assert.deepEqual(rhythmGroups(loaded.measures[0].events),[durations.map((_,i)=>i)]);assert.equal(loaded.measures[0].events.reduce((a,e)=>a+ticksOf(e),0),ticks);
assert.deepEqual(loaded.measures[0].events.map(({beamBefore,...e})=>e),d.measures[0].events);assert(loaded.measures[0].events.every(e=>!e.tuplet));
assert.deepEqual(scoreTimeline(compileDocumentV2(loaded).score),scoreTimeline(compileDocumentV2(d).score));assert.deepEqual(setBeamRange(loaded,range,'auto'),d);
});
test('dot edit consumes only empty time and preserves later notes',()=>{
let d=createBlankDocument();d=setEventDuration(d,{bar:0,event:0},'8');d=enterFret(d,{bar:0,event:2,string:5},7);const next=d.measures[0].events[2];const dotted=setDottedEighth(d,{bar:0,event:0});assert.equal(ticksOf(dotted.measures[0].events[0]),360);assert.deepEqual(dotted.measures[0].events[2],next);assert.deepEqual(dotted.measures[0].events.map(e=>e.onset),[0,360,480,960,1440]);assert.equal(compileDocumentV2(dotted).issues.length,0);
const plain=setDottedEighth(dotted,{bar:0,event:0},false);assert.equal(ticksOf(plain.measures[0].events[0]),240);assert(plain.measures[0].events.some(e=>e===next));assert.equal(compileDocumentV2(plain).issues.length,0);
const occupied=enterFret(d,{bar:0,event:1,string:5},5);assert.throws(()=>setDottedEighth(occupied,{bar:0,event:0}),/빈 시간/);assert.throws(()=>ensureTriplet(dotted,{bar:0,event:0}),/점8분/);
const changed=setEventDuration(dotted,{bar:0,event:0},'16');assert.equal(changed.measures[0].events[0].dotted,undefined);assert.equal(compileDocumentV2(changed).issues.length,0);
});
test('three sixteenths can be joined across the automatic beat boundary',()=>{
const d=fixture(['16','16','16']);d.measures[0].events.forEach(e=>e.onset+=240);d.measures[0].events.unshift(blankEvent(0,'8'));
assert.deepEqual(rhythmGroups(d.measures[0].events),[[1,2],[3]]);
const joined=setBeamRange(d,{bar:0,start:1,end:3},'join');assert.deepEqual(rhythmGroups(joined.measures[0].events),[[1,2,3]]);assert.equal(joined.measures[0].events.at(-1).onset,480);
});
