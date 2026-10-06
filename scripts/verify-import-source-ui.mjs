import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/import-source-20261006',preview=JSON.parse(await readFile(`${out}/doremi-p2-preview.json`));
const services=`
 export {photoFilesToAdd,preparePhoto} from '/src/pdf/tab-import/photoBatch.js';
 const pending=options=>{window.jobs??=[];window.jobs.push(options);window.updateProgress=options.onProgress;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}));};
 export const importPdfTab=(file,options)=>pending(options);
 export const importPhotoBatch=(photos,options)=>pending(options);
`;
const plugin={name:'source-ui-boundary',enforce:'pre',resolveId(id){if(id==='/__source-services')return '\0source-services';},load(id){if(id==='\0source-services')return services;},transform(code,id){if(id.replaceAll('\\','/').endsWith('/usePdfTabImport.js'))return code.replace("from './importPdfTab.js'","from '/__source-services'").replace("from './photoBatch.js'","from '/__source-services'");}};
const server=await createServer({plugins:[plugin],logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:900},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=await server.transformIndexHtml('/__source-ui','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:Arial;background:#e9e6e0"><div id="root"></div><script type="module" src="/scripts/import-selection-fixture.jsx"></script></body></html>');
 await page.route('**/__source-ui',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__source-ui`);
 const region=()=>page.getByRole('region',{name:'악보 인식 진행 상황'}),select=async name=>page.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
 try{
  await select('(보컬)도레미파.pdf');await page.getByRole('button',{name:'분석하기',exact:true}).click();await region().waitFor();assert((await region().innerText()).includes('(보컬)도레미파.pdf'),'filename is visible before first progress callback');
  await page.evaluate(preview=>window.updateProgress({progress:.37,message:'2 / 3페이지 · 오선 1/9 · 인식·검증 1회차 · 100초 경과',source:{fileName:'(보컬)도레미파.pdf',page:2,pages:3,preview},detail:{phase:'symbols',operation:'system',staff:1,total:9,attempt:1,seconds:100,region:{x:.04,y:.06,width:.92,height:.06}}}),preview);
  assert((await region().innerText()).includes('오선 전체의 음표·리듬 읽기'));assert((await region().innerText()).includes('인식 응답을 기다리고'));assert.equal(await region().locator('svg rect').count(),1);
  for(const size of mobile?[[390,844],[320,700]]:[[1440,900],[1366,768],[1024,720]]){
   await page.setViewportSize({width:size[0],height:size[1]});
   for(const theme of ['light','classic-gold']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    const dims=await page.locator('dialog').evaluate(d=>{const b=d.getBoundingClientRect(),f=d.querySelector('footer').getBoundingClientRect(),p=d.querySelector('svg').getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1,footerVisible:f.top>=0&&f.bottom<=innerHeight,previewVisible:p.top>=b.top&&p.bottom<=f.top};});assert(!dims.overflow&&dims.footerVisible&&dims.previewVisible,JSON.stringify(dims));
    await page.screenshot({path:`${out}/source-${size[0]}-${theme}.png`});
   }
  }
  await page.setViewportSize({width:mobile?1440:390,height:900});await page.locator(mobile?'.desktopPdfTabImport':'.mobilePdfTabImport').waitFor();assert.equal(await page.evaluate(()=>window.jobs.length),1);assert((await region().innerText()).includes('(보컬)도레미파.pdf'));
  await page.evaluate(preview=>window.updateProgress({progress:.38,message:'마디 확인 중',source:{fileName:'(보컬)도레미파.pdf',page:2,pages:3,preview},detail:{phase:'symbols',operation:'measure',staff:1,total:9,measure:3,attempt:2,seconds:0,region:{x:.5,y:.06,width:.15,height:.06}}}),preview);
  assert((await region().innerText()).includes('이 줄의 3번째 마디'));assert(!(await region().innerText()).includes('인식 응답을 기다리고'));
  await page.evaluate(()=>window.updateProgress({progress:.67,message:'3페이지 준비',source:{fileName:'(보컬)도레미파.pdf',page:3,pages:3,preview:null},detail:{phase:'structure'}}));assert.equal(await region().locator('svg').count(),0);assert(!(await region().innerText()).includes('3번째 마디'));
  await page.getByRole('button',{name:'분석 취소',exact:true}).click();assert(await page.evaluate(()=>window.jobs.at(-1).signal.aborted));
  await page.evaluate(()=>window.mountImport());await select('다른 파일.pdf');await page.getByRole('button',{name:'분석하기',exact:true}).click();await region().waitFor();
  await page.evaluate(()=>window.jobs[0].onProgress({progress:.99,source:{fileName:'STALE.pdf'}}));assert((await region().innerText()).includes('다른 파일.pdf'));assert(!(await region().innerText()).includes('STALE'));
  await page.getByRole('button',{name:'분석 취소',exact:true}).click();
  await page.evaluate(()=>window.mountImport());await page.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles([{name:'01.png',mimeType:'image/png',buffer:await readFile(`${out}/doremi-p2-first-staff.png`)},{name:'02.png',mimeType:'image/png',buffer:await readFile(`${out}/doremi-p2-first-staff.png`)}]);
  await page.getByRole('button',{name:'분석하기',exact:true}).click();await region().waitFor();
  await page.evaluate(preview=>window.updateProgress({progress:.6,message:'사진 분석',source:{fileName:'02.png',page:2,pages:2,preview},detail:{phase:'chords'}}),preview);await region().getByText('02.png',{exact:true}).waitFor();assert(!(await region().innerText()).includes('01.png'));assert((await region().innerText()).includes('악보 위 코드명 읽기'));
  await page.getByRole('button',{name:'분석 취소',exact:true}).click();assert.deepEqual(errors,[]);reports.push({mobile,filenameBeforeProgress:true,sourcePreview:true,staffAndMeasureHighlight:true,pageReset:true,photoIdentity:true,layoutSwitchPreservesJob:true,staleJobIgnored:true,errors});console.log(JSON.stringify({mobile,pass:true}));
 }catch(e){await page.screenshot({path:`${out}/ui-failure.png`});throw e;}finally{await page.close();}
}}finally{await writeFile(`${out}/ui-report.json`,JSON.stringify({boundary:'controlled pending recognition; real shared controller and separate layouts',reports},null,2));await browser.close();await server.close();}
