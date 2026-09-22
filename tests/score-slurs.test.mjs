import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,cloneMeasures} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,setNoteConnection} from '../src/etudes/editorCommands.js';
import {setSlur,slurSpans} from '../src/etudes/slurs.js';
import {guitarVoiceTimeline,scoreTimeline} from '../src/etudes/scorePlayback.js';
const at=event=>({bar:0,event,string:3});
function fixture(){let d=createBlankDocument();for(let i=0;i<3;i++)d=enterFretWithDuration(d,at(i),3+i*2,'8');return d;}
test('a slur accepts different pitches and only changes its endpoint metadata',()=>{
 const d=fixture(),events=d.measures[0].events;
 const next=setSlur(d,events[0].id,events[2].id);
 assert.deepEqual(next.measures[0].events.map(({slurTo,...e})=>e),events);
 assert.deepEqual(scoreTimeline(compileDocumentV2(next).score),scoreTimeline(compileDocumentV2(d).score));
 assert.equal(slurSpans(next.measures).length,1);
 assert.throws(()=>setNoteConnection(d,at(0),'tie'),/같은/);
 assert.throws(()=>setSlur(d,events[2].id,events[0].id));
 assert.throws(()=>setSlur(d,events[0].id,events[3].id));
});
test('slide alone repicks its destination; slurred slide glides without a new attack',()=>{
 const d=setNoteConnection(fixture(),at(0),'S'),events=d.measures[0].events;
 const plain=guitarVoiceTimeline(compileDocumentV2(d).score);
 assert.equal(plain.voices.length,3);
 assert.equal(plain.voices[0].segments.at(-1).connection,'S');
 assert.equal(plain.voices[0].segments.at(-1).duration,0);
 const next=setSlur(d,events[0].id,events[1].id),legato=guitarVoiceTimeline(compileDocumentV2(next).score);
 assert.equal(legato.voices.length,2);
 assert.equal(legato.voices[0].segments.length,2);
 assert.equal(legato.voices[0].segments[1].connection,'S');
 assert(legato.voices[0].duration>plain.voices[0].duration);
 assert.equal(next.measures[0].events[0].technique,'S');
});
test('slurs survive JSON and remap endpoints when measures are copied',()=>{
 const d=fixture(),events=d.measures[0].events,next=setSlur(d,events[0].id,events[2].id);
 const loaded=JSON.parse(JSON.stringify(next)),copied=cloneMeasures(loaded.measures);
 assert.equal(slurSpans(loaded.measures).length,1);
 assert.equal(copied[0].events[0].slurTo,copied[0].events[2].id);
 assert.notEqual(copied[0].events[0].slurTo,events[2].id);
});
