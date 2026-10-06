import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const out='artifacts/import-activity-20261006';await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile('artifacts/chord-piano-followup-20261006/piano-wide-heads/now-p1-grand.json')).analysis;
const expected=JSON.parse(await readFile('artifacts/chord-piano-followup-20261006/now-page1-verified/result.json'));
const analysis={fileName:'NOW-piano-verified.pdf',target:{instrument:'piano',tuning:[],notationPitch:'concert'},pages:[source],summary:summarizeAnalysis([source])};
const services=`
 export {photoFilesToAdd,preparePhoto} from '/src/pdf/tab-import/photoBatch.js';
 export async function importPdfTab(file,options){
  window.importCalls??=[];window.importCalls.push(options);
  window.updateImportProgress=options.onProgress;
  options.onProgress({progress:.02,message:'1 / 7페이지 · 음표와 리듬 확인 중…'});
  return new Promise((resolve,reject)=>{
   options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
   window.finishImport=async fail=>fail?reject(Error('검증용 인식 오류')):resolve(await (await fetch('/__activity-analysis')).json());
  });
 }
 export const importPhotoBatch=()=>{throw Error('Not used in this lifecycle test');};
`;
const plugin={name:'activity-recognition-boundary',enforce:'pre',resolveId(id){if(id==='/__activity-services')return '\0activity-services';},load(id){if(id==='\0activity-services')return services;},transform(code,id){if(id.replaceAll('\\','/').endsWith('/usePdfTabImport.js'))return code.replace("from './importPdfTab.js'","from '/__activity-services'").replace("from './photoBatch.js'","from '/__activity-services'");}};
const server=await createServer({plugins:[plugin],logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{
 for(const mobile of [false,true]){
  const width=mobile?390:1440,height=mobile?844:960,page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  try{
   await page.addInitScript(()=>localStorage.setItem('language','ko'));
   await page.route('**/__activity-analysis',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(analysis)}));
   const html=await server.transformIndexHtml('/__activity-ui','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#e9e6e0;font-family:Arial"><div id="root"></div><script type="module" src="/scripts/import-selection-fixture.jsx"></script></body></html>');
   await page.route('**/__activity-ui',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__activity-ui`);
   const importDialog=()=>page.locator('.desktopPdfTabImport,.mobilePdfTabImport'),activity=()=>page.getByRole('region',{name:'악보 인식 진행 상황'}),elapsed=()=>activity().locator('time'),marks=()=>activity().locator('i');
   const choose=async()=>{await page.locator('input[value=grand]').check();await page.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles({name:'NOW.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-lifecycle-fixture')});};
   await choose();assert.equal(await activity().count(),0);await page.getByRole('button',{name:'분석하기',exact:true}).click();await activity().waitFor();
   assert.equal(await marks().count(),5);assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0.02');
   await page.waitForFunction(()=>!document.querySelector('[class$="ImportElapsed"]').textContent.includes('00:00'));
   const first=await marks().evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).transform));
   await page.waitForFunction(before=>JSON.stringify([...document.querySelectorAll('[class$="ImportScanMarks"] i')].map(n=>getComputedStyle(n).transform))!==JSON.stringify(before),first);
   await page.evaluate(()=>window.updateImportProgress({progress:.02,message:'1 / 7페이지 · 오선 2/6 · 다음 마디 확인 중…'}));assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0.02');assert(!(await elapsed().innerText()).includes('00:00'));
   for(const w of mobile?[390,320]:[1440,1024,820]){
    await page.setViewportSize({width:w,height});
    for(const theme of ['light','classic-gold']){
     await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
     const dims=await importDialog().evaluate(d=>{const b=d.getBoundingClientRect(),f=d.querySelector('footer').getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1,visible:b.x>=0&&b.right<=innerWidth+1&&f.bottom<=innerHeight+1};});assert(dims.visible&&!dims.overflow,JSON.stringify(dims));
     await page.screenshot({path:`${out}/activity-${w}-${theme}.png`});
    }
   }
   await page.setViewportSize({width:mobile?1440:390,height:mobile?960:844});await page.locator(mobile?'.desktopPdfTabImport':'.mobilePdfTabImport').waitFor();assert.equal(await page.evaluate(()=>window.importCalls.length),1);assert(!(await elapsed().innerText()).includes('00:00'));
   await page.setViewportSize({width,height});await page.locator(mobile?'.mobilePdfTabImport':'.desktopPdfTabImport').waitFor();
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await marks().first().evaluate(n=>getComputedStyle(n).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>window.finishImport(true));await page.getByRole('alert').waitFor();assert.equal(await activity().count(),0);
   await page.getByRole('button',{name:'다시 분석하기',exact:true}).click();await activity().waitFor();assert.equal(await elapsed().innerText(),'전체 경과 00:00');await page.evaluate(()=>window.finishImport(false));
   await page.getByRole('button',{name:'기타 TAB으로 편곡',exact:true}).waitFor();assert.equal(await activity().count(),0);
   await page.screenshot({path:`${out}/piano-result-${mobile?'mobile':'desktop'}.png`});
   await page.getByRole('button',{name:'피아노 원본으로 열기',exact:true}).click();await page.waitForFunction(()=>window.openedDocument?.instrument==='piano');const original=await page.evaluate(()=>structuredClone(window.openedDocument));assert.deepEqual(compileDocumentV2(original).errors,[]);
   assert.deepEqual(scoreTimeline(compileDocumentV2(original).score,60).events.map(n=>({midi:n.midi,start:n.start,duration:n.duration,voice:n.voice})),expected.audio);
   await page.getByRole('button',{name:'기타 TAB으로 편곡',exact:true}).click();
   const arrangement=page.getByRole('dialog',{name:'기타 편곡',exact:true});await arrangement.waitFor();assert(await arrangement.getByRole('button',{name:'편곡본으로 열기',exact:true}).isDisabled());
   await arrangement.getByRole('button',{name:mobile?'미리보기':'편곡 미리보기',exact:true}).click();await arrangement.getByRole('region',{name:'편곡 미리보기'}).waitFor();
   await page.setViewportSize({width:mobile?1440:390,height:mobile?960:844});await arrangement.waitFor();assert(await arrangement.getByRole('button',{name:'편곡본으로 열기',exact:true}).isEnabled(),'layout changes preserve the worker result');
   await arrangement.getByRole('button',{name:'편곡 닫기',exact:true}).click();await arrangement.waitFor({state:'detached'});assert(await page.getByRole('button',{name:'기타 TAB으로 편곡',exact:true}).isVisible());
   await page.setViewportSize({width,height});await page.getByRole('button',{name:'기타 TAB으로 편곡',exact:true}).click();await arrangement.getByRole('button',{name:mobile?'미리보기':'편곡 미리보기',exact:true}).click();await arrangement.getByRole('region',{name:'편곡 미리보기'}).waitFor();
   await page.screenshot({path:`${out}/piano-to-guitar-${mobile?'mobile':'desktop'}.png`});await arrangement.getByRole('button',{name:'편곡본으로 열기',exact:true}).click();await page.waitForFunction(()=>window.openedDocument?.instrument==='guitar');
   const arranged=await page.evaluate(()=>window.openedDocument);assert.deepEqual(arranged.guitarArrangement.sourceDocument,original);assert.deepEqual(compileDocumentV2(arranged).errors,[]);
   assert.deepEqual(scoreTimeline(compileDocumentV2(arranged).score,60).events.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),expected.expectedMelody);
   await page.evaluate(()=>window.mountImport({instrument:'piano'}));await choose();await page.getByRole('button',{name:'분석하기',exact:true}).click();await activity().waitFor();await page.getByRole('button',{name:'분석 취소',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog'));assert(await page.evaluate(()=>window.importCalls.at(-1).signal.aborted));
   assert.deepEqual(errors,[]);reports.push({mobile,animatedMarks:5,elapsedPreservedAcrossProgressAndLayout:true,realProgressUnchanged:true,reducedMotion:true,errorRetry:true,cancellation:true,directGuitarArrangement:true,pianoSourcePreserved:true,melodyAttacks:expected.expectedMelody.length,errors});console.log(JSON.stringify({mobile,pass:true}));
  }catch(e){await page.screenshot({path:`${out}/failure-${mobile?'mobile':'desktop'}.png`});console.error((await page.locator('body').innerText()).slice(-4000));throw e;}finally{await page.close();}
 }
}finally{await writeFile(`${out}/ui-results.json`,JSON.stringify({recognitionBoundary:'controlled pending job with previously source-verified NOW page 1 analysis; real conversion and arrangement worker',reports},null,2));await browser.close();await server.close();}
