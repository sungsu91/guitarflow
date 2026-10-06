// Fault injection exercises the real PDF/photo orchestration and shared hook.
// OCR is deterministic here; actual-score recognition is audited separately.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {jsPDF} from 'jspdf';
const out=process.argv[2]??'artifacts/import-batches-20261006';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await qualityBrowser(),reports=[];
const pdfFixture=new jsPDF();for(let i=1;i<=9;i++){if(i>1)pdfFixture.addPage();pdfFixture.text('Page '+i,20,20);}const pdfBytes=[...new Uint8Array(pdfFixture.output('arraybuffer'))];
const mockAnalyzer=`import {resolvePage} from '/src/pdf/tab-import/recognition.js';
 export async function geometryInWorker(){return {staffs:[],notationSystems:[]};}
 export function createTabPageAnalyzer(signal,context={}){
  window.analyzers=(window.analyzers||0)+1;let state=structuredClone(context);
  return {getContext(){return state},async close(){window.closedAnalyzers=(window.closedAnalyzers||0)+1},async analyze(image,{page,meter,meterEvidence}){
   (window.calls??=[]).push(page);(window.contexts??=[]).push({page,meter,meterEvidence,state:structuredClone(state)});
   if(window.failPage===page){window.failPage=0;throw Error('TEST: page '+page+' failed');}
   if(window.holdPage===page)await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})});
   signal?.throwIfAborted();state={notationContext:{meter:[4,4],key:'D'},previous:[{string:1,fret:page}]};
   const staff={id:1,x:40,y:100,width:420,height:50,spacing:10,lines:[100,110,120,130,140,150],bars:[40,460],candidates:[100,200,300,400].map(cx=>({id:String(cx),x:cx-5,y:96,width:10,height:9,cx,cy:100,string:1,stringDistance:0,parts:1,ocr:{text:'3',confidence:.99,agrees:true,alternatives:[]}})),measures:[{x:40,y:100,width:420,height:50,boundariesKnown:true,rhythm:[100,200,300,400].map(x=>({x,y:180,duration:'4',confidence:.98,beamCount:0}))}]};
   return resolvePage({page,width:600,height:500,meter:[4,4],meterEvidence:{method:'test'},staffs:[staff]});
  }};
 }`;
const mockScan=`export async function detectPhotoPaper(){return {enabled:false,enhance:false,quad:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],version:1};}
 export async function scanPhotoSource(source){return source;}
 export async function choosePhotoSource(source){return {source,choice:'original'};}`;
