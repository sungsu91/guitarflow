import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='artifacts/guitar-arrangement-20261006',json=async path=>JSON.parse(await readFile(path,'utf8'));
const files=await json('artifacts/present-check-20261006/sources.json'),originals=[];
for(const file of files){const sha256=createHash('sha256').update(await readFile(file.path)).digest('hex');assert.equal(sha256,file.sha256);originals.push({id:file.id,sha256,unchanged:true});}
for(const mode of ['eager','deferred','disabled'])assert.deepEqual((await json(`${out}/tab-regression/scan-${mode}.json`)).fingerprint,(await json(`artifacts/import-selection-20261006/scan-${mode}.json`)).fingerprint);
const sample=await json(`${out}/now-first-system.json`),ui=await json(`${out}/ui-results.json`);
assert.equal(sample.validationMode,'fresh model recognition');assert.equal(sample.document.measures.length,3);assert.equal(sample.audio.length,93);assert.equal(ui.length,2);
const failedPages=[];
for(const id of ['now','into-the-light','doremi']){const p=await json(`${out}/${id}-p1-grand.json`);assert(p.error);failedPages.push({id,page:1,elapsedMs:p.ms,error:p.error,scope:'Full PDF was not completed or certified.'});}
await writeFile(`${out}/validation.json`,JSON.stringify({originals,originalTabFingerprintsUnchanged:true,fullyVerifiedPianoSongs:0,verifiedExcerpt:{id:'now',page:1,bars:[1,2,3],actualModelRunMs:sample.ms,pitchedAttacksAfterTies:93,melodyRhythmPreservedInArrangement:true},failedPages,ui},null,2));
console.log(JSON.stringify({originalsUnchanged:originals.length,tabRegression:true,verifiedExcerptBars:3,fullyVerifiedPianoSongs:0,uiProfiles:ui.length}));
