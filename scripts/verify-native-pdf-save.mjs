import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {qualityBrowser} from './quality-runtime.mjs';
import {createBlankDocument,blankMeasure,newId} from '../src/etudes/scoreModel.js';
const out='artifacts/pdf-save-dialog-20261006';await mkdir(out,{recursive:true});
const source={...createBlankDocument(),title:'컴퓨터 저장 검증',viewSettings:{notationView:'tab',tabRhythm:true,measuresPerRow:2},measures:Array.from({length:16},()=>{
 const m=blankMeasure();m.events=m.events.map((e,i)=>({...e,rest:false,blank:false,notes:[{id:newId('tone'),string:3,fret:[2,0,2,4][i],locked:true}]}));return m;
})};
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser(),results=[];
try{
 for(const mode of ['desktop-native','desktop-fallback','mobile','tablet']){
  const touch=mode==='mobile'||mode==='tablet',width=mode==='mobile'?390:mode==='tablet'?1194:1440,height=mode==='mobile'?844:900;
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,acceptDownloads:true,...(mode==='tablet'?{userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{})});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));let downloads=0;page.on('download',()=>downloads++);
  await page.addInitScript(({source,mode})=>{
   localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[source.id]:{status:'draft',document:source}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:source.id,pdfId:''}));
   window.pdfPickerCalls=[];window.pdfPickerMode='cancel';window.pdfShareCalls=0;window.pdfWrites=0;
   Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:mode==='desktop-fallback'?undefined:options=>{
    window.pdfPickerCalls.push({options,active:navigator.userActivation.isActive});
    if(window.pdfPickerMode==='cancel')return Promise.reject(new DOMException('Cancelled','AbortError'));
    if(window.pdfPickerMode==='denied')return Promise.reject(new DOMException('Denied','SecurityError'));
    return new Promise(resolve=>window.resolvePdfPicker=resolve);
   }});
   Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.[0]?.type==='application/pdf'});
   Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{window.pdfShareCalls++;window.pdfSharedBytes=[...new Uint8Array(await files[0].arrayBuffer())];if(window.pdfShareCalls===1)throw new DOMException('Cancelled','AbortError');}});
  },{source,mode});
  try{
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(touch){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   const open=async()=>{
    if(touch){await page.locator('.mobileScorePdfMenu>button').click();await page.getByRole('menuitem',{name:'PDF 저장',exact:true}).click();}
    else await page.locator('.etudeEditor .desktopPdfSave').click();
    await page.locator('.print-preview-overlay[open] [data-print-page] svg').first().waitFor();await page.locator('.print-preview-overlay').getByRole('button',{name:'PDF 저장',exact:true}).waitFor();
   };
   await open();const dialog=page.locator('.print-preview-overlay'),save=dialog.getByRole('button',{name:'PDF 저장',exact:true});await save.waitFor();
   await page.waitForFunction(()=>!document.querySelector('.rt-print-controls button:last-of-type').disabled);
   const count=await page.locator('[data-print-page]').count();let before=await page.locator('[data-print-page] svg').evaluateAll(ns=>ns.map(n=>n.outerHTML));assert(count>=2);
   let bytes;
   if(mode==='desktop-native'){
    await page.evaluate(async()=>{const dir=await navigator.storage.getDirectory();window.testPdfHandle=await dir.getFileHandle('선택한 파일.pdf',{create:true});const writer=await window.testPdfHandle.createWritable();await writer.write('EXISTING FILE');await writer.close();});
    await save.click();await page.waitForFunction(()=>window.pdfPickerCalls.length===1&&!document.querySelector('.rt-print-controls button:last-of-type').disabled);
    assert.equal(await dialog.locator('.rt-pdf-filename').count(),0);assert.equal(await dialog.getByRole('alert').count(),0);assert.equal(downloads,0);
    assert.equal(await page.evaluate(async()=>await(await window.testPdfHandle.getFile()).text()),'EXISTING FILE');
    await page.evaluate(()=>window.pdfPickerMode='denied');await save.click();await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').innerText(),/저장 창/);assert.equal(downloads,0);
    await page.evaluate(()=>window.pdfPickerMode='pending');await save.click();await page.waitForFunction(()=>window.pdfPickerCalls.length===3);
    // Closing while the native chooser is open must invalidate its result.
    await dialog.getByRole('button',{name:'닫기',exact:true}).click();await dialog.waitFor({state:'detached'});await page.evaluate(()=>window.resolvePdfPicker(window.testPdfHandle));
    await open();await page.waitForFunction(()=>!document.querySelector('.rt-print-controls button:last-of-type').disabled);
    before=await page.locator('[data-print-page] svg').evaluateAll(ns=>ns.map(n=>n.outerHTML));
    assert.equal(await page.evaluate(async()=>await(await window.testPdfHandle.getFile()).text()),'EXISTING FILE');
    await save.click();await page.waitForFunction(()=>window.pdfPickerCalls.length===4);
    assert.equal(await dialog.locator('.rt-pdf-filename').count(),0);assert.equal(await page.locator('iframe.html2canvas-container').count(),0,'rendering waits until a destination is chosen');
    await page.evaluate(()=>window.resolvePdfPicker({name:window.testPdfHandle.name,createWritable:()=>{window.pdfWrites++;return window.testPdfHandle.createWritable();}}));
    await dialog.getByText('선택한 파일.pdf 저장 완료',{exact:true}).waitFor({timeout:90000});
    bytes=await page.evaluate(async()=>[...new Uint8Array(await(await window.testPdfHandle.getFile()).arrayBuffer())]);
    const calls=await page.evaluate(()=>window.pdfPickerCalls);assert(calls.every(c=>c.active),'each chooser is called during user activation');assert(calls.every(c=>c.options.suggestedName==='컴퓨터 저장 검증.pdf'));
    assert.equal(await page.evaluate(()=>window.pdfWrites),1);assert.equal(downloads,0);
   }else if(mode==='desktop-fallback'){
    await save.click();await dialog.getByLabel('PDF 파일명').fill('다른 저장 방식');const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();
    const file=await download;assert.equal(file.suggestedFilename(),'다른 저장 방식.pdf');await file.saveAs(`${out}/${mode}.pdf`);bytes=await(await import('node:fs/promises')).readFile(`${out}/${mode}.pdf`);
    await dialog.locator('.rt-pdf-filename').waitFor({state:'detached'});assert.equal(downloads,1);
   }else{
    assert.equal(await dialog.getAttribute('data-layout'),'mobile');if(mode==='tablet')assert.equal(await page.locator('html').getAttribute('data-rifflab-device'),'tablet');
    await save.click();await dialog.getByRole('button',{name:'PDF 만들기',exact:true}).click();const share=dialog.getByRole('button',{name:'저장·공유',exact:true});await share.waitFor({timeout:90000});await share.click();
    await page.waitForFunction(()=>window.pdfShareCalls===1);await page.waitForFunction(()=>!document.querySelector('.rt-pdf-filename button[type="submit"]').disabled);
    assert.equal(await dialog.getByRole('alert').count(),0);assert.equal(await page.evaluate(()=>window.pdfPickerCalls.length),0,'touch devices keep sharing even if a computer picker API exists');
    await share.click();await dialog.locator('.rt-pdf-filename').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.pdfShareCalls),2);bytes=await page.evaluate(()=>window.pdfSharedBytes);assert.equal(downloads,0);
   }
   assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');await writeFile(`${out}/${mode}.pdf`,Buffer.from(bytes));
   const pdf=await getDocument({data:new Uint8Array(bytes)}).promise;assert.equal(pdf.numPages,count);await pdf.destroy();
   assert.deepEqual(await page.locator('[data-print-page] svg').evaluateAll(ns=>ns.map(n=>n.outerHTML)),before,'saving preserves all engraved notes and rhythms');
   const controlsBox=await page.locator('.rt-print-controls').boundingBox();assert(controlsBox.x>=0&&controlsBox.x+controlsBox.width<=width+1);await page.screenshot({path:`${out}/${mode}.png`});assert.deepEqual(errors,[]);
   results.push({mode,width,height,pages:count,pdfBytes:bytes.length,nativePickerCalls:await page.evaluate(()=>window.pdfPickerCalls.length),downloads,notesAndRhythmPreserved:true,errors});console.log(JSON.stringify(results.at(-1)));
  }catch(e){await page.screenshot({path:`${out}/${mode}-error.png`});console.error((await page.locator('body').innerText()).slice(-2500));throw e;}finally{await page.close();}
 }
}finally{await writeFile(`${out}/ui-results.json`,JSON.stringify(results,null,2));await browser.close();await server.close();}
