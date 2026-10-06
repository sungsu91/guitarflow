// One development command: randomized model checks, fixed OCR regression and
// a fresh independent PDF/JPEG challenge. No score is uploaded to a service.
import {spawn} from 'node:child_process';
import {randomInt} from 'node:crypto';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';
import {qualityPython} from './quality-runtime.mjs';
import {checkTabRegression} from './check-tab-32-regression.mjs';

const args=process.argv.slice(2),full=args.includes('--full'),seedArg=args.indexOf('--seed');
const seed=seedArg<0?randomInt(1,2147483647):Number(args[seedArg+1]);
if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw Error('Use --seed with an integer from 0 to 2147483647.');
const root=resolve('artifacts/quality-lab',`${new Date().toISOString().replace(/[:.]/g,'-')}-${seed}`);
await mkdir(root,{recursive:true});
const summary={seed,full,scope:'Synthetic development checks; not real-world accuracy',startedAt:new Date().toISOString(),status:'running',steps:[]};
const abort=new AbortController(),stop=()=>abort.abort();process.once('SIGINT',stop);
let server;
async function run(name,command,argv,extra={}){
 const start=Date.now(),chunks=[];console.log(`[quality] ${name}`);
 const code=await new Promise((done,reject)=>{
  const child=spawn(command,argv,{windowsHide:true,env:{...process.env,...extra},signal:abort.signal,timeout:25*60*1000});
  child.stdout.on('data',c=>chunks.push(c));child.stderr.on('data',c=>chunks.push(c));child.once('error',reject);child.once('close',done);
 }).catch(error=>{chunks.push(Buffer.from(String(error)));return -1;});
 await writeFile(join(root,`${name}.log`),Buffer.concat(chunks));summary.steps.push({name,exitCode:code,seconds:(Date.now()-start)/1000});
 await writeFile(join(root,'summary.json'),JSON.stringify(summary,null,2));return code;
}
const requireStep=async(...a)=>{if(await run(...a)!==0)throw Error(`Failed: ${a[0]}; see ${root}`);};
try{
 await requireStep('properties',process.execPath,['--test','tests/score-properties.test.mjs','tests/quality-gate.test.mjs','tests/score-practice-start.test.mjs'],{SCORE_CHECK_SEED:String(seed),SCORE_CHECK_RUNS:full?'2000':'500'});
 const fixtures=resolve('artifacts/32nd-support/fixtures/manifest.json');
 try{await access(fixtures);}catch{await requireStep('fixed-fixtures',qualityPython(),['scripts/create-tab-32-corpus.py']);}
 await requireStep('new-photo-fixtures',qualityPython(),['scripts/create-tab-32-corpus.py','--explore','--seed',String(seed),'--output',join(root,'fixtures'),...(full?[]:['--font','Helvetica'])]);
 server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:true,open:false}});await server.listen();
 const address=server.httpServer.address(),baseURL=`http://127.0.0.1:${address.port}`;
 const fixedOut=join(root,'fixed'),challengeOut=join(root,'photos');
 await requireStep('fixed-ocr',process.execPath,['scripts/verify-tab-32-corpus.mjs','quality',...(full?[]:['native'])],{QUALITY_BASE_URL:baseURL,TAB_32_MANIFEST:fixtures,TAB_32_OUTPUT:fixedOut});
 const reference=JSON.parse(await readFile('tests/fixtures/thirty-second/baseline.json'));
 const fixed=JSON.parse(await readFile(join(fixedOut,'report.json')));
 summary.regression=checkTabRegression(reference.filter(r=>full||r.id.endsWith('-native')),fixed);
 if(!summary.regression.passed)throw Error('Existing OCR results regressed; the reference was not updated.');
 const photoReference=JSON.parse(await readFile('tests/fixtures/thirty-second/photo-baseline.json'));
 if(seed!==photoReference.seed){
  const photoFixtures=join(root,'reference-photo-fixtures'),photoOutput=join(root,'reference-photos');
  await requireStep('reference-photo-fixtures',qualityPython(),['scripts/create-tab-32-corpus.py','--explore','--seed',String(photoReference.seed),'--font',photoReference.font,'--output',photoFixtures]);
  await requireStep('reference-photo-ocr',process.execPath,['scripts/verify-tab-32-corpus.mjs','reference-photos'],{QUALITY_BASE_URL:baseURL,TAB_32_MANIFEST:join(photoFixtures,'manifest.json'),TAB_32_OUTPUT:photoOutput});
  summary.photoRegression=checkTabRegression(photoReference.cases,JSON.parse(await readFile(join(photoOutput,'report.json'))));
  if(!summary.photoRegression.passed)throw Error('The saved photo failure fixtures regressed; the reference was not updated.');
 }
 const code=await run('photo-ocr',process.execPath,['scripts/verify-tab-32-corpus.mjs','photos'],{QUALITY_BASE_URL:baseURL,TAB_32_MANIFEST:join(root,'fixtures/manifest.json'),TAB_32_OUTPUT:challengeOut});
 const photos=JSON.parse(await readFile(join(challengeOut,'report.json')));
 if(seed===photoReference.seed){
  summary.photoRegression=checkTabRegression(photoReference.cases,photos.filter(r=>r.id.startsWith(`${photoReference.font.toLowerCase()}-`)));
  if(!summary.photoRegression.passed)throw Error('The saved photo failure fixtures regressed; the reference was not updated.');
 }
 summary.photos=photos.map(r=>({id:r.id,error:r.error,totals:r.totals,converted:r.documentStats,failureCount:r.failures?.length??0,seconds:r.seconds}));
 const broken=code!==0||photos.some(r=>r.error||r.totals.barErrors||r.totals.compiledErrors);
 summary.status=broken?'needs-investigation':photos.some(r=>r.failures.length)?'passed-regression-with-open-ocr-errors':'passed';
 if(broken)process.exitCode=2;
}catch(error){summary.status='failed';summary.error=String(error);process.exitCode=1;}
finally{
 await server?.close();process.removeListener('SIGINT',stop);
 summary.finishedAt=new Date().toISOString();await writeFile(join(root,'summary.json'),JSON.stringify(summary,null,2));
 await writeFile('artifacts/quality-lab/latest.json',JSON.stringify({directory:root,summary},null,2));
 console.log(JSON.stringify({seed,status:summary.status,report:join(root,'summary.json'),error:summary.error},null,2));
}
