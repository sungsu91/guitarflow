import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {enterFret,enterFretWithDuration,enterMutedTone,deleteTone} from '../src/etudes/editorCommands.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const at=string=>({bar:0,event:0,string});
test('X replaces only the selected string and retains fret, rhythm and other voices',()=>{
 let d=enterFretWithDuration(createBlankDocument(),at(6),9,'8');d=enterFret(d,at(5),7);
 const muted=enterMutedTone(d,at(6),'4'),e=muted.measures[0].events[0];
 assert.equal(e.duration,'8');assert.equal(e.notes[0].fret,9);assert.equal(e.notes[0].dead,true);assert.deepEqual(e.notes[1],d.measures[0].events[0].notes[1]);
 assert.deepEqual(muted.measures[0].events.map(e=>[e.onset,ticksOf(e)]),d.measures[0].events.map(e=>[e.onset,ticksOf(e)]));
 const notes=scoreTimeline(compileDocumentV2(muted).score).events;assert.equal(notes.find(n=>n.string===6).dead,true);assert.equal(notes.find(n=>n.string===5).dead,false);
 const restored=enterFret(muted,at(6),12);assert.equal(restored.measures[0].events[0].notes[0].dead,undefined);assert.equal(restored.measures[0].events[0].notes[0].fret,12);
});
test('X can be entered on strings 2, 3 and 5 at the same onset without muting another fret',()=>{
 let d=enterFretWithDuration(createBlankDocument(),at(6),9,'8');for(const string of [2,3,5])d=enterMutedTone(d,at(string),'8');
 const loaded=JSON.parse(JSON.stringify(d)),r=compileDocumentV2(loaded);assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);
 assert.deepEqual(loaded.measures[0].events[0].notes.filter(n=>n.dead).map(n=>n.string),[2,3,5]);
 const removed=deleteTone(loaded,at(3));assert.deepEqual(removed.measures[0].events[0].notes.map(n=>n.string),[6,2,5]);
 assert(scoreTimeline(r.score).events.every(n=>n.start===0));
});
test('triplet X retains exact 160 ticks and the original group',()=>{
 let d=ensureTriplet(createBlankDocument(),at(6),'8');d=enterFret(d,at(6),7);
 assert.match(compileDocumentV2(d).issues.join(' '),/셋잇단음표 그룹 미완성/);
 for(const event of [1,2])d=enterFret(d,{bar:0,event,string:6},7);
 const muted=enterMutedTone(d,at(6),'16');assert.deepEqual(muted.measures[0].events[0].tuplet,d.measures[0].events[0].tuplet);assert.equal(ticksOf(muted.measures[0].events[0]),160);assert.deepEqual(compileDocumentV2(muted).issues,[]);
});
test('legacy event-wide mutes remain readable and editing one fret only unmutes that string',()=>{
 let d=enterFret(createBlankDocument(),at(6),9);d=enterFret(d,at(5),7);d.measures[0].events[0].dead=true;
 assert(scoreTimeline(compileDocumentV2(d).score).events.every(n=>n.dead));
 const changed=enterFret(d,at(6),12),notes=scoreTimeline(compileDocumentV2(changed).score).events;
 assert.equal(notes.find(n=>n.string===6).dead,false);assert.equal(notes.find(n=>n.string===5).dead,true);
});
