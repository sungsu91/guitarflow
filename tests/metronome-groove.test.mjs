import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroovePattern, createGrooveRow, normalizeGroovePattern, scheduleGrooveStep} from '../src/metronome/groove.js';

test('8beat names a pattern on a sixteen-step grid, with independent editable rows', () => {
  const pattern=createGroovePattern();
  assert.deepEqual(pattern.rows.map(row=>row.steps.flatMap((on,i)=>on?[i+1]:[])), [[1,3,5,7,9,11,13,15],[5,13],[1,9]]);
  pattern.rows[0].steps[0]=false;
  assert.equal(pattern.rows[2].steps[0],true);
  assert.equal(createGroovePattern().rows[0].steps[0],true);
});
test('all enabled rows schedule cached audio at exactly the same transport time', () => {
  const starts=[], tracked=[], buffers={hihat:{id:'hat'},kick:{id:'kick'}};
  const audio={createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},stop(){},start(time){starts.push([this.buffer,time]);}})};
  const args={audio,output:{},buffers,pattern:createGroovePattern(),index:0,time:12.345,volume:.8,track:(...voice)=>tracked.push(voice)};
  scheduleGrooveStep(args);
  assert.deepEqual(starts,[[buffers.hihat,12.345],[buffers.kick,12.345]]);
  assert.equal(tracked.length,2);
  scheduleGrooveStep({...args,index:1});
  assert.equal(starts.length,2);
});

test('editing and restoring a saved pattern preserve rows beyond the eighth', () => {
  const original={name:'custom',rows:Array.from({length:24},(_,i)=>{
    const row=createGrooveRow(i%2?'snare':'kick');
    row.steps[i]=true;row.velocities[i]=i%2?45:100;
    return row;
  })};
  const edited=normalizeGroovePattern({...original,rows:original.rows.map((row,i)=>i===23?{...row,tone:'clap'}:row)},original);
  const restored=normalizeGroovePattern(JSON.parse(JSON.stringify(edited)));
  assert.equal(restored.rows.length,24);
  assert.deepEqual(restored.rows,edited.rows);
  assert.equal(restored.rows[23].tone,'clap');
  assert.equal(restored.rows[23].steps[23],true);
  assert.equal(restored.rows[23].velocities[23],45);
  assert.equal(original.rows[23].tone,'snare');
});

test('every enabled row beyond eight uses the same audio timestamp', () => {
  const rows=Array.from({length:24},()=>({...createGrooveRow('kick'),steps:[true]}));
  const starts=[],levels=[];
  const audio={
    createGain:()=>({gain:{setValueAtTime(value){levels.push(value);},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),
    createBufferSource:()=>({connect(){},stop(){},start(time){starts.push(time);}}),
  };
  const args={audio,output:{},buffers:{kick:{duration:.4}},pattern:{rows},index:0,time:12.345,volume:1,track(){}};
  scheduleGrooveStep(args);
  assert.deepEqual(starts,Array(24).fill(12.345));
  assert.ok(levels.every(level=>Number.isFinite(level)&&level>0));
  rows.forEach((row,i)=>{row.steps[0]=i===23;});starts.length=0;
  scheduleGrooveStep(args);
  assert.deepEqual(starts,[12.345]);
});