async function harness(width,{mock=true}={}){
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 if(mock){await page.route('**/src/pdf/tab-import/analyzeTabPage.js',r=>r.fulfill({contentType:'text/javascript',body:mockAnalyzer}));await page.route('**/src/pdf/tab-import/paperScan.js',r=>r.fulfill({contentType:'text/javascript',body:mockScan}));}
 await page.route('**/__checkpoint-ui',r=>r.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const ReactModule=await import('/node_modules/.vite/deps/react.js'),React=ReactModule.default??ReactModule;const client=await import('/node_modules/.vite/deps/react-dom_client.js'),createRoot=client.createRoot??client.default.createRoot;const {default:Import}=await import('/src/pdf/tab-import/PdfTabImport.jsx');
 createRoot(document.getElementById('root')).render(React.createElement(Import,{mobile:${width<600},target:{instrument:'guitar'},onClose:()=>{window.didClose=true},onOpen:doc=>{window.opened=doc}}));</script>`}));
 await page.goto(`${base}/__checkpoint-ui`);try{await page.locator('dialog[open]').waitFor();}catch(e){console.error(errors);throw e;}return {page,errors};
}
try{
 for(const width of [1440,390]){
  const {page,errors}=await harness(width),d=page.locator('dialog[open]');
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=500;c.getContext('2d').fillRect(0,0,600,500);return c.toDataURL().split(',')[1]});
  const files=Array.from({length:9},(_,i)=>({name:`page-${i+1}.png`,mimeType:'image/png',buffer:Buffer.from(png,'base64')}));
  await d.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles(files);await d.getByRole('button',{name:'분석하기',exact:true}).click();
  await d.getByRole('button',{name:'3~4페이지 이어서 분석',exact:true}).waitFor().catch(async e=>{console.error(await d.innerText(),await page.evaluate(()=>({calls:window.calls,contexts:window.contexts})));throw e;});assert.deepEqual(await page.evaluate(()=>calls),[1,2]);
  await d.getByRole('button',{name:'완료한 2페이지만 열기',exact:true}).click();await page.waitForFunction(()=>window.opened);
  const partial=await page.evaluate(()=>window.opened);assert.equal(partial.pdfTabImport.summary.pageCoverage.complete,false);assert.equal(partial.measures.length,2);assert.match(partial.title,/1~2\/9/);
  await d.getByRole('button',{name:'3~4페이지 이어서 분석',exact:true}).click();await d.getByRole('button',{name:'5~6페이지 이어서 분석',exact:true}).waitFor();
  await page.evaluate(()=>window.failPage=5);await d.getByRole('button',{name:'5~6페이지 이어서 분석',exact:true}).click();
  await d.getByRole('button',{name:'5페이지부터 재시도',exact:true}).waitFor();assert.match(await d.innerText(),/4 \/ 9페이지 완료/);
  // Correcting only the failed photo must retain all four completed pages.
  await d.getByRole('button',{name:'90° 회전',exact:true}).click();assert.match(await d.innerText(),/4 \/ 9페이지 완료/);
  await page.evaluate(()=>window.holdPage=6);await d.getByRole('button',{name:'5~6페이지 이어서 분석',exact:true}).click();await page.waitForFunction(()=>window.calls.at(-1)===6);
  await d.getByRole('button',{name:'멈추고 결과 보관',exact:true}).click();await d.getByRole('button',{name:'6~7페이지 이어서 분석',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.didClose??false),false);assert.match(await d.innerText(),/5 \/ 9페이지 완료/);
  await page.evaluate(()=>window.holdPage=0);await d.getByRole('button',{name:'6~7페이지 이어서 분석',exact:true}).click();await d.getByRole('button',{name:'8~9페이지 이어서 분석',exact:true}).click();
  await d.getByRole('heading',{name:'악보 분석 완료',exact:true}).waitFor();
  const snapshot=await page.evaluate(()=>({calls,analyzers,closedAnalyzers,contexts}));assert.deepEqual(snapshot.calls,[1,2,3,4,5,5,6,6,7,8,9]);assert.equal(snapshot.analyzers,snapshot.closedAnalyzers);
  assert.equal(snapshot.contexts.find(c=>c.page===3).state.notationContext.key,'D');assert.equal(snapshot.contexts.filter(c=>c.page===6).at(-1).state.previous[0].fret,5);
  const openButton=d.locator('footer button').filter({hasText:/제작실/}).first();await openButton.click();await page.waitForFunction(()=>window.opened?.measures.length===9);
  assert.equal(await page.evaluate(()=>window.opened.pdfTabImport.summary.pageCoverage.complete),true);
  assert(await d.evaluate(node=>node.scrollWidth<=node.clientWidth+2),'dialog horizontal overflow');
  await page.screenshot({path:`${out}/completed-${width}.png`});assert.deepEqual(errors,[]);reports.push({width,kind:'photo-ui',...snapshot,errors});
  // Actual PDF rendering/text extraction, with injected OCR failure only.
  const pdfResult=await page.evaluate(async bytes=>{
   const file=new File([new Uint8Array(bytes)],'nine.pdf',{type:'application/pdf'}),{importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');window.calls=[];let resume,fail;
   for(let i=0;i<6;i++){if(i===2)window.failPage=5;try{resume=await importPdfTab(file,{sourceMode:'tab',autoZoom:false,pageLimit:2,resume})}catch(e){resume=e.partialAnalysis;fail={message:e.message,completed:resume.completed,nextPage:resume.nextPage}}if(resume.complete)break;}
   return {calls,fail,completed:resume.completed,complete:resume.complete,analyzers,closedAnalyzers};
  },pdfBytes);assert.deepEqual(pdfResult.calls,[1,2,3,4,5,5,6,7,8,9]);assert.equal(pdfResult.fail.completed,4);assert.equal(pdfResult.complete,true);assert.equal(pdfResult.analyzers,pdfResult.closedAnalyzers);reports.push({width,kind:'pdf-pipeline',...pdfResult});await page.close();
 }
 // Correction controls use real detection/warping workers and a supplied Canon photo.
 for(const width of [1440,390]){
  const {page,errors}=await harness(width,{mock:false}),d=page.locator('dialog[open]');
  const source=process.env.CORRECTION_PHOTO??'C:/Users/User/Desktop/asdasdasddasasdasdasd/KakaoTalk_20261004_124105538_01.jpg';
  await d.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles(source);await d.getByRole('button',{name:'자동 보정 미리보기',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.photoScanPreview')?.textContent.includes('자동 보정 후보'));
  await d.getByRole('button',{name:'보정본',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.photoScanPreview')?.textContent.includes('미리보기 준비 중'));
  const corrected=await d.locator('canvas').evaluate(c=>c.toDataURL());await d.getByRole('button',{name:'원본',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.photoScanPreview')?.textContent.includes('미리보기 준비 중'));
  const original=await d.locator('canvas').evaluate(c=>c.toDataURL());assert.notEqual(original,corrected,'correction actually changes the preview pixels');
  await d.getByRole('button',{name:'영역 조정',exact:true}).click();const corner=d.getByRole('button',{name:'종이 모서리 1',exact:true});await corner.focus();await corner.press('ArrowRight');await d.getByRole('button',{name:'조정 완료',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.photoScanPreview')?.textContent.includes('직접 지정한'));
  await d.getByLabel('그림자·밝기 보정',{exact:true}).check();await d.getByLabel('사진 보정',{exact:true}).uncheck();await page.waitForFunction(()=>document.querySelector('.photoScanPreview')?.textContent.includes('사진 보정 꺼짐'));
  await d.getByLabel('사진 보정',{exact:true}).check();assert.equal(await d.getByRole('button',{name:'보정본',exact:true}).isEnabled(),true);
  assert(await d.evaluate(node=>node.scrollWidth<=node.clientWidth+2));await page.screenshot({path:`${out}/correction-${width}.png`});assert.deepEqual(errors,[]);reports.push({width,kind:'real-correction-controls',differentPixels:true,errors});await page.close();
 }
}finally{await writeFile(`${out}/controls.json`,JSON.stringify(reports,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(reports.map(({contexts,...r})=>r)));
