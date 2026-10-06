import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const root='artifacts/ocr-techniques-20261004',label=process.argv[2]??'techniques',selected=process.argv.slice(3),out=`${root}/${label}`;
const manifest=JSON.parse(await readFile(`${root}/fixtures/manifest.json`));await mkdir(out,{recursive:true});
const browser=await (process.env.TAB_TECHNIQUE_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})),reports=[];
try{for(const item of manifest.cases.filter(c=>!selected.length||selected.includes(c.id))){
 const page=await browser.newPage();await page.route('**/__techniques',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto('http://127.0.0.1:5174/__techniques');
 await page.locator('input').setInputFiles({name:randomUUID()+'.pdf',mimeType:'application/pdf',buffer:await readFile(item.path)});
 const {analysis,document}=await page.evaluate(async()=>{const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js'),{analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');const analysis=await importPdfTab(document.querySelector('input').files[0],{sourceMode:'tab',signal:AbortSignal.timeout(180000)});return {analysis,document:analysisToDocument(analysis)};});
 const measures=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)),report={id:item.id,bars:measures.length,correct:0,missing:[],wrong:[],harmonics:0,arpeggios:0,ties:0,wrongTechniques:[],missingTechniques:[],rhythm:0};
 for(const [bi,bar] of item.bars.entries()){
  const m=measures[bi],scale=m?.source.pageWidth/manifest.width;
  if(m?.slots.length===bar.events.length&&m.slots.every((s,i)=>s.duration===bar.events[i].duration&&!s.dotted&&!s.tuplet&&!s.rest))report.rhythm++;
  for(const [ei,e] of bar.events.entries()){
   const slot=m?.slots.find(s=>Math.abs(s.x/scale-e.x)<3),notes=slot?.notes.filter(n=>n.status==='confirmed')??[];
   for(const n of e.notes){const got=notes.find(g=>g.string===n.string&&g.fret===n.fret&&!g.dead);if(got){report.correct++;if(n.harmonic&&got.harmonic)report.harmonics++;if(!!n.harmonic!==!!got.harmonic)report.missingTechniques.push({bar:bi+1,event:ei+1,string:n.string,expectedHarmonic:!!n.harmonic,actualHarmonic:!!got.harmonic});}else report.missing.push({bar:bi+1,event:ei+1,...n});}
   for(const n of notes)if(!e.notes.some(g=>g.string===n.string&&g.fret===n.fret&&!n.dead))report.wrong.push({bar:bi+1,event:ei+1,string:n.string,fret:n.fret});
   if(e.arpeggio&&slot?.arpeggio===e.arpeggio)report.arpeggios++;
   if(e.arpeggio!==slot?.arpeggio)(slot?.arpeggio?report.wrongTechniques:report.missingTechniques).push({bar:bi+1,event:ei+1,expected:e.arpeggio,actual:slot?.arpeggio});
   if(e.tieContinuation&&slot?.tieFromPrevious){report.ties++;assert.equal(document.measures[bi].events[ei-1].tieTo,document.measures[bi].events[ei].id);}
   if(!!e.tieContinuation!==!!slot?.tieFromPrevious)(slot?.tieFromPrevious?report.wrongTechniques:report.missingTechniques).push({bar:bi+1,event:ei+1,expectedTie:!!e.tieContinuation,actualTie:!!slot?.tieFromPrevious});
  }
  for(const slot of m?.slots??[])if(!bar.events.some(e=>Math.abs(slot.x/scale-e.x)<3))for(const n of slot.notes.filter(n=>n.status==='confirmed'))report.wrong.push({bar:bi+1,event:'unexpected-column',string:n.string,fret:n.fret});
 }
 assert.equal(document.measures.length,measures.length);
 assert.equal(document.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).filter(n=>n.harmonic).length,measures.flatMap(m=>m.slots.flatMap(s=>s.notes)).filter(n=>n.harmonic&&n.status==='confirmed').length,'harmonics reach the score document');
 await writeFile(`${out}/${item.id}.json`,JSON.stringify(analysis));reports.push(report);await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify({...report,missing:report.missing.length,wrong:report.wrong.length,missingTechniques:report.missingTechniques.length,wrongTechniques:report.wrongTechniques.length}));await page.close();
}}finally{await browser.close();}
