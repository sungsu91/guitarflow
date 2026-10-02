import test from 'node:test';
import assert from 'node:assert/strict';
import {editorPresets,editorPresetForBeat,createPattern,replaceEditorBeat,validPattern,timeline,readStore,clone,BEATS} from '../src/rhythm-trainer/model.js';
import {expandEditorBeat,sustainedNotation} from '../src/rhythm-trainer/editorNotes.js';
import {TIME_SIGNATURES,beatTicks} from '../src/rhythm-trainer/meter.js';

test('basic editor contains whole, half, quarter, eighth and sixteenth values without changing stored banks',()=>{
 assert.deepEqual(editorPresets('basic').map(p=>p.id),['whole','half','quarter','eighths','sixteenths']);
 assert.ok(!editorPresets('sixteenth').some(p=>p.id==='sixteenths'));
 assert.ok(editorPresets('basic','6/8').some(p=>p.id==='compound-six'));
 assert.ok(!editorPresets('sixteenth','6/8').some(p=>p.id==='compound-six'));
 assert.deepEqual(BEATS[4].map(n=>n.ticks),[3,3,3,3]);
});

test('whole and half entry preserve every meter and produce one sounding attack with the exact duration',()=>{
 for(const meter of TIME_SIGNATURES)for(const ticks of [24,48]){
  const p=createPattern(meter),before=clone(p),fit=ticks<=p.meter*beatTicks(p);
  const next=replaceEditorBeat(p,0,0,[{ticks,rest:false}]);assert.deepEqual(p,before);
  if(!fit){assert.equal(next,null);continue;}
  assert.ok(validPattern(next),`${meter} ${ticks}`);
  const events=timeline(next).filter(e=>e.measure===0&&!e.rest);
  assert.equal(events.filter(e=>!e.continuation).length,1);
  assert.equal(events.reduce((sum,e)=>sum+e.ticks,0),ticks);
  const span=sustainedNotation(next.measures[0]);assert.equal(span.heads.get(0).duration,ticks);
  assert.equal(span.hidden.size,Math.ceil(ticks/beatTicks(p))-1);
  assert.equal(editorPresetForBeat(next.measures[0][0],p).id,ticks===48?'whole':'half');
  assert.deepEqual(readStore({getItem:()=>JSON.stringify({patterns:[next],draft:next})}).draft,next);
 }
});

test('long rests retain duration without sounding or inventing ties',()=>{
 for(const meter of ['4/4','12/8'])for(const ticks of [24,48]){
  const next=replaceEditorBeat(createPattern(meter),0,0,[{ticks,rest:true}]);assert.ok(validPattern(next));
  assert.ok(timeline(next).every(e=>e.rest&&!e.tie));
  assert.equal(sustainedNotation(next.measures[0]).heads.get(0).duration,ticks);
 }
});

test('long entry cannot overrun the selected bar or overwrite the next one',()=>{
 const p=createPattern();const before=clone(p);
 assert.equal(replaceEditorBeat(p,0,1,[{ticks:48,rest:false}]),null);
 assert.equal(replaceEditorBeat(p,0,3,[{ticks:24,rest:false}]),null);
 const next=replaceEditorBeat(p,0,2,[{ticks:24,rest:false}]);assert.ok(validPattern(next));
 assert.deepEqual(next.measures[1],p.measures[1]);assert.deepEqual(p,before);
});

test('editing a covered beat reveals valid ties and removes a stale whole-note drawing',()=>{
 const whole=replaceEditorBeat(createPattern(),0,0,[{ticks:48,rest:false}]);
 const next=replaceEditorBeat(whole,0,1,[{ticks:12,rest:true}]);
 assert.ok(validPattern(next));assert.equal(sustainedNotation(next.measures[0]).heads.size,0);
 assert.equal(next.measures[0][0][0].sustainTicks,undefined);assert.equal(next.measures[0][0][0].tie,undefined);
 assert.equal(whole.measures[0][0][0].sustainTicks,48);
});

test('core editing uses the same span rules while keeping practice measures untouched',()=>{
 const p=createPattern();p.core=clone(p.measures[0]);
 const next=replaceEditorBeat(p,0,0,[{ticks:48,rest:false}],{target:'core'});
 assert.ok(validPattern(next));assert.deepEqual(next.measures,p.measures);
 assert.equal(sustainedNotation(next.core).heads.get(0).duration,48);
 p.core=p.core.slice(0,1);assert.equal(replaceEditorBeat(p,0,0,[{ticks:24,rest:false}],{target:'core'}),null);
});

test('ordinary presets and muted hits still obey the explicit tie setting',()=>{
 const p=createPattern();p.measures[0][1]=[{ticks:12,rest:false}];
 const tied=replaceEditorBeat(p,0,0,[{ticks:12,rest:false}],{tieNext:true});assert.ok(tied.measures[0][0][0].tie);
 const untied=replaceEditorBeat(tied,0,0,tied.measures[0][0]);assert.equal(untied.measures[0][0][0].tie,undefined);
 const muted=replaceEditorBeat(p,0,0,[{ticks:12,rest:false,muted:true}],{tieNext:true});assert.ok(validPattern(muted));assert.equal(muted.measures[0][0][0].tie,undefined);
 assert.equal(expandEditorBeat([{ticks:48,rest:false,muted:true}]),null);
});
