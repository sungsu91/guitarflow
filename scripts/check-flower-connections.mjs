import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {flowerAudit,flowerConnectionAudit} from '../tests/fixtures/pdf-tab-flower-audit.mjs';
import {compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const dir=process.argv[2],root='artifacts/flower-connections-20261006';
const before=JSON.parse(await readFile(`${root}/baseline/analysis.json`)),after=JSON.parse(await readFile(`${dir}/analysis.json`)),doc=JSON.parse(await readFile(`${dir}/document.json`));
const bars=a=>a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)),old=bars(before),next=bars(after);
assert.equal(next.length,old.length);let preserved=0;
for(const [bi,m] of old.entries())for(const slot of m.slots)for(const note of slot.notes.filter(n=>n.status==='confirmed')){
 const position=(slot.x-m.x)/m.width,match=next[bi].slots.find(s=>Math.abs((s.x-next[bi].x)/next[bi].width-position)<.012);
 assert(match?.notes.some(n=>n.status==='confirmed'&&n.string===note.string&&n.fret===note.fret&&!!n.dead===!!note.dead&&!!n.harmonic===!!note.harmonic),`existing note lost at ${bi+1}/${slot.x}/${note.string}`);preserved++;
}
let notes=0,events=0;
for(const number of [11,27,28,48,49]){
 const expected=flowerAudit.get(number),measure=next[number-1],actual=doc.measures[number-1].events;assert.equal(measure.needsReview,false,`bar ${number} review`);assert.equal(measure.rhythmValid,true);
 assert.equal(actual.length,expected.length);let onset=0;
 for(const [i,e] of expected.entries()){
  const got=actual[i];assert.equal(got.onset,onset,`bar ${number} event ${i} onset`);assert.equal(got.duration,e.duration);assert.equal(!!got.dotted,!!e.dotted);assert.equal(!!got.tuplet,!!e.tuplet);
  assert.deepEqual(got.notes.map(n=>[n.string,n.dead?'X':n.fret]).sort(),e.notes.map(n=>[n.string,n.fret]).sort(),`bar ${number} event ${i} pitches`);
  onset+=ticksOf(got);events++;notes+=got.notes.length;
 }assert.equal(onset,1920);
}
for(const {bar,slot,technique,slur} of flowerConnectionAudit){const e=doc.measures[bar-1].events[slot];assert.equal(e.technique,technique,`bar ${bar} event ${slot+1} technique`);if(slur)assert.equal(e.slurTo,doc.measures[bar-1].events[slot+1].id);}
assert.equal(doc.measures[47].events.at(-1).tieTo,doc.measures[48].events[0].id,'harmonic tie across bar');
assert.equal(doc.measures[48].events[0].tieTo,doc.measures[48].events[1].id,'omitted harmonic continuation');
const compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
const played=scoreTimeline(compiled.score).events;
const harmonics=played.filter(n=>n.harmonic&&n.bar>=47&&n.bar<=48);
// Source attacks: one three-note arpeggio, then three beats of tied sustain.
assert.equal(harmonics.length,3);assert.deepEqual(harmonics.map(n=>n.midi).sort((a,b)=>a-b),[79,83,88]);
const report={preservedConfirmedNotes:preserved,auditedBars:[11,27,28,48,49],pitchOnsetDurationNotes:notes,events,connections:flowerConnectionAudit.length,harmonicAttacks:harmonics.length,compileErrors:compiled.errors,remainingReviewBars:next.flatMap((m,i)=>m.needsReview?[i+1]:[])};
await writeFile(`${dir}/connections-check.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
