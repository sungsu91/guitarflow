// Reuse already-authored independent fixtures; never regenerate the baseline
// to agree with today's importer. Each failed position remains a gate.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {checkTabRegression} from './check-tab-32-regression.mjs';
const [prior,out='artifacts/photo-improvement-20261005/regression']=process.argv.slice(2);if(!prior)throw Error('Supply the previous quality run directory');await mkdir(out,{recursive:true});
const selectedCases=process.env.QUALITY_CASES?.split(',').filter(Boolean)??[];
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`,reports=[];
try{
  for(const [name,manifest,baseline] of [['fixed','artifacts/32nd-support/fixtures/manifest.json','tests/fixtures/thirty-second/baseline.json'],['reference-photos',prior+'/reference-photo-fixtures/manifest.json',prior+'/reference-photos/report.json'],['challenge',prior+'/fixtures/manifest.json',prior+'/photos/report.json']]){
  if(process.env.QUALITY_GROUPS&&!process.env.QUALITY_GROUPS.split(',').includes(name))continue;
  const chunks=[];console.log('Running',name);
  const exit=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/verify-tab-32-corpus.mjs',name,...selectedCases],{windowsHide:true,env:{...process.env,QUALITY_BASE_URL:base,TAB_32_MANIFEST:manifest,TAB_32_OUTPUT:out+'/'+name}});p.stdout.on('data',b=>chunks.push(b));p.stderr.on('data',b=>chunks.push(b));p.once('error',reject);p.once('close',resolve);});
  await writeFile(out+'/'+name+'.log',Buffer.concat(chunks));
  const previous=JSON.parse(await readFile(baseline)),result=checkTabRegression(selectedCases.length?previous.filter(c=>selectedCases.includes(c.id)):previous,JSON.parse(await readFile(out+'/'+name+'/report.json')));reports.push({name,exit,...result});await writeFile(out+'/summary.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.at(-1)));
 }
}finally{await server.close();}
if(reports.some(r=>r.exit||!r.passed))process.exitCode=1;
