import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFret} from '../src/pdf/tab-import/recognition.js';
import {createBlankDocument,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
import {enterFret} from '../src/etudes/editorCommands.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';

test('a measured missing seven cap excludes only that alternative; uncertainty still survives',()=>{
 const c={id:'jpeg',string:4,stringDistance:.016,cx:100,width:16,parts:1,sevenCap:false,ocr:{text:'2',confidence:.95,agrees:true,alternatives:[{text:'7',confidence:.88}]}},slot={x:100,confidence:.97},staff={spacing:31};
 assert.equal(classifyFret(c,slot,staff).fret,2);
 for(const sevenCap of [true,undefined])assert(classifyFret({...c,sevenCap},slot,staff).reasons.includes('ambiguous-digit'));
 assert(classifyFret({...c,ocr:{...c.ocr,alternatives:[{text:'3',confidence:.88}]}},slot,staff).reasons.includes('ambiguous-digit'));
 for(const patch of [{confidence:.80},{agrees:false},{shapeRejected:'missing-stroke'}])assert.notEqual(classifyFret({...c,ocr:{...c.ocr,...patch}},slot,staff).status,'confirmed');
 assert.equal(c.ocr.alternatives[0].text,'7'); // Keep raw evidence for review.
});

for(const count of [3,6])for(const duration of ['4','8','16','32'])test(`${count}:${count===3?2:4} ${duration}th notes keep exact entry, compile and playback timing`,()=>{
 let d=ensureTriplet(createBlankDocument(),{bar:0,event:0},duration,count);
 for(let event=0;event<count;event++)d=enterFret(d,{bar:0,event,string:1},event);
 const group=d.measures[0].events.slice(0,count),total=1920/Number(duration)*(count===3?2:4);
 assert.equal(group.reduce((n,e)=>n+ticksOf(e),0),total);
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);
 for(const bpm of [60,137,240]){
  const played=scoreTimeline(compiled.score,bpm).events;
  assert.equal(played.length,count);
  for(const [i,e]of played.entries()){
   assert(Math.abs(e.start-i*total/count/480*60/bpm)<1e-10);
   assert(Math.abs(e.duration-total/count/480*60/bpm)<1e-10);
  }
 }
});

test('interleaved accompaniment never breaks or joins the other voice tuplet beams',()=>{
 const t={actualNotes:3,normalNotes:2,groupId:'melody-triplet'};
 const events=[{onset:0,duration:'8',tuplet:t,voice:'melody'},{onset:0,duration:'2',voice:'accomp'}, {onset:160,duration:'8',tuplet:t,voice:'melody'},{onset:320,duration:'8',tuplet:t,voice:'melody'}];
 assert.deepEqual(rhythmGroups(events),[[0,2,3]]);
 const two=events.concat([{onset:480,duration:'8',voice:'accomp'},{onset:720,duration:'8',voice:'accomp'}]);
 assert.deepEqual(rhythmGroups(two),[[0,2,3],[4,5]]);
});
