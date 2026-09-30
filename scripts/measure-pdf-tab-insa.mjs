import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {insaRhythm,insaFrets} from '../tests/fixtures/pdf-tab-golden.mjs';
const file=process.argv[2]||'artifacts/pdf-tab-100/final/9-analysis.json',a=JSON.parse(await readFile(file)),bars=a.pages[0].staffs[0].measures;
const result={file,expectedFrets:218,rhythmEvents:40,matchingRhythmBars:0,correctFrets:0,wrongFrets:[],extraConfirmedFrets:0};
for(let i=0;i<4;i++){
 const m=bars[i];if(m.rhythm.map(r=>r.duration).join(' ')===insaRhythm)result.matchingRhythmBars++;
 for(const [j,r]of m.rhythm.entries()){
  const slot=m.slots.find(s=>Math.abs(s.x-r.x)<1e-6);
  for(const n of slot?.notes.filter(n=>n.status==='confirmed')??[])if(insaFrets[i][j]?.split(',').includes(`${n.string}:${n.fret}`))result.correctFrets++;else result.wrongFrets.push({bar:i+1,event:j+1,string:n.string,fret:n.fret});
 }
 result.extraConfirmedFrets+=m.slots.filter(s=>!m.rhythm.some(r=>Math.abs(s.x-r.x)<1e-6)).reduce((n,s)=>n+s.notes.filter(n=>n.status==='confirmed').length,0);
}
result.missingFrets=result.expectedFrets-result.correctFrets;console.log(JSON.stringify(result,null,2));await writeFile(`${process.env.PDF_TAB_QUALITY_OUTPUT||'artifacts/pdf-tab-100'}/insa-accuracy.json`,JSON.stringify(result,null,2));
assert.equal(result.matchingRhythmBars,4);assert.deepEqual(result.wrongFrets,[]);assert.equal(result.extraConfirmedFrets,0);
