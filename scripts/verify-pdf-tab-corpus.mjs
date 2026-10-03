// Browser OCR benchmark against an independent ReportLab engraving oracle.
// Only randomized-name PDF bytes enter the importer; expected notes stay in Node.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||pathToFileURL(path.join(process.env.LOCALAPPDATA||'C:/Users/User/AppData/Local','../../.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const label=process.argv[2]||'after',selection=process.argv.slice(3);
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
const manifest=JSON.parse(await readFile('artifacts/pdf-tab-corpus/manifest.json'));
const output=`artifacts/pdf-tab-corpus/${label}`;await mkdir(output,{recursive:true});
const browser=process.env.PDF_TAB_RESCORE?null:await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];
function assess(item,analysis){
 const actual=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.map(m=>({m,p:{width:m.source?.pageWidth??p.width,height:m.source?.pageHeight??p.height},s}))));
 const result={expectedNotes:item.bars.flatMap(b=>b.events.flatMap(e=>e.notes)).length,correct:0,wrong:[],missing:0,exactRhythmBars:0,wrongDurations:[],completeBars:0,detectedBars:actual.length,expectedBars:item.bars.length};
 const claimed=new Set();
 for(const [bi,bar] of item.bars.entries()){
  const match=actual.find(({m,p})=>Math.abs(m.x/p.width-bar.x/manifest.width)<.012&&Math.abs(m.y/p.height-bar.y/manifest.height)<.012&&Math.abs(m.width/p.width-bar.width/manifest.width)<.012);
  let exact=!!match&&match.m.slots.length===bar.events.length,allNotes=!!match;
  for(const [ei,event] of bar.events.entries()){
   const slot=match?.m.slots.find(s=>Math.abs(s.x/match.p.width-event.x/manifest.width)<.009);
   const notes=slot?.notes.filter(n=>n.status==='confirmed')??[];
   if(slot)claimed.add(slot);
   if(!slot||slot.duration!==event.duration||slot.rest||slot.dotted||slot.tuplet){exact=false;if(slot?.duration)result.wrongDurations.push({bar:bi+1,event:ei+1,expected:event.duration,actual:slot.duration});}
   for(const note of event.notes){
    if(notes.some(n=>n.string===note.string&&(note.fret==='X'?n.dead:!n.dead&&n.fret===note.fret)))result.correct++;
    else {result.missing++;allNotes=false;}
   }
   for(const n of notes)if(!event.notes.some(note=>note.string===n.string&&(note.fret==='X'?n.dead:!n.dead&&n.fret===note.fret))){allNotes=false;result.wrong.push({bar:bi+1,event:ei+1,string:n.string,fret:n.dead?'X':n.fret});}
  }
  if(exact)result.exactRhythmBars++;
  if(exact&&allNotes)result.completeBars++;
 }
 for(const {m} of actual)for(const s of m.slots)if(!claimed.has(s))for(const n of s.notes.filter(n=>n.status==='confirmed'))result.wrong.push({unmatched:true,x:s.x,string:n.string,fret:n.dead?'X':n.fret});
 return result;
}
try{
 for(const item of manifest.cases.filter(c=>!selection.length||selection.includes(c.id))){
  if(!browser){
   const analysis=JSON.parse(await readFile(`${output}/${item.id}.json`));
   reports.push({id:item.id,...assess(item,analysis),summary:analysis.summary,zoom:analysis.pages.map(p=>p.zoom)});
   continue;
  }
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Every case gets a fresh page/OCR cache; no learning across test documents.
  await page.route('**/__pdf-tab-corpus',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input id="pdf" type="file">'}));
  await page.goto(`${origin}/__pdf-tab-corpus`);
  await page.locator('#pdf').setInputFiles({name:`${randomUUID()}.pdf`,mimeType:'application/pdf',buffer:await readFile(item.path)});
  const start=Date.now();let report;
  try{
   const analysis=await page.evaluate(async autoZoom=>{
    const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');
    return importPdfTab(document.querySelector('#pdf').files[0],{signal:AbortSignal.timeout(180000),autoZoom});
   },process.env.PDF_TAB_DISABLE_ZOOM!=='1');
   await writeFile(`${output}/${item.id}.json`,JSON.stringify(analysis));
   report={id:item.id,...assess(item,analysis),summary:analysis.summary,zoom:analysis.pages.map(p=>p.zoom),errors};
  }catch(error){report={id:item.id,error:error.message,errors};}
  report.seconds=(Date.now()-start)/1000;reports.push(report);await page.close();
  await writeFile(`${output}/report.json`,JSON.stringify(reports,null,2));
  console.log(JSON.stringify({...report,wrong:report.wrong?.length,wrongDurations:report.wrongDurations?.length}));
 }
}finally{await browser?.close();}
if(!browser){await writeFile(`${output}/rescored.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(r=>({id:r.id,correct:r.correct,wrong:r.wrong.length,missing:r.missing,rhythm:r.exactRhythmBars,wrongDurations:r.wrongDurations.length,complete:r.completeBars}))));}
