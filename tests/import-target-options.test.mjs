import test from 'node:test';
import assert from 'node:assert/strict';
import {importTargetOptions,selectImportInstrument,selectImportTuning} from '../src/pdf/tab-import/importTargetOptions.js';
import {withImportPitchDefault,importOctaveShift} from '../src/pdf/tab-import/importTarget.js';

test('opening and reselecting an instrument preserve custom tuning and capo without mutating the editor',()=>{
 const original={instrument:'guitar',tuning:[64,59,55,50,45,39],capo:3},before=structuredClone(original);
 const options=importTargetOptions(original);assert.equal(options.customTuning,true);assert.equal(options.tuningValue,'current');
 const next=selectImportInstrument(original,'guitar:6');assert.deepEqual(next,original);assert.notEqual(next.tuning,original.tuning);
 next.tuning[0]=60;assert.deepEqual(original,before);
});
test('switching guitar to five-string bass clears incompatible settings and restricts tuning to five strings',()=>{
 const bass=selectImportInstrument({instrument:'guitar',tuning:[64,59,55,50,45,40],capo:4},'bass:5');
 assert.deepEqual(bass,{instrument:'bass',tuning:[43,38,33,28,23],capo:0});
 const down=selectImportTuning(bass,'bass-5-half-down');assert.deepEqual(down.tuning,[42,37,32,27,22]);
 assert(importTargetOptions(down).tunings.every(p=>p.tuning.length===5));assert.throws(()=>selectImportTuning(down,'standard'));
 assert.equal(selectImportInstrument(down,'bass:4').tuning.length,4);
});
test('an unsupported initial instrument can be replaced by an explicit valid target',()=>{
 assert.equal(importTargetOptions(undefined).instrumentValue,'');
 assert.equal(selectImportInstrument(undefined,'ukulele:4').instrument,'ukulele');
 assert.throws(()=>selectImportInstrument(undefined,'drums:0'));
 assert.equal(selectImportInstrument(undefined,'piano:0').instrument,'piano');
});

test('vocal and piano imports retain sounding pitch across destination instrument changes',()=>{
 let target=withImportPitchDefault();assert.equal(importOctaveShift(target),0);
 for(const instrument of ['ukulele:4','bass:5','piano:0','guitar:7']){
  target=withImportPitchDefault(selectImportInstrument(target,instrument));
  assert.equal(importOctaveShift(target),0,instrument);
  assert.equal(target.notationPitch,'concert');
 }
});

test('an explicit source convention survives instrument defaults without changing tuning or capo',()=>{
 const original={instrument:'guitar',tuning:[64,59,55,50,45,38],capo:2},before=structuredClone(original);
 const guitar=withImportPitchDefault(original,'concert');assert.equal(importOctaveShift(guitar),0);
 assert.deepEqual(guitar.tuning,original.tuning);assert.equal(guitar.capo,2);assert.deepEqual(original,before);
 const bass=withImportPitchDefault(selectImportInstrument(guitar,'bass:4'),'concert');assert.equal(importOctaveShift(bass),0);
 assert.equal(importOctaveShift(withImportPitchDefault({instrument:'ukulele'},'octave-down')),-12);
 assert.equal(importOctaveShift(withImportPitchDefault({instrument:'guitar',notationPitch:'octave-down'})),-12);
 assert.equal(importOctaveShift(withImportPitchDefault({instrument:'piano'},'octave-down')),0);
 assert.throws(()=>withImportPitchDefault(original,'invalid'));
});
