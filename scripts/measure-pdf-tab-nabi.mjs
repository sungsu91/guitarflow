// First four source TAB bars were read visually; chord diagrams are not used.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const frets=['1:0,2:0,3:2,4:2,5:0','1:0,2:0,3:2,4:2,5:0','1:0,2:0,3:2,4:2,5:2,6:0','1:0,2:0,3:1,4:2,5:2,6:0'];
const results=[];
for(const file of process.argv.slice(2).length?process.argv.slice(2):['artifacts/pdf-tab-100/final/2-analysis.json','artifacts/pdf-tab-next/final/2-analysis.json']){
 const a=JSON.parse(await readFile(file)),bars=a.pages[0].staffs[0].measures,result={file,expectedFrets:176,correctFrets:0,wrongFrets:[],matchingRhythmBars:0};
 for(let i=0;i<4;i++){
  const m=bars[i];assert.equal(m.slots.length,8);if(m.slots.every(s=>s.duration==='8'&&!s.rest))result.matchingRhythmBars++;
  for(const [j,s]of m.slots.entries())for(const n of s.notes.filter(n=>n.status==='confirmed'))if(frets[i].split(',').includes(`${n.string}:${n.fret}`))result.correctFrets++;else result.wrongFrets.push({bar:i+1,event:j+1,string:n.string,fret:n.fret});
 }
 result.missingFrets=result.expectedFrets-result.correctFrets;assert.equal(result.matchingRhythmBars,4);assert.deepEqual(result.wrongFrets,[]);results.push(result);
}
console.log(JSON.stringify(results,null,2));await writeFile(`${process.env.PDF_TAB_QUALITY_OUTPUT||'artifacts/pdf-tab-next'}/nabi-accuracy.json`,JSON.stringify(results,null,2));
