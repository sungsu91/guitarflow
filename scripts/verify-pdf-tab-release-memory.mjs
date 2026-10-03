import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.workers=[];const W=Worker;window.Worker=class extends W{constructor(...args){super(...args);this.entry={closed:false,url:String(args[0])};window.workers.push(this.entry);}terminate(){this.entry.closed=true;return super.terminate();}};});
await p.route('**/__memory',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));
const cdp=await p.context().newCDPSession(p);await mkdir('artifacts/pdf-tab-release/memory',{recursive:true});
try{
 await p.goto('http://127.0.0.1:5174/__memory');await p.locator('input').setInputFiles('artifacts/pdf-tab-corpus/helvetica-110dpi.pdf');
 const samples=[];
 for(let i=0;i<12;i++){
  const result=await p.evaluate(async()=>{const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');return (await importPdfTab(document.querySelector('input').files[0])).summary;});
  assert.equal(result.confirmed,38);assert.equal(result.measures,4);
  await cdp.send('HeapProfiler.collectGarbage');const heap=await cdp.send('Runtime.getHeapUsage'),live=await p.evaluate(()=>workers.filter(w=>!w.closed));assert.deepEqual(live,[]);
  samples.push({run:i+1,usedBytes:heap.usedSize,liveWorkers:live.length});
 }
 assert(samples.at(-1).usedBytes-samples[2].usedBytes<5*1024*1024,'retained heap should stabilize after warm-up');assert.deepEqual(errors,[]);
 await writeFile('artifacts/pdf-tab-release/memory/result.json',JSON.stringify({samples,errors},null,2));console.log(JSON.stringify(samples));
}finally{await browser.close();}
