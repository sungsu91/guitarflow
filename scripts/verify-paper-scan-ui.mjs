import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [file,out='artifacts/paper-scan-ui']=process.argv.slice(2);assert(file,'Supply a local JPG/PNG');await mkdir(out,{recursive:true});
await writeFile(`${out}/harness.jsx`, `import React from 'react';import {createRoot} from 'react-dom/client';import PdfTabImport from '../../../src/pdf/tab-import/PdfTabImport.jsx';const root=createRoot(document.getElementById('root'));window.testWorkers=[];const W=Worker;window.Worker=class extends W{constructor(...a){super(...a);window.testWorkers.push(this)}terminate(){this.closed=true;super.terminate()}};root.render(React.createElement(PdfTabImport,{mobile:new URLSearchParams(location.search).get('mobile')==='true',onClose:()=>root.unmount(),onOpen:d=>window.testDocument=d}));`);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),report=[];
try{
 for(const mobile of [true,false])for(const theme of ['light','classic-gold']){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.setDefaultTimeout(30000);
  const html=await server.transformIndexHtml('/__scan-ui',`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${theme==='light'?'#e9e6e0':'#15130f'}"><div id="root"></div><script type="module" src="/${out}/harness.jsx"></script></body></html>`);
  await page.route('**/__scan-ui?*',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__scan-ui?mobile=${mobile}`);
  const dialog=page.locator('dialog');await dialog.waitFor();
  const capture=page.locator('input[capture="environment"]');assert.equal(await capture.count(),mobile?1:0);
  await page.locator('input[type=file]').first().setInputFiles(file);await page.getByRole('img',{name:'악보 사진 미리보기'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.photoScanFrame canvas')?.width>1&&!document.querySelector('.photoScanPreview [role=status]')?.textContent.includes('준비'));
  await page.getByRole('button',{name:'영역 조정',exact:true}).click();
  const corner=page.getByRole('button',{name:'종이 모서리 1',exact:true});await corner.focus();await corner.press('ArrowRight');
  await page.getByRole('button',{name:'조정 완료',exact:true}).click();await page.getByRole('button',{name:'원본',exact:true}).click();
  await page.getByRole('button',{name:'보정본',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.photoScanPreview [role=status]')?.textContent.includes('준비'));
  const footer=await page.locator('dialog>footer').boundingBox(),bounds=await dialog.boundingBox();assert(footer.y+footer.height<=page.viewportSize().height+1);assert(bounds.height<=page.viewportSize().height);
  await page.locator('.tabPhotoPreview').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${theme}.png`});
  if(mobile){
   await capture.setInputFiles({name:'capture-second.jpg',mimeType:'image/jpeg',buffer:await readFile(file)});
   await page.waitForFunction(()=>document.querySelectorAll('.tabPhotoPreview select option').length===2);
  }
  await page.getByRole('button',{name:'취소',exact:true}).click();
  await page.waitForFunction(()=>window.testWorkers.every(w=>w.closed));assert.deepEqual(errors,[]);
  if(mobile&&theme==='light'){
   // Stall the processing response, then cancel while the real worker exists.
   await page.reload();await page.locator('dialog').waitFor();
   await page.evaluate(()=>{const W=Worker;window.Worker=class extends W{constructor(...args){super(...args);if(String(args[0]).includes('paperScan'))this.addEventListener('message',e=>e.stopImmediatePropagation(),true);}};});
   await page.locator('input[type=file]').first().setInputFiles(file);
   await page.waitForFunction(()=>window.testWorkers.some(w=>!w.closed));
   await page.locator('dialog>header button').click();await page.waitForFunction(()=>window.testWorkers.every(w=>w.closed));
   // An unavailable scanner still produces a usable original preview.
   await page.reload();await page.locator('dialog').waitFor();
   await page.evaluate(()=>{const W=Worker;window.Worker=class extends W{constructor(...args){if(String(args[0]).includes('paperScan'))throw Error('simulated scanner startup failure');super(...args);}};});
   await page.locator('input[type=file]').first().setInputFiles(file);
   await page.getByRole('img',{name:'악보 사진 미리보기'}).waitFor();
   await page.waitForFunction(()=>document.querySelector('.photoScanPreview [role=status]')?.textContent.includes('원본을 유지'));
   await page.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual(errors,[]);
  }
  report.push({mobile,theme,passed:true,footerVisible:true,workersClosed:true,cameraOnlyMobile:true});await page.close();
 }
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report));
