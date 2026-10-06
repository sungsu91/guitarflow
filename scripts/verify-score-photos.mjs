// Fetch pinned, attributed public fixtures and challenge the real import path.
// Personal photographs are optional CLI inputs and remain local.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {qualityPython} from './quality-runtime.mjs';
import {checkExternalScoreRegression} from './check-external-score-regression.mjs';
const args=process.argv.slice(2),rootAt=args.indexOf('--root'),root=resolve(rootAt<0?'artifacts/real-photo-quality':args[rootAt+1]);
const photos=args.flatMap((s,i)=>s==='--camera'?[args[i+1]]:[]);
if(photos.some(p=>!p||p.startsWith('--')))throw Error('Each --camera needs a JPG/PNG path');
const sources=JSON.parse(await readFile('tests/fixtures/external-score/sources.json'));
const originals=join(root,'originals');await mkdir(originals,{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex');
for(const source of sources){
 const file=join(originals,source.file);let bytes;
 try{bytes=await readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!bytes){const response=await fetch(source.url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`${source.id}: HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
 if(digest(bytes)!==source.sha256)throw Error(`${source.id}: downloaded source changed; review before updating the oracle`);
 await writeFile(file,bytes);
}
async function run(command,argv){
 const code=await new Promise((done,reject)=>{const p=spawn(command,argv,{stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',done);});
 if(code!==0)throw Error(`${command} failed (${code})`);
}
for(const name of ['picking','carcassi']){
 try{await access(join(originals,`${name}.png`));}
 catch{await run(process.env.PDFTOPPM??'pdftoppm',['-scale-to','1800','-png','-singlefile',join(originals,`${name}.pdf`),join(originals,name)]);}
}
const auditAt=args.indexOf('--camera-audit');
await run(qualityPython(),['scripts/create-external-score-stress.py','--root',root,...photos.flatMap(p=>['--camera',p]),...(auditAt<0?[]:['--camera-audit',args[auditAt+1]])]);
const manifest=JSON.parse(await readFile(join(root,'manifest.json'))),runRoot=join(root,new Date().toISOString().replace(/[:.]/g,'-'));
// The slow staff-model check is explicit; a photo smoke run does not load it.
const selected=manifest.cases.filter(c=>args.includes('--include-staff')||c.mode!=='staff').map(c=>c.id);
await run(process.execPath,['scripts/verify-external-score-stress.mjs',join(root,'manifest.json'),runRoot,...selected]);
await run(process.execPath,['scripts/verify-external-import-lifecycle.mjs',join(originals,'lick.png'),join(runRoot,'lifecycle')]);
const reports=JSON.parse(await readFile(join(runRoot,'report.json')));
const baseline=JSON.parse(await readFile('tests/fixtures/external-score/baseline.json'));
const regression=checkExternalScoreRegression(baseline,reports),regressed=regression.failures;
const open=reports.filter(r=>!r.expectedError&&(r.error||r.barCountCorrect===false||r.failures.length||r.summary?.needsReview||r.auditScope==='unlabeled'));
const summary={status:regressed.length?'regressed':open.length?'passed-regression-with-open-ocr-errors':'passed',cases:reports.length,regressed,openCases:open.map(r=>r.id),report:join(runRoot,'report.json'),scope:'Audited sample bars only; successful imports and summary.confirmed are not measured accuracy.'};
await writeFile(join(root,'latest.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(regressed.length)process.exitCode=1;
