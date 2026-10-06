import test from 'node:test';import assert from 'node:assert/strict';
import {arrangeBass,bassChordRows} from '../src/etudes/arrangement/arrangeBass.js';
import {createBlankDocument,blankMeasure,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {soundingMidi} from '../src/etudes/scoreTuning.js';
const source=(names=['C','G/B','Am','F'])=>({...createBlankDocument(),title:'Source',instrument:'bass',tuning:[43,38,33,28],measures:names.map(name=>({...blankMeasure(),harmony:name}))});
test('bass accompaniment follows C B A F in low register with one tone per onset',()=>{
 const input=source(),before=structuredClone(input),{document:d,report}=arrangeBass(input);
 assert.deepEqual(input,before);assert.deepEqual(d.bassArrangement.sourceDocument,before);
 assert.deepEqual(d.measures.map(m=>m.events[0].notes[0].midi),[36,35,33,29]);
 assert.deepEqual(d.measures.map(m=>m.events[0].notes[0]).map(n=>[n.string,n.fret]),[[3,3],[3,2],[3,0],[4,1]]);
 assert.ok(d.measures.every(m=>m.events.every(e=>e.notes.length===1)));assert.ok(report.maxFret<=3);
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
 assert.deepEqual(compiled.score.measures.map(m=>m[0].pitch.key),['c/3','b/2','a/2','f/2']);
 assert.deepEqual(scoreTimeline(compiled.score).events.map(e=>e.midi),d.measures.flatMap(m=>m.events.flatMap(e=>e.notes.map(n=>soundingMidi(d,n)))));
});
test('bass pattern preserves offbeat chord changes and replaces flawed melody rhythms',()=>{
 const input=source(['F']);input.measures[0].events[0].duration='1';input.measures[0].harmonyChanges=[{onset:0,name:'F'},{onset:480,name:'C'},{onset:720,name:'G7'},{onset:960,name:'C'}];
 for(const pattern of ['quarters','halves','eighths','root-fifth']){
  const {document:d}=arrangeBass(input,{pattern}),bar=d.measures[0];
  assert.equal(bar.events.reduce((n,e)=>n+ticksOf(e),0),1920);
  assert.equal(bar.events.find(e=>e.onset===720).notes[0].midi%12,7);
  assert.equal(bar.events.find(e=>e.onset===960).notes[0].midi%12,0);
 }
});
test('unknown harmony, duplicate positions and unreviewed chords cannot silently produce bass',()=>{
 for(const chord of ['','???','Cxyz'])assert.throws(()=>arrangeBass(source([chord])));
 const input=source();input.measures[1].harmonyReview={reason:'unread'};assert.throws(()=>arrangeBass(input),/2마디/);
 const rows=bassChordRows(source());rows[0].changes.push({name:'G',onset:0});assert.throws(()=>arrangeBass(source(),{rows}),/겹치/);
});
test('inherited chords, N.C., diminished fifths, capo, five strings and 6/8 remain musical',()=>{
 const input=source(['C',null,'N.C.',null,'G']);const d=arrangeBass(input).document;
 assert.equal(d.measures[1].events[0].notes[0].midi,36);assert.ok(d.measures.slice(2,4).every(m=>m.events.every(e=>e.rest)));
 const dim=arrangeBass(source(['Bdim']),{pattern:'root-fifth'}).document;
 assert.deepEqual(dim.measures[0].events.map(e=>e.notes[0].midi%12),[11,5,11,5]);
 const slash=arrangeBass(source(['G/B']),{pattern:'root-fifth'}).document;assert.ok(slash.measures[0].events.every(e=>e.notes[0].midi===35));
 const capo={...source(['C','G/B']),instrument:'guitar',tuning:[64,59,55,50,45,40],capo:3};const transposed=arrangeBass(capo).document;
 assert.deepEqual(transposed.measures.map(m=>m.events[0].notes[0].midi%12),[3,2]);assert.equal(transposed.capo,0);assert.equal(transposed.measures[1].harmony,'A#/D');
 const five={...source(['B']),tuning:[43,38,33,28,23]};assert.equal(arrangeBass(five).document.measures[0].events[0].notes[0].midi,23);
 const compound={...source(['C']),meter:[6,8]};const six=arrangeBass(compound).document.measures[0];assert.equal(six.events.length,2);assert.ok(six.events.every(e=>e.duration==='4'&&e.dotted));
});

test('reviewed chord corrections persist without modifying the source',()=>{
 const input=source(['C']),rows=bassChordRows(input);rows[0].changes[0].name='G/B';
 const d=arrangeBass(input,{rows}).document;rows[0].changes[0].name='F';
 assert.equal(d.bassArrangement.chordRows[0].changes[0].name,'G/B');
 assert.equal(d.bassArrangement.sourceDocument.measures[0].harmony,'C');
 assert.equal(d.measures[0].events[0].notes[0].midi,35);
});
