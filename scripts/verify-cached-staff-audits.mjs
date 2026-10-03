import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
const shape=bar=>bar.events.map(e=>({rest:e.rest,blank:e.blank,duration:e.duration,dotted:!!e.dotted,onset:e.onset,pitches:e.notes.map(n=>n.source.writtenMidi)}));
const stats=doc=>{const compiled=compileDocumentV2(doc),readiness=scorePlaybackReadiness(doc,compiled);return {measures:doc.measures.length,gaps:doc.measures.flatMap(m=>m.events).filter(e=>e.blank).length,completeRhythm:doc.measures.filter(m=>m.pdfImport.rhythmVerified).length,errors:compiled.errors,playable:readiness.allowed,mutedBars:readiness.mutedMeasures??[]};};
for(const [name,root] of [['Let It Be','artifacts/omr-deep-audit/verified-live'],['풀잎사랑','artifacts/omr-deep-audit/verified-other']]){
 const before=JSON.parse(await readFile(`${root}/before.json`,'utf8')),after=JSON.parse(await readFile(`${root}/after.json`,'utf8'));
 assert.equal(after.measures.length,before.measures.length);
 // Source-verified slash notes and chord corrections intentionally replace
 // model guesses even when their old guessed lengths happened to total 4/4.
 for(const [i,m] of before.measures.entries())if(m.pdfImport.rhythmVerified&&!m.events.some(e=>e.notes.length>1)&&!after.measures[i].events.some(e=>e.rhythmSlash))assert.deepEqual(shape(after.measures[i]),shape(m),`unchanged complete melody ${name}:${i+1}`);
 const actual=stats(after);assert.deepEqual(actual.errors,[]);assert(actual.playable);assert.equal(actual.gaps,0);assert.equal(actual.completeRhythm,actual.measures);assert.deepEqual(actual.mutedBars,[]);
 const result={name,passed:true,validation:'replayed against saved outputs of the actual full-photo import',before:stats(before),after:actual};await writeFile(`${root}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
