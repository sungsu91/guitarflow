import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,isBlankEvent} from '../src/etudes/scoreModel.js';
import {enterFret,setEventDuration,cursorStep,setRest} from '../src/etudes/editorCommands.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';

const at=event=>({bar:0,event,string:6});
const enter=(d,event,duration='8',fret=3)=>inputRhythm(d,at(event),{selectedDuration:duration},'note',fret).document;

test('shortening beat three enters its second eighth before the original fourth beat',()=>{
 let d=createBlankDocument();
 for(let i=0;i<4;i++)d=enterFret(d,at(i),i+1);
 const original=d.measures[0].events;
 d=setEventDuration(d,at(2),'8');
 const cursor=cursorStep(d,at(2),1);
 assert.equal(d.measures[0].events[cursor.event].onset,1200);
 assert(isBlankEvent(d.measures[0].events[cursor.event]));
 d=enter(d,cursor.event);
 assert.deepEqual(d.measures[0].events.map(e=>e.duration),['4','4','8','8','4']);
 assert.deepEqual(d.measures[0].events.map(e=>e.onset),[0,480,960,1200,1440]);
 assert.deepEqual(rhythmGroups(d.measures[0].events),[[2,3]]);
 for(const [before,after] of [[0,0],[1,1],[3,4]])assert.strictEqual(d.measures[0].events[after],original[before]);
 assert.deepEqual(compileDocumentV2(d).issues,[]);
});

test('legacy manual joins cannot change automatic beat grouping or new entry',()=>{
 let d=createBlankDocument();
 for(const [i,duration] of ['8','8','16','16','8'].entries())d=enter(d,i,duration);
 d=setBeamRange(d,{bar:0,start:0,end:4},'join');
 d=enter(d,5);
 assert.deepEqual(rhythmGroups(d.measures[0].events),[[0,1],[2,3,4],[5]]);
 assert.equal(d.measures[0].events[5].beamBefore,undefined);
 assert.deepEqual(d.measures[0].events.slice(4,6).map(e=>e.onset),[720,960]);
 assert.deepEqual(compileDocumentV2(d).issues,[]);
});

test('rests interrupt continued eighth entry',()=>{
 let d=enter(createBlankDocument(),0);
 d=setRest(setEventDuration(d,at(1),'8'),at(1));
 d=enter(d,2);
 assert.deepEqual(rhythmGroups(d.measures[0].events),[[0],[2]]);
});
