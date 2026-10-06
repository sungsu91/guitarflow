import {readFile,writeFile} from 'node:fs/promises';
import {detachedPhotoRhythmOracle} from '../tests/fixtures/detached-photo-rhythm-oracle.mjs';
const [root='artifacts/detached-rhythm-20261006/verified-print',baseline='artifacts/photo-recheck-20261006/verified-print']=process.argv.slice(2);
const reports=[];
function assess(analysis,oracle){
 const page=analysis.pages[0],staffs=page.staffs.filter(s=>Math.abs((s.y+s.height/2)/page.height-oracle.rowCenter)<.015);
 return oracle.bars.map(bar=>{
  const matches=staffs.length===1?staffs[0].measures.filter(m=>{const w=m.source?.pageWidth??page.width;return Math.abs(m.x/w-bar.left)<.015&&Math.abs((m.x+m.width)/w-bar.right)<.015;}):[];
  const actual=matches.length===1?matches[0].slots.map(s=>s.duration):[],capacity=matches[0]?.ticks;
  const exact=JSON.stringify(actual)===JSON.stringify(bar.durations)&&matches[0].slots.every(s=>s.confidence>=.95&&!s.tuplet&&!s.dotted)&&capacity===1920;
  return {printed:bar.printed,matched:matches.length===1,expected:bar.durations,actual,exact};
 });
}
for(const oracle of detachedPhotoRhythmOracle){const after=JSON.parse(await readFile(`${root}/${oracle.id}.json`)),before=JSON.parse(await readFile(`${baseline}/${oracle.id}.json`));reports.push({id:oracle.id,scope:'rhythm-only',before:assess(before.analysis,oracle),after:assess(after.analysis,oracle)});}
await writeFile(`${root}/independent-rhythm-check.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>r.after.some(b=>!b.exact)))process.exitCode=1;
