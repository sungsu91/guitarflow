import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root='artifacts/pdf-tab-corpus';
const reference=JSON.parse(await readFile('tests/fixtures/pdf-tab-corpus-baseline.json')),before=reference.cases;
const after=JSON.parse(await readFile(`${root}/${process.argv[2]||'after'}/report.json`));
const totals=rows=>rows.reduce((a,r)=>({cases:a.cases+1,bars:a.bars+r.expectedBars,notes:a.notes+r.expectedNotes,correct:a.correct+r.correct,wrong:a.wrong+(r.wrongCount??r.wrong.length),missing:a.missing+r.missing,exactRhythmBars:a.exactRhythmBars+r.exactRhythmBars,completeBars:a.completeBars+r.completeBars,detectedBars:a.detectedBars+r.detectedBars,wrongDurations:a.wrongDurations+(r.wrongDurationCount??r.wrongDurations.length)}),{cases:0,bars:0,notes:0,correct:0,wrong:0,missing:0,exactRhythmBars:0,completeBars:0,detectedBars:0,wrongDurations:0});
assert.equal(after.length,before.length,'every corpus case must have a result');
for(const old of before){
 const next=after.find(r=>r.id===old.id);assert.ok(next&&!next.error,`${old.id}: analysis failed`);
 assert.deepEqual(next.errors,[],`${old.id}: browser error`);
 assert.equal(next.wrong.length,0,`${old.id}: incorrect confirmed fret`);
 assert.ok(next.correct>=old.correct,`${old.id}: fewer correct frets`);
 assert.ok(next.exactRhythmBars>=old.exactRhythmBars,`${old.id}: rhythm regression`);
 assert.ok(next.detectedBars>=old.detectedBars,`${old.id}: lost source bars`);
 const minimum=reference.minimums.find(r=>r.id===old.id);
 for(const key of ['correct','exactRhythmBars','detectedBars'])assert.ok(next[key]>=minimum[key],`${old.id}: regressed below the verified improved ${key}`);
}
const report={scope:'26 synthetic variations; not a real-world accuracy estimate',before:totals(before),after:totals(after),cases:after.map(r=>({id:r.id,correct:r.correct,missing:r.missing,wrong:r.wrong.length,rhythm:r.exactRhythmBars,complete:r.completeBars,seconds:r.seconds}))};
await writeFile(`${root}/comparison.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({before:report.before,after:report.after,regressions:0},null,2));
