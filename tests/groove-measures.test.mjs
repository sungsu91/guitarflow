import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROOVE_BAR_STEPS, createGroovePattern, normalizeGroovePattern, resizeGroovePattern,
  copyGrooveBar, clearGrooveBar, applyGrooveQuick, getGrooveBarCount,
  getGrooveStepIndex, scheduleGrooveStep,
} from '../src/metronome/groove.js';
import {getGrooveBackingTiming} from '../src/backing-loop/grooveBackingSource.js';

test('legacy packs stay one bar; expanding copies notes and strengths without aliasing',()=>{
  const original=createGroovePattern();
  original.rows[0].velocities[0]=45;
  assert.equal(getGrooveBarCount(normalizeGroovePattern(original)),1);
  const expanded=resizeGroovePattern(original,4);
  for(let bar=0;bar<4;bar++){
    assert.deepEqual(expanded.rows[0].steps.slice(bar*72,(bar+1)*72),original.rows[0].steps);
    assert.equal(expanded.rows[0].velocities[bar*72],45);
  }
  expanded.rows[0].steps[72]=false;
  assert.equal(expanded.rows[0].steps[0],true);
  assert.equal(original.rows[0].steps[0],true);
});

test('editing, quick fill, copying and reset affect only the selected bar',()=>{
  const pattern=resizeGroovePattern(createGroovePattern(),4);
  const row=pattern.rows[0];
  const edited=applyGrooveQuick(row,'partial',72+1,4,4,100,1);
  assert.deepEqual(edited.steps.slice(0,72),row.steps.slice(0,72));
  assert.deepEqual(edited.steps.slice(144),row.steps.slice(144));
  for(const i of [73,77,81,85])assert.equal(edited.velocities[i],100);
  const updated={...pattern,rows:[edited,...pattern.rows.slice(1)]};
  const copied=copyGrooveBar(updated,1,2);
  assert.deepEqual(copied.rows[0].steps.slice(144,216),edited.steps.slice(72,144));
  assert.deepEqual(copied.rows[0].velocities.slice(144,216),edited.velocities.slice(72,144));
  const cleared=clearGrooveBar(copied,2);
  assert.ok(cleared.rows.every(row=>row.steps.slice(144,216).every(step=>!step)));
  assert.deepEqual(cleared.rows[0].steps.slice(0,144),copied.rows[0].steps.slice(0,144));
  assert.deepEqual(cleared.rows[0].steps.slice(216),copied.rows[0].steps.slice(216));
});

test('shortening, saving, loading and expanding retain all edited bars',()=>{
  const expanded=resizeGroovePattern(createGroovePattern('empty'),4);
  expanded.rows[0].steps[3*72+15]=true;
  expanded.rows[0].velocities[3*72+15]=100;
  const shortened=resizeGroovePattern(expanded,1);
  const restored=normalizeGroovePattern(JSON.parse(JSON.stringify(shortened)));
  assert.equal(getGrooveBarCount(restored),1);
  const grown=resizeGroovePattern(restored,4);
  assert.deepEqual(grown.rows,expanded.rows);
});

test('every meter loops bars in order and skips unused storage slots',()=>{
  for(const barCount of [1,2,3,4])for(const steps of [4,9,12,16,24,72]){
    const pattern={barCount};
    for(let i=0;i<steps*barCount*3;i++){
      assert.equal(getGrooveStepIndex(pattern,i,steps),Math.floor(i/steps)%barCount*GROOVE_BAR_STEPS+i%steps);
    }
    assert.equal(getGrooveStepIndex(pattern,steps*barCount,steps),0);
  }
});

test('audio schedules each bar with its own strengths at exact timestamps across a wrap',()=>{
  const pattern=resizeGroovePattern(createGroovePattern('empty'),3);
  pattern.rows=pattern.rows.slice(2);
  for(let bar=0;bar<3;bar++){
    pattern.rows[0].steps[bar*72]=true;
    pattern.rows[0].velocities[bar*72]=[100,70,45][bar];
  }
  const starts=[],levels=[];
  const audio={
    createGain:()=>({gain:{setValueAtTime(value){levels.push(value);},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),
    createBufferSource:()=>({connect(){},stop(){},start(time){starts.push(time);}}),
  };
  for(let index=0;index<64;index++)scheduleGrooveStep({audio,output:{},buffers:{kick:{duration:.2}},pattern,
    index:getGrooveStepIndex(pattern,index,16),time:10+index*.125,volume:1,track(){}});
  assert.deepEqual(starts,[10,12,14,16]);
  assert.ok(Math.abs(levels[2]/levels[0]-.7)<1e-9);
  assert.ok(Math.abs(levels[4]/levels[0]-.45)<1e-9);
  assert.equal(levels[6],levels[0]);
});

test('backing renders whole cycles for all bar lengths, including three bars',()=>{
  for(const barCount of [1,2,3,4]){
    const timing=getGrooveBackingTiming({pattern:{barCount},timeSignature:'4/4',subdivision:'sixteenth'},120);
    assert.equal(timing.bars%barCount,0);
    assert.ok(timing.bars>=8);
    assert.equal(timing.durationSeconds,timing.bars*2);
  }
});
