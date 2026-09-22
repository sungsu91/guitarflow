import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,setNoteConnection} from '../src/etudes/editorCommands.js';
import {bendSemitones} from '../src/audio/scoreExpressions.js';
for(const amount of [.5,1,2])for(const phase of ['up','hold','release','up-release'])test(`${phase} ${amount} semitones saves and plays without changing rhythm`,()=>{
 const d=enterFretWithDuration(createBlankDocument(),{bar:0,event:0,string:3},7,'4');
 const next=setNoteConnection(d,{bar:0,event:0,string:3},`bend-${phase}:${amount}`),e=next.measures[0].events[0];
 assert.deepEqual(e.notes[0].bendEffect,{phase,amount});assert.equal(e.duration,d.measures[0].events[0].duration);assert.equal(e.onset,d.measures[0].events[0].onset);assert.equal(e.notes[0].fret,7);
 assert.deepEqual(compileDocumentV2(JSON.parse(JSON.stringify(next))).errors,[]);
 assert.equal(bendSemitones(e.notes[0].bendEffect,phase==='release'?0:phase==='up-release'?.5:1),amount);
 assert.equal(setNoteConnection(next,{bar:0,event:0,string:3},`bend-${phase}:${amount}`).measures[0].events[0].notes[0].bendEffect,null);
});
