import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {repeatStructure,navigationOrder} from '../src/etudes/scoreNavigation.js';
const root='artifacts/omr-source-layout',load=async path=>JSON.parse(await readFile(path,'utf8'));
const shape=m=>m.events.map(e=>[e.rest,e.blank,e.duration,!!e.dotted,e.tuplet?.actualNotes??null,!!e.rhythmSlash,e.notes.map(n=>[n.string,n.fret,n.source?.writtenMidi])]);
const reports=[];
for(const [name,beforePath,afterPath] of [['Let It Be','artifacts/omr-deep-audit/verified-live/after.json',`${root}/let-it-be/after.json`],['풀잎사랑','artifacts/omr-deep-audit/verified-other/after.json',`${root}/pulip-final/after.json`]]){
 const [before,after]=await Promise.all([load(beforePath),load(afterPath)]);assert.deepEqual(after.measures.map(shape),before.measures.map(shape),name+' pitches, fingering and rhythm');
 const compiled=compileDocumentV2(after),ready=scorePlaybackReadiness(after,compiled);assert.deepEqual(compiled.errors,[]);assert(ready.allowed);assert.equal(ready.mutedMeasures?.length??0,0);
 reports.push({name,unchangedMeasures:after.measures.length,playable:true,mutedMeasures:0,sourceRows:after.pdfTabImport.sourceSystems.map(s=>s.count)});
}
const before=await load(`${root}/other-before/after.json`),after=await load(`${root}/other-final/after.json`);assert.equal(before.measures.length,51);assert.equal(after.measures.length,49);
let unchanged=0;
for(let page=1;page<=2;page++)for(let staff=1;staff<=8;staff++){
 const rows=[before,after].map(d=>d.measures.filter(m=>m.pdfImport.source.page===page&&m.pdfImport.source.staff===staff));
 if(rows[0].length===rows[1].length){assert.deepEqual(rows[1].map(shape),rows[0].map(shape),`일어나 page ${page} system ${staff}`);unchanged+=rows[0].length;}
}
assert.equal(unchanged,42);
// Independently read from the two source rows that had generated extra bars.
const expected={
 24:[[64,'2',true],[71,'16'],[74,'8'],[76,'16']],25:[[76,'2',true],[71,'16'],[71,'8'],[74,'16']],26:[[74,'2',true],[69,'8'],[67,'8']],
 42:[[71,'2'],[69,'4',true],[67,'8']],43:[[71,'2',true],[71,'8'],[74,'8']],44:[[76,'8'],[74,'4'],[71,'8'],[72,'8'],[71,'16'],[69,'16'],[69,'16'],[67,'16'],[69,'8']],45:[[71,'2',true],[71,'8'],[74,'8']],
};
for(const [number,events] of Object.entries(expected))assert.deepEqual(after.measures[number-1].events.map(e=>[e.notes[0]?.source?.writtenMidi,e.duration,!!e.dotted]),events.map(([m,d,dot])=>[m,d,!!dot]),`일어나 source bar ${number}`);
assert(after.measures.every(m=>m.pdfImport.rhythmVerified));assert(after.measures[8].repeatStart);assert(after.measures[31].repeatEnd);assert.equal(after.measures[48].endBarline,'final');
const repeats=repeatStructure(after.measures);assert.deepEqual(repeats.issues,[]);const order=navigationOrder(after.measures,repeats.blocks);assert.equal(order.length,73);assert.deepEqual(order.slice(32,56),Array.from({length:24},(_,i)=>i+8));
reports.push({name:'일어나',beforeMeasures:51,afterMeasures:49,unchangedMeasures:unchanged,sourceCheckedMeasures:Object.keys(expected).length,sourceCheckedEvents:Object.values(expected).flat().length,completeRhythm:49,repeatStart:9,repeatEnd:32,playbackVisits:73,sourceRows:after.pdfTabImport.sourceSystems.map(s=>s.count),scope:'Ordinary repeat bars only; D.C./coda and ties remain unverified.'});
await writeFile(`${root}/regression.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
