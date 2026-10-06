import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const source=process.argv[2]??'artifacts/external-ocr-20261005/originals/lick.png',out=process.argv[3]??'artifacts/external-ocr-20261005/lifecycle';
await mkdir(out,{recursive:true});const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:true,open:false}});let browser;
const reports=[];
try{
 await server.listen();browser=await qualityBrowser();const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__lifecycle',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__lifecycle`);
 await page.addScriptTag({content:`window.testWorkers=[];const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);window.testWorkers.push(this)}terminate(){this.closed=true;return super.terminate()}}`});
 await page.locator('input').setInputFiles({name:'challenge.png',mimeType:'image/png',buffer:await readFile(source)});
 const cdp=await page.context().newCDPSession(page);let reference;
 for(const spec of [{name:'normal',cpu:1},{name:'cpu-four-times-slower',cpu:4},{name:'abort-decode',cpu:1,timeout:1},{name:'abort-active-ocr',cpu:4,timeout:1500},{name:'retry-same-page',cpu:1}]){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:spec.cpu});const start=Date.now();
  const result=await page.evaluate(async spec=>{
   const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js');
   try{const signal=AbortSignal.timeout(spec.timeout??60000),photo=await preparePhoto(document.querySelector('input').files[0],{signal}),a=await importPhotoBatch([photo],{sourceMode:'tab',signal});
    return {bars:a.summary.measures,fingerprint:a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.map(m=>m.slots.map(s=>({duration:s.duration,rest:!!s.rest,notes:s.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.fret,!!n.dead])}))))) };}
   catch(e){return {error:e.message,name:e.name};}
  },spec);
  const liveWorkers=await page.evaluate(()=>window.testWorkers.filter(w=>!w.closed).length);
  assert.equal(liveWorkers,0,`${spec.name}: worker leak`);assert.deepEqual(errors,[]);
  if(spec.timeout)assert(result.error,`${spec.name}: forced abort was not exercised`);
  else{assert.equal(result.error,undefined);assert.equal(result.bars,2);if(!reference)reference=result.fingerprint;else assert.deepEqual(result.fingerprint,reference,'slower CPU or retry must not alter recognized content');}
  const report={...spec,seconds:(Date.now()-start)/1000,liveWorkers,error:result.error,passed:true};reports.push(report);console.log(JSON.stringify(report));
 }
}finally{await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));await browser?.close();await server.close();}
