import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_METERS,guidePatterns,compileGuide,GuideTransport} from '../src/rhythm-trainer/guideModel.js';
import {builtinPacks} from '../src/rhythm-trainer/packs.js';
globalThis.cancelAnimationFrame=()=>{};
globalThis.requestAnimationFrame=()=>0;
test('guide subdivisions distinguish note holds, rests and ties',()=>{
 const get=id=>compileGuide(guidePatterns('4/4').find(p=>p.id===id),'4/4');
 assert.deepEqual(get('eighth-sixteenths').groups[0].cells.map(c=>c.kind),['hit','hold','hit','hit']);
 assert.deepEqual(get('sixteenth-eighth-sixteenth').groups[0].cells.map(c=>c.kind),['hit','hit','hold','hit']);
 assert.deepEqual(get('eighth-rest-sixteenth').groups[0].cells.map(c=>c.kind),['hit','hold','rest','hit']);
 assert.equal(get('tie').groups[1].cells[0].kind,'hold');
 assert.equal(get('tie').events.filter(e=>!e.rest&&!e.continuation).length,3);
});
test('all meters, tuplets and pack cores compile without data mutation',()=>{
 for(const meter of GUIDE_METERS)for(const p of guidePatterns(meter)){
  const before=JSON.stringify(p),c=compileGuide(p,meter);
  assert.equal(c.total,c.groups.length*c.beatTicks);
  for(const g of c.groups){assert.equal(g.cells.reduce((v,n)=>v+n.ticks,0).toFixed(6),g.ticks.toFixed(6));for(const e of g.events)assert.ok(g.cells.some(cell=>Math.abs(e.at-cell.at)<1e-8));}
  assert.equal(JSON.stringify(p),before);
 }
 for(const p of builtinPacks('ko'))assert.doesNotThrow(()=>compileGuide({groups:p.core},`${p.meter}/4`));
 const six=compileGuide(guidePatterns('6/8')[0],'6/8');assert.equal(six.groups.length,2);assert.equal(six.total,36);assert.deepEqual(six.groups[0].cells.map(c=>c.label),['1·1','1·2','1·3']);
});
test('guide sound onsets and highlighted cells share exact time at each BPM',()=>{
 for(const meter of GUIDE_METERS)for(const p of guidePatterns(meter))for(const bpm of [60,137]){
  const compiled=compileGuide(p,meter),ctx={currentTime:0},engine=new GuideTransport(ctx,{},()=>{});
  engine.configureGuide(compiled,bpm,'wood');const sounded=[],beats=[];engine.sound=at=>sounded.push(at);engine.beatSound=(at,index)=>beats.push({at,index});
  engine.anchorTime=0;engine.anchorTick=0;engine.next=0;
  const duration=compiled.total/compiled.beatTicks*60/bpm;
  for(let time=0;time<duration*2-.09;time+=.01){ctx.currentTime=time;engine.schedule();}
  const expected=compiled.events.filter(e=>!e.rest&&!e.continuation).map(e=>e.at/compiled.beatTicks*60/bpm);
  expected.forEach((at,i)=>assert.ok(Math.abs(sounded[i]-at)<1e-8,`${meter} ${p.id}`));
  assert.ok(Math.abs(beats[1].at-60/bpm)<1e-8);
 }
});
