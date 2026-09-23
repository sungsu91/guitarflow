import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {fillDrumMeasure,enterDrumNotes} from '../src/etudes/drumInput.js';
import {setDrumVoiceDuration,drumVoiceEvents} from '../src/etudes/drumVoices.js';
const rhythm={selectedDuration:'16',dottedMode:'off',tupletMode:'off'};
test('sixteenth hats and quarter kicks have independent voices and round-trip',()=>{
 let d=fillDrumMeasure(convertScoreInstrument(createBlankDocument(),'drums'),{bar:0,event:0},[42],rhythm).document;
 for(const index of [0,4,8,12])d=enterDrumNotes(d,{bar:0,event:index},[36],{...rhythm,selectedDuration:'4'}).document;
 const result=compileDocumentV2(JSON.parse(JSON.stringify(d)));assert.deepEqual(result.errors,[]);
 const upper=drumVoiceEvents(result.score.measures[0],false),lower=drumVoiceEvents(result.score.measures[0],true);
 assert.equal(upper.voiceEvents.length,16);assert.ok(upper.voiceEvents.every(e=>e.duration==='16'));
 assert.equal(lower.voiceEvents.length,4);assert.ok(lower.voiceEvents.every(e=>e.duration==='4'));
 assert.throws(()=>setDrumVoiceDuration(d,{bar:0,event:0,midi:36},'2'),/같은 드럼 성부/);
 d=setDrumVoiceDuration(d,{bar:0,event:0,midi:36},'8');assert.equal(d.measures[0].events[0].drumLowerRhythm.duration,'8');
 assert.equal(d.measures[0].events[0].drumUpperRhythm.duration,'16');
});
test('refining upper rhythm preserves an earlier long lower note',()=>{
 let d=enterDrumNotes(convertScoreInstrument(createBlankDocument(),'drums'),{bar:0,event:0},[36],{...rhythm,selectedDuration:'4'}).document;
 d=fillDrumMeasure(d,{bar:0,event:0},[42],rhythm).document;
 assert.equal(d.measures[0].events[0].drumLowerRhythm.duration,'4');
 assert.deepEqual(compileDocumentV2(d).errors,[]);
});
