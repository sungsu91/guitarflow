import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setRest} from '../src/etudes/editorCommands.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';
import {rhythmGroups as readRhythmGroups} from '../src/etudes/tabRhythm.js';
// Legacy override utilities remain readable; production engraving uses automatic groups.
const rhythmGroups=(events,meter)=>readRhythmGroups(events,meter,{automatic:false});
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
function fixture(){let d=createBlankDocument();d.measures[0].events=Array.from({length:8},(_,i)=>blankEvent(i*240,'8'));for(let i=0;i<8;i++){d=enterFret(d,{bar:0,event:i,string:6},9);d=enterFret(d,{bar:0,event:i,string:5},7);}return d;}
const groups=d=>rhythmGroups(d.measures[0].events,d.meter);
const range=(start,end)=>({bar:0,start,end});
test('two selected eighth ranges yield 4+4 with identical timing, frets and persistence',()=>{
 const d=fixture(),before=structuredClone(d),a=setBeamRange(d,range(0,3),'join'),b=setBeamRange(a,range(7,4),'join');
 assert.deepEqual(groups(d),[[0,1],[2,3],[4,5],[6,7]]);
 assert.deepEqual(groups(b),[[0,1,2,3],[4,5,6,7]]);assert.deepEqual(d,before);
 const loaded=JSON.parse(JSON.stringify(b));assert.deepEqual(groups(loaded),groups(b));
 assert.deepEqual(scoreTimeline(compileDocumentV2(loaded).score),scoreTimeline(compileDocumentV2(d).score));
 assert.deepEqual(loaded.measures[0].events.map(({beamBefore,...e})=>e),d.measures[0].events);
 const restored=setBeamRange(setBeamRange(b,range(0,3),'auto'),range(4,7),'auto');assert.deepEqual(restored,d);
 const cut=setBeamRange(b,range(0,3),'break');assert.deepEqual(groups(cut),[[0],[1],[2],[3],[4,5,6,7]]);
});
test('range edges isolate a group even in the middle of a beat',()=>{
 assert.deepEqual(groups(setBeamRange(fixture(),range(1,4),'join')),[[0],[1,2,3,4],[5],[6,7]]);
});
test('reject rests, empty slots, gaps and invalid ranges without mutations',()=>{
 const d=fixture(),rest=setRest(d,{bar:0,event:1,string:6});assert.throws(()=>setBeamRange(rest,range(0,3),'join'),/쉼표/);
 const gap=structuredClone(d);gap.measures[0].events[2].onset++;assert.throws(()=>setBeamRange(gap,range(0,3),'join'),/빈 시간/);
 assert.throws(()=>setBeamRange(d,range(2,2),'join'),/두 개/);assert.throws(()=>setBeamRange(d,range(0,8),'join'));
 assert.throws(()=>setBeamRange(createBlankDocument(),range(0,1),'join'),/쉼표/);
});
test('beam editing never creates or merges triplets',()=>{
 let d=ensureTriplet(createBlankDocument(),{bar:0,event:0});for(let i=0;i<3;i++)d=enterFret(d,{bar:0,event:i,string:6},5);
 assert.throws(()=>setBeamRange(d,range(0,1),'join'),/3연음/);
 const joined=setBeamRange(d,range(0,2),'join');assert.deepEqual(joined.measures[0].events.map(e=>e.tuplet),d.measures[0].events.map(e=>e.tuplet));
 assert.deepEqual(scoreTimeline(compileDocumentV2(joined).score),scoreTimeline(compileDocumentV2(d).score));
});
