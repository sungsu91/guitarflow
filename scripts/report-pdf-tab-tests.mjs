import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const files=process.argv.slice(2),rows=new Map();
const output=process.env.PDF_TAB_MATRIX_REPORT||'artifacts/pdf-tab-100/final';await mkdir(output,{recursive:true});
for(const file of files.length?files:[`${output}/matrix.json`])for(const r of JSON.parse(await readFile(file)))rows.set(`${r.index}:${r.round}`,{...r,resultFolder:path.dirname(file)});
const results=[...rows.values()].sort((a,b)=>a.index-b.index||a.round-b.round);assert.equal(results.length,100);assert.ok(results.every(r=>r.passed&&!r.browserErrors.length));
const defaults=results.filter(r=>r.round===1);
for(const r of results){if(r.name==='automatic-repeat-cold')r.name='automatic-repeat';r.coverageMatchesDefault=r.measures===defaults.find(d=>d.index===r.index).measures;}
for(const d of defaults)if(path.resolve(d.resultFolder)!==path.resolve(output))for(const kind of ['analysis','document'])await copyFile(`${d.resultFolder}/${d.index}-${kind}.json`,`${output}/${d.index}-${kind}.json`);
const summary={workflowTests:results.length,passed:results.filter(r=>r.passed).length,originalPages:defaults.reduce((n,r)=>n+r.pages,0),defaultMeasures:defaults.reduce((n,r)=>n+r.measures,0),defaultCoverage:defaults.map(r=>({index:r.index,file:r.file,pages:r.pages,measures:r.measures,confirmed:r.summary.confirmed,repeatedFrets:r.summary.repeatedFrets,needsReview:r.summary.needsReview,coldSeconds:r.seconds,repeatSeconds:results.find(s=>s.index===r.index&&s.round===2).seconds})),scaleCoverageFindings:results.filter(r=>!r.coverageMatchesDefault).map(r=>({index:r.index,scale:r.name,measures:r.measures,defaultMeasures:defaults.find(d=>d.index===r.index).measures})),cacheUsedCases:results.filter(r=>r.cachedCrops>0).length};
await writeFile(`${output}/matrix.json`,JSON.stringify(results,null,2));await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
