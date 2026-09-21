import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGrooveQuick,createGrooveRow} from '../src/metronome/groove.js';

test('일괄 marks the clicked drum row across the current measure',()=>{
  const row=createGrooveRow();
  row.steps[20]=true;
  const result=applyGrooveQuick(row,'bulk',2,4,4,45);
  assert.deepEqual(result.steps.slice(0,16),Array(16).fill(true));
  assert.deepEqual(result.velocities.slice(0,16),Array(16).fill(45));
  assert.deepEqual(result.steps.slice(16),row.steps.slice(16));
  assert.equal(row.steps[0],false);
  assert.deepEqual(applyGrooveQuick(result,'bulk',2,4,4,45).steps.slice(0,16),Array(16).fill(false));
});

test('부분 repeats the clicked subdivision across beats for different meters',()=>{
  for(const [beats,divisions] of [[4,4],[3,3],[6,2],[4,1]]) {
    const row=createGrooveRow();
    const before=structuredClone(row);
    const index=divisions-1;
    const result=applyGrooveQuick(row,'partial',index,beats,divisions,100);
    for(let beat=0;beat<beats;beat++) {
      assert.deepEqual(result.steps.slice(beat*divisions,(beat+1)*divisions),Array.from({length:divisions},(_,i)=>i===index));
      assert.equal(result.velocities[beat*divisions+index],100);
    }
    assert.deepEqual(row,before);
    assert.deepEqual(result.steps.slice(beats*divisions),row.steps.slice(beats*divisions));
  }
});

test('부분 toggles the selected subdivision off on second click',()=>{
  const row=createGrooveRow();
  const once=applyGrooveQuick(row,'partial',2,4,4);
  const twice=applyGrooveQuick(once,'partial',2,4,4);
  assert.ok(twice.steps.every(step=>!step));
});
