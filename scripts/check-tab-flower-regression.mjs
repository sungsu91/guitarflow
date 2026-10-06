// The user's source PDF remains private; compare only its local analysis files.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const paths=process.argv.slice(2);
assert.equal(paths.length,2,'usage: node scripts/check-tab-flower-regression.mjs baseline-analysis.json candidate-analysis.json');
const [before,after]=JSON.parse(execFileSync(process.execPath,['scripts/audit-pdf-tab-flower.mjs',...paths],{encoding:'utf8'}));
const summaries=await Promise.all(paths.map(async p=>JSON.parse(await readFile(p)).summary));
for(const key of ['pages','staffs','measures'])assert.equal(summaries[1][key],summaries[0][key],key);
assert(summaries[1].confirmed>=summaries[0].confirmed,'confirmed frets must survive');
assert.equal(after.expected,before.expected);
for(const key of ['correct','exactRhythm','complete'])assert(after[key]>=before[key],`${key} fell`);
for(const key of ['missing'])assert(after[key]<=before[key],`${key} rose`);
assert(after.wrong.length<=before.wrong.length,'new incorrect notes');
assert(after.unaligned.every(bar=>before.unaligned.includes(bar)),'new shifted event columns');
assert(after.chords.correct>=before.chords.correct,'lost chord names');
assert(after.chords.wrong.length<=before.chords.wrong.length,'new incorrect chords');
assert(after.techniques.correct>=before.techniques.correct,'lost harmonic/arpeggio/tie');
console.log(JSON.stringify({passed:true,before,after,summaries},null,2));
