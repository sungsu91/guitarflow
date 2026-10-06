// Counts are scored outside the browser; no expected music enters the OCR.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const baseline=JSON.parse(await readFile('tests/fixtures/tab-stress-holdout-baseline.json'));
const rows=[];
for(const file of process.argv.slice(2))rows.push(...JSON.parse(await readFile(file)));
assert.equal(rows.length,baseline.cases.length,'run both the original and unseen holdouts');
const totals={cases:rows.length,bars:0,notes:0,correct:0,missing:0,wrong:0,exactRhythmBars:0};
for(const old of baseline.cases){
 const next=rows.find(r=>r.id===old.id);assert(next&&!next.error,old.id);
 assert.equal(next.detectedBars,old.expectedBars,`${old.id}: missing or extra bars`);
 assert.deepEqual(next.wrong,[],`${old.id}: incorrect confirmed notes`);
 for(const key of ['correct','exactRhythmBars'])assert(next[key]>=old[key],`${old.id}: ${key} regression`);
 totals.bars+=next.expectedBars;totals.notes+=next.expectedNotes;totals.correct+=next.correct;
 totals.missing+=next.missing;totals.wrong+=next.wrong.length;totals.exactRhythmBars+=next.exactRhythmBars;
}
await writeFile('artifacts/ocr-stress-20261004/holdout-comparison.json',JSON.stringify({scope:'Synthetic tests, not general OCR accuracy',...totals},null,2));
console.log(JSON.stringify(totals,null,2));
