import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const baseline=JSON.parse(await readFile('tests/fixtures/tab-technique-baseline.json'));
const rows=JSON.parse(await readFile(process.argv[2]));
assert.equal(rows.length,baseline.cases.length,'run every independent technique fixture');
const totals={cases:rows.length,bars:0,correct:0,missing:0,wrong:0,harmonics:0,arpeggios:0,ties:0,rhythm:0};
for(const old of baseline.cases){
 const next=rows.find(r=>r.id===old.id);assert(next,old.id);
 assert.equal(next.bars,old.bars,`${old.id}: bar count`);
 assert.deepEqual(next.wrong,[],`${old.id}: incorrect confirmed frets`);
 assert.deepEqual(next.wrongTechniques,[],`${old.id}: incorrect techniques`);
 assert.deepEqual(next.missingTechniques,[],`${old.id}: technique lost on a recognized note`);
 for(const key of ['correct','harmonics','arpeggios','ties','rhythm'])assert(next[key]>=old[key],`${old.id}: ${key} regression`);
 for(const key of ['bars','correct','harmonics','arpeggios','ties','rhythm'])totals[key]+=next[key];
 totals.missing+=next.missing.length;totals.wrong+=next.wrong.length;
}
console.log(JSON.stringify({scope:baseline.scope,...totals},null,2));
