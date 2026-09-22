import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,isBlankEvent,ticksOf} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,setEntryDuration} from '../src/etudes/editorCommands.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';
const at=event=>({bar:0,event,string:4});
const sounds=d=>d.measures[0].events.filter(e=>!isBlankEvent(e));
function fixture(values){let d=createBlankDocument();for(const [i,duration] of values.entries())d=enterFretWithDuration(d,at(i),4,duration);return d;}
test('two sixteenths then an eighth moves following sounds without deleting them',()=>{
 const d=fixture(['16','16','16','8','8']);
 const result=setEntryDuration(d,at(2),'8');
 assert.deepEqual(sounds(result).map(e=>e.onset),[0,120,240,480,720]);
 assert.deepEqual(sounds(result).map(e=>e.id),sounds(d).map(e=>e.id));
 assert.deepEqual(rhythmGroups(result.measures[0].events),[[0,1,2],[3,4]]);
 assert.deepEqual(compileDocumentV2(result).issues,[]);
});
test('shortening the third quarter brings the fourth note into the remaining half beat',()=>{
 const d=fixture(['4','4','4','4']);
 const half=setEntryDuration(d,at(2),'8');
 assert.equal(half.measures[0].events[3].onset,1200);
 const result=setEntryDuration(half,at(3),'8');
 assert.deepEqual(sounds(result).map(e=>e.onset),[0,480,960,1200]);
 assert.deepEqual(sounds(result).map(e=>e.duration),['4','4','8','8']);
 assert.deepEqual(rhythmGroups(result.measures[0].events),[[2,3]]);
 assert.deepEqual(sounds(result).map(e=>e.id),sounds(d).map(e=>e.id));
 assert.deepEqual(compileDocumentV2(result).issues,[]);
});
test('a full bar refuses expansion atomically instead of discarding notes',()=>{
 const d=fixture(['4','4','4','4']),before=structuredClone(d);
 assert.throws(()=>setEntryDuration(d,at(0),'2'),/마디 길이/);
 assert.deepEqual(d,before);
});

test('returning to beat three fills its eighth gap without moving beat four',()=>{
 let d=createBlankDocument();
 d=enterFretWithDuration(d,at(2),3,'8');
 const fourth=d.measures[0].events.findIndex(e=>e.onset===1440);
 d=setEntryDuration(d,at(fourth),'8');
 d=enterFretWithDuration(d,at(fourth),4,'8');
 const later=d.measures[0].events[fourth];
 const gap=d.measures[0].events.findIndex(e=>e.onset===1200);
 d=setEntryDuration(d,at(gap),'8');
 d=enterFretWithDuration(d,at(gap),5,'8');
 assert.strictEqual(d.measures[0].events.find(e=>e.id===later.id),later);
 assert.deepEqual(rhythmGroups(d.measures[0].events),[[2,3],[4]]);
 assert.deepEqual(compileDocumentV2(d).issues,[]);
});

test('a blank quarter shortened during backfill preserves the following note onset',()=>{
 let d=fixture(['4','4','4','4']);
 d.measures[0].events[2]={...d.measures[0].events[2],notes:[],rest:true,blank:true};
 const fourth=d.measures[0].events[3];
 const next=setEntryDuration(d,at(2),'8');
 assert.strictEqual(next.measures[0].events.find(e=>e.id===fourth.id),fourth);
 assert.deepEqual(next.measures[0].events.map(e=>e.onset),[0,480,960,1200,1440]);
});

for(const from of ['1','2','4','8','16'])for(const to of ['1','2','4','8','16']){
 test(`entry length ${from} to ${to} uses the same command`,()=>{
  const d=fixture([from]),next=setEntryDuration(d,at(0),to);
  assert.equal(next.measures[0].events[0].duration,to);
  assert.equal(next.measures[0].events[0].id,d.measures[0].events[0].id);
  assert.deepEqual(compileDocumentV2(next).issues,[]);
 });
}
for(const from of ['2','4','8','16'])for(const to of ['2','4','8','16']){
 test(`following notes move by the length difference ${from} to ${to}`,()=>{
  const d=fixture([from,'16']),next=setEntryDuration(d,at(0),to);
  assert.equal(next.measures[0].events[1].onset,ticksOf({duration:to}));
  assert.equal(next.measures[0].events[1].id,d.measures[0].events[1].id);
  assert.deepEqual(next.measures[0].events[1].notes,d.measures[0].events[1].notes);
  assert.deepEqual(compileDocumentV2(next).issues,[]);
 });
}
