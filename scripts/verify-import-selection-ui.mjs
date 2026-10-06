import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';

const out=process.argv[2]??'artifacts/import-selection-20261006';await mkdir(out,{recursive:true});
// Only the expensive recognition boundary is controlled here. The actual
// controller, file decoding, previews, settings and both layouts run unchanged.
const services=`
 export {photoFilesToAdd,preparePhoto} from '/src/pdf/tab-import/photoBatch.js';
 async function recognize(kind,files,options){
  window.importCalls??=[];
  window.importCalls.push({kind,names:files.map(f=>f.name),sourceMode:options.sourceMode,target:structuredClone(options.target),autoScan:options.autoScan,signal:options.signal});
  options.onProgress({progress:.25,message:'Test recognition pending'});
  return new Promise((resolve,reject)=>{
   options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
   window.finishImport=fail=>fail?reject(Error('Test recognition failed')):resolve({fileName:files[0].name,target:options.target,pages:[{page:1,staffs:[]}],summary:{pages:1,measures:0,confirmed:0}});
  });
 }
 export const importPdfTab=(file,options)=>recognize('pdf',[file],options);
 export const importPhotoBatch=(photos,options)=>recognize('photos',photos.map(p=>p.file),options);
`;
const plugin={name:'import-selection-boundary',enforce:'pre',resolveId(id){if(id==='/__import-selection-services')return '\0import-selection-services';},load(id){if(id==='\0import-selection-services')return services;},transform(code,id){if(id.replaceAll('\\','/').endsWith('/usePdfTabImport.js'))return code.replace("from './importPdfTab.js'","from '/__import-selection-services'").replace("from './photoBatch.js'","from '/__import-selection-services'");}};
const server=await createServer({plugins:[plugin],logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();
const browser=await qualityBrowser(),errors=[],reports=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('language','ko');window.importCalls=[];window.workerStarts=[];
  const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,...args){window.workerStarts.push(String(url));super(url,...args);}};
 });
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 const html=await server.transformIndexHtml('/__selection-ui','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#e9e6e0;font-family:Arial"><div id="root"></div><script type="module" src="/scripts/import-selection-fixture.jsx"></script></body></html>');
 await page.route('**/__selection-ui',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`${base}/__selection-ui`);
 const analyze=()=>page.getByRole('button',{name:'분석하기',exact:true});
 const input=()=>page.getByLabel('PDF·사진 선택',{exact:true});
 const pitch=()=>page.getByRole('combobox',{name:'원본 오선보 음높이',exact:true});
 const instrument=()=>page.getByRole('combobox',{name:'불러올 악기',exact:true});
 const order=()=>page.getByRole('combobox',{name:'사진 페이지 순서',exact:true});
 const waitReady=()=>page.waitForFunction(()=>!document.body.textContent.includes('사진 미리보기 준비 중'));
 const countCalls=()=>page.evaluate(()=>window.importCalls.length);
 const fresh=async(target)=>{await page.evaluate(target=>window.mountImport(target),target);await input().waitFor();};
 const layoutCheck=async(name)=>{
  const dimensions=await page.locator('dialog').evaluate(d=>{const f=d.querySelector('footer').getBoundingClientRect();return {width:innerWidth,overflow:d.scrollWidth>d.clientWidth+1,footerVisible:f.top>=0&&f.bottom<=innerHeight+1,layout:d.className};});
  assert(!dimensions.overflow&&dimensions.footerVisible,JSON.stringify(dimensions));
  reports.push({name,...dimensions});await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
 };
 await input().waitFor();assert(await analyze().isDisabled());assert.equal(await pitch().inputValue(),'concert');
 for(const id of ['bass:5','ukulele:4','guitar:7']){await instrument().selectOption(id);assert.equal(await pitch().inputValue(),'concert');}
 await pitch().selectOption('octave-down');await instrument().selectOption('bass:4');assert.equal(await pitch().inputValue(),'octave-down');
 await page.locator('input[value=grand]').check();assert.equal(await instrument().count(),0,'piano hands are recognized before choosing an arrangement');
 await page.locator('input[value=staff]').check();await instrument().selectOption('guitar:6');assert(await page.locator('input[value=staff]').isChecked());
 await fresh();
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1100;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,800,1100);x.fillStyle='black';x.font='30px Arial';x.fillText('Selection preview fixture',60,60);for(let i=0;i<6;i++)x.fillRect(60,200+i*25,680,2);return c.toDataURL('image/png').split(',')[1];}),'base64');
 for(const name of ['page-1.png','page-2.png','page-3.png','replacement.png','last.png'])await writeFile(`${out}/${name}`,png);
 const photo=name=>`${out}/${name}`;
 await input().setInputFiles(photo('page-1.png'));await analyze().waitFor();await waitReady();assert(await analyze().isEnabled());
 assert.equal(await countCalls(),0);assert.deepEqual(await page.evaluate(()=>window.workerStarts),[],'selecting a photo must not start a scan or OCR worker');
 await page.getByLabel('사진 추가',{exact:true}).setInputFiles([photo('page-3.png'),photo('page-2.png')]);await waitReady();
 assert.deepEqual(await order().locator('option').allTextContents(),['1. page-1.png','2. page-2.png','3. page-3.png']);
 await page.getByLabel('사진 추가',{exact:true}).setInputFiles(photo('page-2.png'));await waitReady();assert.equal(await order().locator('option').count(),3);
 await page.getByLabel('사진 추가',{exact:true}).setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-invalid')});
 await page.getByRole('alert').waitFor();assert.equal(await order().locator('option').count(),3,'invalid additions preserve the existing queue');
 await order().selectOption('2');await page.getByRole('button',{name:'앞으로',exact:true}).click();
 assert.deepEqual(await order().locator('option').allTextContents(),['1. page-1.png','2. page-3.png','3. page-2.png']);
 await page.getByRole('button',{name:'삭제',exact:true}).click();assert.equal(await order().locator('option').count(),2);
 await input().setInputFiles([]);assert.equal(await order().locator('option').count(),2,'cancelling file selection preserves the queue');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.locator(width<600?'.mobilePdfTabImport':'.desktopPdfTabImport').waitFor();
  assert.equal(await order().locator('option').count(),2);assert.equal(await pitch().inputValue(),'concert');
  for(const theme of ['light','classic-gold']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await layoutCheck(`queue-${width}-${theme}`);}
 }
 assert.equal(await countCalls(),0);assert.deepEqual(await page.evaluate(()=>window.workerStarts),[]);
 await instrument().selectOption('bass:5');await analyze().click();assert.equal(await countCalls(),1);
 const call=await page.evaluate(()=>{const {signal,...call}=window.importCalls[0];return call;});
 assert.deepEqual(call.names,['page-1.png','page-2.png']);assert.equal(call.target.instrument,'bass');assert.equal(call.target.notationPitch,'concert');assert.equal(call.autoScan,true);
 assert.equal(await input().count(),0,'selection is locked during analysis');
 await page.setViewportSize({width:1440,height:960});await page.locator('.desktopPdfTabImport').waitFor();assert.equal(await countCalls(),1);
 await page.evaluate(()=>window.finishImport(true));await page.getByRole('button',{name:'다시 분석하기',exact:true}).waitFor();assert.equal(await order().locator('option').count(),2);
 await page.getByRole('button',{name:'다시 분석하기',exact:true}).click();assert.equal(await countCalls(),2);await page.evaluate(()=>window.finishImport(false));await page.getByRole('button',{name:'제작실에서 열기',exact:true}).waitFor();
 await fresh();
 // A small file is enough: recognition is intentionally stubbed, and the
 // assertion is that PDF parsing is never invoked at selection time.
 const pdfInput={name:'piano-melody.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nselection-only fixture')};
 await input().setInputFiles(pdfInput);await page.getByRole('region',{name:'선택한 파일'}).waitFor();assert.equal(await countCalls(),2);assert(await analyze().isEnabled());
 await page.setViewportSize({width:390,height:844});await page.locator('.mobilePdfTabImport').waitFor();assert(await page.getByRole('region',{name:'선택한 파일'}).innerText().then(s=>s.includes('piano-melody.pdf')));
 await layoutCheck('pdf-mobile');await page.getByRole('button',{name:'삭제',exact:true}).click();assert(await analyze().isDisabled());
 await input().setInputFiles(photo('replacement.png'));await waitReady();await input().setInputFiles(pdfInput);assert.equal(await order().count(),0);
 await pitch().selectOption('concert');await analyze().click();assert.equal(await countCalls(),3);assert.equal(await page.evaluate(()=>window.importCalls[2].kind),'pdf');
 await page.getByRole('button',{name:'분석 취소',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog'));assert(await page.evaluate(()=>window.importCalls[2].signal.aborted));
 await fresh();await input().setInputFiles(photo('last.png'));await waitReady();await page.getByRole('button',{name:'삭제',exact:true}).click();assert(await analyze().isDisabled());assert.equal(await page.getByLabel('사진 추가',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/ui-report.json`,JSON.stringify({reports,errors,calls:await countCalls(),passed:['no analysis or worker on selection','incremental photos and numeric order','deduplication and rejected additions preserve queue','reorder and removal','same state across layouts','settings captured on Analyze','failed analysis retains files for retry','PDF staging, replacement and removal','cancel aborts job','vocal/piano default and explicit override','piano recognition and arrangement are separate stages'],recognitionBoundary:'mocked; verifies UI lifecycle, not OCR accuracy'},null,2));
 console.log(JSON.stringify({passed:true,layouts:reports.length,errors}));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({error:error.stack,errors},null,2));throw error;}
finally{await browser.close();await server.close();}
