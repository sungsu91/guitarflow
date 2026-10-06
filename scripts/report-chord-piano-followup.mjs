import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/chord-piano-followup-20261006',read=async path=>JSON.parse(await readFile(path));
const oracle=await read('tests/fixtures/piano-pdf-chord-labels.json'),chords=[];
for(const id of ['now','into-the-light','doremi']){
 let labels=0;
 for(const [page,rows] of Object.entries(oracle[id])){
  const actual=await read(`${out}/final/${id}-p${page}.json`);
  for(const [staff,names] of Object.entries(rows)){
   const row=actual.regions.find(r=>r.staff===Number(staff));assert.deepEqual(row.words.map(w=>w.name),names);
   assert.equal(row.unresolvedGroups?.length??0,0);assert.equal(row.unresolvedWords?.length??0,0);labels+=names.length;
  }
 }
 chords.push({id,pages:Object.keys(oracle[id]).map(Number),verifiedLabels:labels});
}
const regression=await read(`${out}/chord-regression/results.json`);let priorLabels=0;
for(const page of regression)for(const row of page.rows){assert.deepEqual(row.names,row.expected);priorLabels+=row.names.length;}
const piano=await read(`${out}/now-page1-verified/result.json`),heads=await read(`${out}/piano-heads-one-bar/now-p2-piano-staff.json`);
assert(!heads.error);const events=heads.parsed.measures[0].events;
assert.deepEqual(events.map(e=>e.notes.map(n=>n.midi)),[[36,48],[36,48],[36,48],[36,48],[38,50],[],[]]);
assert.deepEqual(events.map(e=>[e.duration,e.rest]),[...Array(5).fill(['8',false]),['8',true],['4',true]]);
const ui=await read(`${out}/ui/ui-results.json`);assert.equal(ui.length,2);assert(ui.every(r=>r.errors.length===0&&r.sourcePreserved&&r.separateLayout&&r.saveReload&&r.peak>.0001));
const headRegression=await read(`${out}/piano-head-regression.json`);assert(headRegression.results.every(r=>r.unchanged));
const tests=await readFile(`${out}/focused-tests.log`,'utf8'),build=await readFile(`${out}/build.log`,'utf8');assert.match(tests,/pass 106/);assert.match(tests,/fail 0/);assert.match(build,/built in/);assert.match(build,/Release media verified/);
const summary={chords,verifiedChordLabels:chords.reduce((sum,r)=>sum+r.verifiedLabels,0),priorChordRegressionLabels:priorLabels,piano:{verifiedPage:'NOW page 1',bars:piano.verifiedBars,attacks:piano.verifiedPianoAttacks,melodyAttacks:piano.melodyAttacks,recognitionMs:piano.recognitionMs,extraBassChordBarVerified:true,completeSongs:0},tests:106,build:true,ui:ui.map(({mobile,sourcePreserved,separateLayout,saveReload,restoreOriginal,undoRedo,peak,errors})=>({mobile,sourcePreserved,separateLayout,saveReload,restoreOriginal,undoRedo,peak,errors}))};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
