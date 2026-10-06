import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const env={...process.env,QUALITY_BASE_URL:`http://127.0.0.1:${server.httpServer.address().port}`,PLAYWRIGHT_MODULE:pathToFileURL(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href};
async function run(args){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${args[0]} exited ${code}`)));});}
try{
 await run(['scripts/verify-tab-technique-import.mjs','connections-20261006']);
 await run(['scripts/report-tab-technique-import.mjs','artifacts/ocr-techniques-20261004/connections-20261006/report.json']);
 await run(['scripts/verify-tab-32-corpus.mjs','connections-20261006']);
 await run(['scripts/check-tab-32-regression.mjs','tests/fixtures/thirty-second/baseline.json','artifacts/32nd-support/connections-20261006/report.json']);
 // These independent fixtures contain no H/P/slides. Check new attributes
 // explicitly; the older rhythm/fret oracle cannot detect invented effects.
 for(const root of ['artifacts/ocr-techniques-20261004/connections-20261006','artifacts/32nd-support/connections-20261006'])for(const file of (await readdir(root)).filter(f=>f.endsWith('.json')&&f!=='report.json')){
  const saved=JSON.parse(await readFile(`${root}/${file}`)),analysis=saved.analysis??saved;if(!analysis.pages)continue;
  for(const p of analysis.pages)for(const s of p.staffs)for(const m of s.measures)for(const slot of m.slots)assert(!slot.technique&&!slot.slurToNext,`${file}: invented connection at ${slot.x}`);
 }
 console.log('No invented H/P/slide/slur effects in the 48 negative fixtures.');
}finally{await server.close();}
