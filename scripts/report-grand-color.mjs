import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='artifacts/grand-color-20261006';
const sources=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json'));
const originals=[];for(const s of sources){const hash=createHash('sha256').update(await readFile(s.path)).digest('hex');assert.equal(hash,s.sha256);originals.push({id:s.id,sha256:hash,unchanged:true});}
const geometry=JSON.parse(await readFile(`${root}/crop-regression.json`));assert(geometry.every(s=>s.pages.every(p=>p.plainUnchanged&&p.standardUnchanged)));
const preservation=JSON.parse(await readFile(`${root}/source-preservation.json`));
const colorFiles=JSON.parse(await readFile(`${root}/colors.json`)),expectedRows=[7,9,4,11,10,14,8,7,8,8,11],colors=[];
for(const [i,s] of colorFiles.entries()){
 const result=JSON.parse(await readFile(`${root}/color-v5/${s.id}.json`));
 colors.push({id:s.id,path:s.path,sha256:createHash('sha256').update(await readFile(s.path)).digest('hex'),sourceRows:expectedRows[i],baselineDetectedRows:result.baseline.length,experimentalDetectedRows:result.systems.length,productionEnabled:false});
}
const firstColor=JSON.parse(await readFile(`${root}/color-read/color-1.json`));
const decoded=firstColor.results[0].parsed.measures[1].events.map(e=>e.notes.map(n=>n.midi));
const oracle=[[62],[62],[59],[62],[66],[66]];assert.notDeepEqual(decoded,oracle,'the failed real pitch oracle is why the experimental color path stays disabled');
const live=JSON.parse(await readFile(`${root}/live/now.json`));assert(live.error);assert(!live.document);
const report={originals,preservation,standardPixels:{pages:geometry.reduce((n,s)=>n+s.pages.length,0),staffs:geometry.flatMap(s=>s.pages).reduce((n,p)=>n+p.staffs,0),physicalBars:geometry.flatMap(s=>s.pages).reduce((n,p)=>n+p.bars,0),unchanged:true},grandStaff:{file:'NOW.pdf',fullImportSucceeded:false,completedPagesBeforeFailure:3,failedPage:4,error:live.error,elapsedMs:live.ms},color:{enabled:false,files:colors,sourcePitchCounterexample:{file:'Paper Plane 1.png',physicalBar:2,expected:oracle,decoded}},fullyVerifiedSongs:0};
await writeFile(`${root}/summary.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({sourcePdfHashesUnchanged:true,standardPixels:report.standardPixels,preservation,colorInputs:colors.length,fullImportSucceeded:false,fullyVerifiedSongs:0}));
