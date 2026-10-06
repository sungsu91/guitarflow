import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {arrangeGuitar} from '../src/etudes/arrangement/arrangeGuitar.js';
import {gripFeasible} from '../src/etudes/arrangement/voicing.js';
const root='artifacts/grand-color-20261006';
const baseline=JSON.parse(await readFile('artifacts/chord-piano-followup-20261006/now-page1-verified/result.json'));
const result=JSON.parse(await readFile(`${root}/final/now-p1-grand.json`));assert(!result.error,result.error);
const pages=[result.analysis],doc=analysisToDocument({fileName:'NOW.pdf',target:{instrument:'piano'},pages,summary:summarizeAnalysis(pages)}),compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
const audio=scoreTimeline(compiled.score,60).events.map(({midi,start,duration,voice})=>({midi,start,duration,voice}));assert.deepEqual(audio,baseline.audio,'all source-verified 325 attacks/releases remain identical');
const arrangement=arrangeGuitar(doc),score=compileDocumentV2(arrangement.document);assert.deepEqual(score.errors,[]);assert.deepEqual(arrangement.document.guitarArrangement.sourceDocument,doc);
const performed=scoreTimeline(score.score,60).events;assert.deepEqual(performed.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),baseline.expectedMelody);
for(const t of new Set(performed.flatMap(n=>[n.start,n.start+n.duration])))assert(gripFeasible(performed.filter(n=>n.start<=t+1e-8&&n.start+n.duration>t+1e-8)));
const bass=JSON.parse(await readFile(`${root}/guarded/now-p2-piano-staff.json`)).parsed;assert(bass);
const actual=[];let at=0;
for(const b of bass.measures){let beat=0;for(const e of b.events){const duration=4/Number(e.duration)*(e.dotted?1.5:1);if(!e.rest)for(const n of e.notes){if(e.tieFromPrevious){const p=actual.findLast(p=>p.midi===n.midi&&p.start+p.duration===at+beat);assert(p);p.duration+=duration;}else actual.push({midi:n.midi,start:at+beat,duration});}beat+=duration;}assert.equal(beat,4);at+=4;}
// Independently transcribed from NOW page 2's last lower staff. Both tiny
// beams (below D2 and above C4) are visible in the uncropped source.
const expected=[],add=(p,start,duration)=>p.forEach(midi=>expected.push({midi,start,duration}));
for(const t of [0,.5,1,1.5])add([36,48],t,.5);add([38,50],2,.5);
for(const [base,low,first,high,middle] of [[4,[38,50],[43,55],[55,59,62],[54,57,62]],[8,[36,48],[36,48],[52,55,60],[52,55,60]]]){
 add(first,base,1);add(high,base+1,.75);add(low,base+1.75,.5);add(middle,base+2.25,.25);add([low[1]],base+2.5,.5);add(middle,base+3,1);
}
assert.deepEqual(actual,expected);
const summary={pianoPage1Attacks:audio.length,melodyAttacks:baseline.expectedMelody.length,sourcePreserved:true,physicalGrips:true,newBassBars:3,newBassAttacks:actual.length,newBassExactPitchOnsetDuration:true,fullSongCertified:false};
await writeFile(`${root}/source-preservation.json`,JSON.stringify(summary,null,2));console.log(summary);
