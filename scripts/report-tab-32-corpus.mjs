import {readFile,writeFile} from 'node:fs/promises';
const root='artifacts/32nd-support',labels=process.argv.slice(2),result={};
const add=(a,b)=>{for(const [k,v]of Object.entries(b??{}))if(typeof v==='number')a[k]=(a[k]??0)+v;return a;};
const rates=t=>({...t,noteAccuracy:t.notes?+(100*t.correct/t.notes).toFixed(2):null,rhythmAccuracy:t.events?+(100*t.rhythmCorrect/t.events).toFixed(2):null});
for(const label of labels){
 const rows=JSON.parse(await readFile(`${root}/${label}/report.json`)),sum={},byDuration={},double={},low={},heldout={},doc={};
 for(const r of rows){add(sum,r.totals);add(double,r.doubleDigit);add(doc,r.documentStats);if(r.lowResolution)add(low,r.totals);if(r.heldout)add(heldout,r.totals);for(const [d,t]of Object.entries(r.byDuration??{}))add(byDuration[d]??={},t);}
 result[label]={cases:rows.length,failedImports:rows.filter(r=>r.error).length,failureFixtures:rows.filter(r=>r.failures?.length||r.error).length,totals:rates(sum),byDuration:Object.fromEntries(Object.entries(byDuration).map(([d,t])=>[d,rates(t)])),doubleDigits:rates(double),lowResolution:rates(low),heldout:rates(heldout),document:doc,seconds:rows.reduce((n,r)=>n+(r.seconds??0),0)};
}
await writeFile(`${root}/comparison.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
