import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setNoteConnection,setRest} from '../src/etudes/editorCommands.js';
import {guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
const c={bar:0,event:0,string:6};
test('connections validate target without changing timing; harmonic pitch and ornaments round trip',()=>{
 let d=enterFret(createBlankDocument(),c,5);d=enterFret(d,{...c,event:1},7);d=setNoteConnection(d,c,'H');assert.equal(compileDocumentV2(d).issues.length,0);assert.equal(guitarVoiceTimeline(compileDocumentV2(d).score).voices[0].segments[1].connection,'H');assert.throws(()=>setNoteConnection(d,c,'P'));assert.throws(()=>setNoteConnection(d,c,'tie'));
 d=setNoteConnection(d,c,'clear');d=setNoteConnection(d,c,'harmonic');d=setNoteConnection(d,c,'vibrato');assert.equal(compileDocumentV2(d).score.measures[0][0].midi,d.tuning[5]+24);assert.equal(guitarVoiceTimeline(compileDocumentV2(d).score).voices[0].vibrato,true);assert.deepEqual(compileDocumentV2(JSON.parse(JSON.stringify(d))).score.measures,compileDocumentV2(d).score.measures);assert.deepEqual(d.measures[0].events.map(e=>e.onset),[0,480,960,1440]);d=setRest(d,c);assert.equal(d.measures[0].events[0].vibrato,false);
});
test('arpeggio direction changes string attack order only, retains bar length',()=>{
 let d=createBlankDocument();for(const string of [2,3,5])d=enterFret(d,{...c,string},5);
 for(const [kind,strings] of [['arpeggio-up',[5,3,2]],['arpeggio-down',[2,3,5]]]){const plan=guitarVoiceTimeline(compileDocumentV2(setNoteConnection(d,c,kind)).score);assert.deepEqual(plan.voices.map(v=>v.string),strings);assert.deepEqual(plan.voices.map(v=>v.start),[0,.025,.05]);assert.equal(plan.duration,1);assert(plan.voices.every(v=>Math.abs(v.start+v.duration-1)<1e-8));}
});
