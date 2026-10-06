// The manifest remains in Node: only randomized PDF bytes reach the importer.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {qualityBrowser} from './quality-runtime.mjs';
import {oraclePositionMatches} from './tab-oracle-position.mjs';
import {diagnoseNoteFailure} from './tab-failure-diagnostics.mjs';
const root='artifacts/32nd-support',label=process.argv[2]??'candidate',selection=process.argv.slice(3),out=process.env.TAB_32_OUTPUT??`${root}/${label}`;
const manifest=JSON.parse(await readFile(process.env.TAB_32_MANIFEST??`${root}/fixtures/manifest.json`));await mkdir(out,{recursive:true});
const selected=manifest.cases.filter(c=>!selection.length||selection.some(x=>c.id===x||c.variant===x));
if(!selected.length)throw Error('No test cases selected; an empty run is not a passing test.');
const browser=process.env.RESCORE?null:await qualityBrowser();
const tally=()=>({notes:0,correct:0,fretErrors:0,stringErrors:0,missing:0,added:0,events:0,rhythmCorrect:0,rhythmErrors:0,beamErrors:0,restErrors:0,tieErrors:0,tupletErrors:0,expectedBars:0,detectedBars:0,barErrors:0,compiledErrors:0});
export function assess(item,analysis){
 const actual=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.map(m=>({m,p:{...p,width:m.source?.pageWidth??p.width,height:m.source?.pageHeight??p.height},s}))));
 const totals=tally(),byDuration={},doubleDigit=tally(),failures=[],claimed=new Set();
 totals.expectedBars=item.bars.length;totals.detectedBars=actual.length;
 for(const bar of item.bars){
  const match=actual.find(({m,p})=>p.page===bar.page&&Math.abs(m.x/p.width-bar.x/manifest.width)<.012&&Math.abs(m.y/p.height-bar.y/manifest.height)<.012&&Math.abs(m.width/p.width-bar.width/manifest.width)<.012);
  if(!match){totals.barErrors++;failures.push({page:bar.page,bar:bar.measure,type:'bar-missing'});}
  for(const [ei,e] of bar.events.entries()){
   const bucket=byDuration[e.duration]??=tally();totals.events++;bucket.events++;
   const tolerance=Math.min(8,...bar.events.filter((_,i)=>i!==ei).map(n=>Math.abs(n.x-e.x)))*.42;
   const position=(x,expectedX)=>match&&oraclePositionMatches(x,expectedX,{measure:match.m,pageWidth:match.p.width,bar,oracleWidth:manifest.width,tolerance,photo:item.sourceType==='image'});
   const s=match?.m.slots.find(s=>!claimed.has(s)&&position(s.x,e.x));
   if(s)claimed.add(s);
   const tupleOK=(s?.tuplet?.actualNotes??null)===(e.tuplet?.actualNotes??null)&&(s?.tuplet?.normalNotes??null)===(e.tuplet?.normalNotes??null);
   const rhythm=s&&s.duration===e.duration&&!!s.rest===e.rest&&!s.dotted&&tupleOK;
   for(const t of [totals,bucket])t[rhythm?'rhythmCorrect':'rhythmErrors']++;
   if(!rhythm)failures.push({page:bar.page,bar:bar.measure,event:ei+1,type:'rhythm',expected:{duration:e.duration,rest:e.rest,tuplet:e.tuplet},actual:s?{duration:s.duration,rest:s.rest,tuplet:s.tuplet,beamCount:s.beamCount}:null});
   if(!tupleOK)totals.tupletErrors++;
   if(!!s?.rest!==e.rest)totals.restErrors++;
   if(!e.rest&&Number(e.duration)>=8&&s&&s.duration!==e.duration)totals.beamErrors++;
   if(e.tie&&!match?.m.slots.find(n=>position(n.x,bar.events[ei+1].x))?.tieFromPrevious){totals.tieErrors++;failures.push({page:bar.page,bar:bar.measure,event:ei+1,type:'tie-missing'});}
   const notes=s?.notes.filter(n=>n.status==='confirmed')??[],used=new Set();
   for(const n of e.notes){
    const scopes=[totals,bucket,...(n.fret>=10?[doubleDigit]:[])];scopes.forEach(t=>t.notes++);
    let at=notes.findIndex((a,i)=>!used.has(i)&&a.string===n.string&&a.fret===n.fret&&!a.dead),type='correct';
    if(at<0){at=notes.findIndex((a,i)=>!used.has(i)&&a.string===n.string);type=at>=0?'fretErrors':'missing';}
    if(at<0){at=notes.findIndex((a,i)=>!used.has(i)&&a.fret===n.fret);if(at>=0)type='stringErrors';}
    if(at>=0)used.add(at);scopes.forEach(t=>t[type]++);
    if(type!=='correct')failures.push({page:bar.page,bar:bar.measure,event:ei+1,type,expected:n,actual:at<0?null:notes[at],trace:diagnoseNoteFailure({measure:match?.m,slot:s,string:n.string,type,actual:notes[at]}),diagnostics:s?.rejections});
   }
   totals.added+=notes.filter((_,i)=>!used.has(i)).length;
  }
 }
 for(const {m} of actual)for(const s of m.slots)if(!claimed.has(s))totals.added+=s.notes.filter(n=>n.status==='confirmed').length;
 totals.barErrors+=Math.max(0,actual.length-item.bars.length);
 return {totals,byDuration,doubleDigit,failures};
}
const reports=[];
try{for(const item of selected){
 let analysis,document,compileErrors=[],seconds=0;
 if(!browser){({analysis,document,compileErrors,seconds}=JSON.parse(await readFile(`${out}/${item.id}.json`)));}
 else{
  const page=await browser.newPage();
  await page.route('**/__32-corpus',r=>r.fulfill({contentType:'text/html',body:'<input id="file" type="file" multiple>'}));await page.goto(`${process.env.QUALITY_BASE_URL??'http://127.0.0.1:5174'}/__32-corpus`);
  await page.locator('#file').setInputFiles(await Promise.all((item.paths??[item.path]).map(async p=>({name:`${randomUUID()}.${item.sourceType==='image'?'jpg':'pdf'}`,mimeType:item.sourceType==='image'?'image/jpeg':'application/pdf',buffer:await readFile(p)}))));
  const start=Date.now();
  try{({analysis,document,compileErrors}=await page.evaluate(async sourceType=>{
   const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');const {compileDocumentV2}=await import('/src/etudes/scoreModel.js');
   const files=[...document.querySelector('#file').files],options={sourceMode:'tab',signal:AbortSignal.timeout(240000)};
   let analysis;
   if(sourceType==='image'){
    const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js'),photos=[];
    for(const file of files)photos.push(await preparePhoto(file,{signal:options.signal}));
    analysis=await importPhotoBatch(photos,options);
   }else analysis=await importPdfTab(files[0],options);
   const doc=analysisToDocument(analysis);
   return {analysis,document:doc,compileErrors:compileDocumentV2(doc).errors};
  },item.sourceType));seconds=(Date.now()-start)/1000;await writeFile(`${out}/${item.id}.json`,JSON.stringify({analysis,document,compileErrors,seconds}));}
  catch(error){reports.push({id:item.id,error:error.message});await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(item.id,error.message);await page.close();continue;}
  await page.close();
 }
 const documentStats={events:document.measures.reduce((n,m)=>n+m.events.length,0),notes:document.measures.reduce((n,m)=>n+m.events.reduce((v,e)=>v+e.notes.length,0),0),exactBars:item.bars.filter((b,i)=>{
  const m=document.measures[i];return m?.events.length===b.events.length&&b.events.every((e,j)=>{const a=m.events[j];return a.onset===e.onset&&a.duration===e.duration&&!!a.rest===e.rest&&(a.tuplet?.actualNotes??null)===(e.tuplet?.actualNotes??null)&&a.notes.length===e.notes.length&&e.notes.every(n=>a.notes.some(q=>q.string===n.string&&q.fret===n.fret));});
 }).length};
 const report={id:item.id,variant:item.variant,heldout:item.heldout,lowResolution:item.lowResolution,...assess(item,analysis),documentStats,compileErrors,seconds};report.totals.compiledErrors=compileErrors.length;
 await writeFile(`${out}/${item.id}-failures.json`,JSON.stringify(report.failures,null,2));reports.push(report);
 await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify({id:item.id,...report.totals,seconds}));
}}finally{await browser?.close();}
if(reports.length!==selected.length||reports.some(r=>r.error))process.exitCode=1;
