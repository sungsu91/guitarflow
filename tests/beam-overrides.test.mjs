import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,blankMeasure,compileDocumentV2,compileStats} from '../src/etudes/scoreModel.js';
import {enterFret} from '../src/etudes/editorCommands.js';
import {setBeamBefore,canJoinBeam,overrideBeamGroups} from '../src/etudes/beamOverrides.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
const at=event=>({bar:0,event,string:6});
export function fixture(duration='8'){let d=createBlankDocument();d.measures[0].events=Array.from({length:Number(duration)},(_,i)=>blankEvent(i*1920/Number(duration),duration));for(let i=0;i<Number(duration);i++)d=enterFret(d,at(i),i%2?7:5);return d;}
test('4/4 keeps default 2+2+2+2, connects 3 and 7 into 4+4, resets to automatic',()=>{
 const d=fixture();assert.deepEqual(rhythmGroups(d.measures[0].events),[[0,1],[2,3],[4,5],[6,7]]);
 let custom=setBeamBefore(setBeamBefore(setBeamBefore(d,at(2),'join'),at(4),'break'),at(6),'join');assert.deepEqual(rhythmGroups(custom.measures[0].events),[[0,1,2,3],[4,5,6,7]]);
 const loaded=JSON.parse(JSON.stringify(custom));assert.deepEqual(compileDocumentV2(loaded).errors,[]);assert.deepEqual(scoreTimeline(compileDocumentV2(d).score),scoreTimeline(compileDocumentV2(loaded).score));assert.deepEqual(guitarVoiceTimeline(compileDocumentV2(d).score),guitarVoiceTimeline(compileDocumentV2(loaded).score));
 assert.deepEqual(custom.measures[0].events.map(({beamBefore,...e})=>e),d.measures[0].events);
 for(const i of [2,4,6])custom=setBeamBefore(custom,at(i),'auto');assert.deepEqual(custom,d);
});
test('rests, gaps, long values and measure boundaries cannot join; valid mixed eighth/sixteenth durations can',()=>{
 const d=fixture();assert.equal(canJoinBeam(d.measures[0].events,0),false);assert.throws(()=>setBeamBefore(d,at(0),'join'));
 for(const change of [e=>e.rest=true,e=>e.duration='4',e=>e.onset+=10]){const broken=structuredClone(d);change(broken.measures[0].events[1]);assert.throws(()=>setBeamBefore(broken,at(2),'join'));}
 const mixed=[{duration:'8',onset:0,rest:false},{duration:'16',onset:240,rest:false,beamBefore:'join'},{duration:'16',onset:360,rest:false}];assert.deepEqual(overrideBeamGroups(mixed,[[0],[1,2]]),[[0,1,2]]);assert.deepEqual(mixed.map(e=>e.duration),['8','16','16']);
});
test('only the selected measure compiles and sixteenth values remain sixteenths',()=>{
 const d=fixture('16');d.measures.push(blankMeasure());assert.deepEqual(compileDocumentV2(d).errors,[]);const count=compileStats.bars,next=setBeamBefore(d,at(4),'join');compileDocumentV2(next);assert.equal(compileStats.bars-count,1);assert.equal(next.measures[1],d.measures[1]);assert(next.measures[0].events.every(e=>e.duration==='16'));
});
