// Real PDF.js/geometry/OCR with deterministic worker/network fault injection.
// No score truth is passed into the production importer.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
const label=process.argv[2]||'before',selected=process.argv.slice(3),out=`artifacts/pdf-tab-release/${label}`;
await mkdir(out,{recursive:true});
const cases=[
  {id:'native',file:'helvetica-native',bars:4},{id:'raster',file:'helvetica-110dpi',bars:4},
  ...['empty','truncated','encrypted','blank','staff-only','pages-21','huge','thin','tiny'].map(id=>({id,file:id,boundary:true,error:true})),
  {id:'pages-20',file:'pages-20',boundary:true,bars:80,timeout:90000},
  {id:'blank-middle',file:'blank-middle',boundary:true,bars:8,coverage:true},
  ...[90,180,270].map(r=>({id:`rotated-${r}`,file:`rotated-${r}`,boundary:true,error:true})),
  {id:'oversize',virtual:true,error:true},{id:'wrong-extension',file:'helvetica-native',name:'notes.png',error:true},
  {id:'uppercase-extension',file:'helvetica-native',name:'notes.PDF',bars:4},
  {id:'cancel-file-read',file:'helvetica-native',fault:'file-read',cancel:40},
  {id:'cancel-pdf-load',file:'helvetica-native',fault:'pdf-stall',cancel:500},
  {id:'cancel-geometry',file:'helvetica-native',fault:'geometry-stall',cancelAt:'geometry',cancel:30},
  {id:'cancel-ocr-load',file:'helvetica-110dpi',fault:'ocr-stall',cancelAt:'ocr',cancel:30},
  {id:'ocr-worker-crash',file:'helvetica-110dpi',fault:'ocr-crash',error:true},
  {id:'ocr-runtime-crash',file:'helvetica-110dpi',fault:'ocr-runtime-crash',error:true},
  {id:'geometry-worker-crash',file:'helvetica-native',fault:'geometry-crash',error:true},
  {id:'ocr-asset-404',file:'helvetica-110dpi',block:'**/tab-ocr/core/**',error:true},
  {id:'offline-cold',file:'helvetica-110dpi',offline:true,error:true},
  {id:'slow-cpu',file:'helvetica-110dpi',cpu:6,bars:4,timeout:90000},
];
const reports=[];
try{for(const test of cases.filter(t=>!selected.length||selected.includes(t.id))){
  const context=await browser.newContext(),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
    window.__workers=[];window.__unhandled=[];
    addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)));
    const OriginalWorker=window.Worker;
    window.Worker=class extends OriginalWorker{
      constructor(url,options){super(url,options);this.entry={url:String(url),closed:false};window.__workers.push(this.entry);this.entry.kind=String(url).includes('tab-ocr')?'ocr':String(url).includes('geometry')?'geometry':'pdf';}
      terminate(){this.entry.closed=true;return super.terminate();}
      postMessage(...args){
        const kind=this.entry.kind,fault=window.__fault,action=args[0]?.action;
        if(window.__cancelAt===kind&&!window.__cancelScheduled){window.__cancelScheduled=true;setTimeout(()=>window.__controller.abort(),window.__cancelDelay);}
        if(fault===`${kind}-stall`)return;
        if(fault===`${kind}-crash`||fault==='ocr-runtime-crash'&&kind==='ocr'&&action==='recognize'){
          setTimeout(()=>this.dispatchEvent(new ErrorEvent('error',{message:'Injected worker failure'})),10);return;
        }
        return super.postMessage(...args);
      }
    };
  });
  await p.route('**/__pdf-tab-release',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file" id="pdf">'}));
  await p.goto(`${origin}/__pdf-tab-release`);
  await p.evaluate(async()=>{window.__api=await import('/src/pdf/tab-import/importPdfTab.js');});
  if(test.cpu){const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:test.cpu});}
  if(test.block)await context.route(test.block,r=>r.fulfill({status:404,body:'not found'}));
  if(test.offline)await context.setOffline(true);
  if(test.file)await p.locator('#pdf').setInputFiles({name:test.name||`${test.file}.pdf`,mimeType:'application/pdf',buffer:await readFile(`${test.boundary?'artifacts/pdf-tab-release/fixtures':'artifacts/pdf-tab-corpus'}/${test.file}.pdf`)});
  const result=await p.evaluate(async test=>{
    window.__fault=test.fault;window.__controller=new AbortController();window.__cancelAt=test.cancelAt;window.__cancelDelay=test.cancel;
    let file=document.querySelector('#pdf').files[0];
    if(test.virtual)file={name:'huge.pdf',size:41*1024*1024,arrayBuffer(){throw Error('Oversize file was read');}};
    if(test.fault==='file-read'){const original=file;file={name:file.name,size:file.size,arrayBuffer:()=>new Promise(resolve=>setTimeout(async()=>resolve(await original.arrayBuffer()),400))};}
    const start=performance.now();let outcome,progress=[];
    if(test.cancel&&!test.cancelAt)setTimeout(()=>window.__controller.abort(),test.cancel);
    const pending=window.__api.importPdfTab(file,{signal:window.__controller.signal,onProgress:p=>{progress.push(p.message);}}).then(result=>({result}),error=>({error:{name:error?.name,message:error?.message??String(error)}}));
    const timeout=setTimeout(()=>{outcome={timeout:true};window.__controller.abort();},test.timeout??15000);
    const settled=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),test.timeout??15000))]);
    clearTimeout(timeout);if(!outcome)outcome=settled;
    await new Promise(resolve=>setTimeout(resolve,600));
    return {...outcome,summary:outcome.result?.summary,pages:outcome.result?.pages.map(p=>({page:p.page,staffs:p.staffs.length})),result:undefined,progress:progress.slice(-3),seconds:(performance.now()-start)/1000,liveWorkers:window.__workers.filter(w=>!w.closed),unhandled:window.__unhandled};
  },test);
  const failures=[];
  if(result.timeout)failures.push('operation did not settle before deadline');
  if(test.error&&!result.error)failures.push('expected an actionable error');
  if(test.bars&&result.summary?.measures!==test.bars)failures.push(`expected ${test.bars} bars`);
  if(test.cancel&&result.error?.name!=='AbortError')failures.push('cancel did not return AbortError');
  if(result.liveWorkers.length)failures.push('worker remains alive after operation');
  if(result.unhandled.length||errors.length)failures.push('unhandled browser error');
  if(test.coverage&&result.pages?.some(p=>!p.staffs)&&!result.summary?.pagesWithoutTab?.length)failures.push('missing page is not reported in summary');
  const report={id:test.id,passed:!failures.length,failures,...result,errors};reports.push(report);
  await writeFile(`${out}/engine.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(report));await context.close();
}}finally{await browser.close();}
