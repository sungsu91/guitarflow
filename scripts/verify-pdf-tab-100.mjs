// Real files stay outside the repository. Every case reloads and renders its
// complete PDF through the production importer. Cached OCR crops are reported.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDocumentV2,cloneMeasures} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {enterFret,moveTone} from '../src/etudes/editorCommands.js';
import {editWholeBeat} from '../src/etudes/scoreBeatCommands.js';
import {copyScoreRange,pasteScoreRange} from '../src/etudes/scoreRangeClipboard.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const inventory=JSON.parse(await readFile('artifacts/pdf-tab-folder/inventory.json'));
const output=process.env.PDF_TAB_MATRIX_OUTPUT||'artifacts/pdf-tab-100/final';await mkdir(output,{recursive:true});
const cases=['automatic-cold','automatic-repeat','render-2.5','render-4.5','edit-fret','move-fret','copy-whole-beat','paste-range-twice','clone-measure','save-reopen'];
const signature=d=>d.measures.map(m=>m.events.map(e=>[e.onset,e.duration,!!e.dotted,!!e.tuplet,e.rest,e.notes.map(n=>[n.string,n.fret])]));
const noteCount=d=>d.measures.reduce((n,m)=>n+m.events.reduce((n,e)=>n+e.notes.length,0),0);
const selection=process.argv.slice(2).map(Number),queue=selection.length?inventory.filter(i=>selection.includes(i.index)):inventory;
const reports=selection.length?await readFile(`${output}/matrix.json`,'utf8').then(JSON.parse).catch(()=>[]):[];
try{for(const item of queue){
 for(let i=reports.length-1;i>=0;i--)if(reports[i].index===item.index)reports.splice(i,1);
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__pdf-matrix',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`${process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174'}/__pdf-matrix`);
 let expected;
 for(const [round,name] of cases.entries()){
  const start=Date.now(),record={index:item.index,file:item.name,round:round+1,name};
  try{
   await page.locator('input').setInputFiles(item.path);
   const {analysis,document:d,progressMonotonic}=await page.evaluate(async round=>{
    const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js'),{analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
    const progress=[];
    const a=await importPdfTab(document.querySelector('input').files[0],{signal:AbortSignal.timeout(600000),onProgress:p=>progress.push(p.progress),...(round===2?{renderScale:2.5,autoZoom:false}:round===3?{renderScale:4.5,autoZoom:false}:{})});
    return {analysis:a,document:analysisToDocument(a),progressMonotonic:progress.at(-1)===1&&progress.every((v,i)=>v>=0&&v<=1&&(!i||v>=progress[i-1]))};
   },round);
   const c=compileDocumentV2(d);assert.deepEqual(c.errors,[]);assert.equal(scorePlaybackReadiness(d,c).allowed,true);assert.equal(progressMonotonic,true);
   assert.equal(d.pdfTabImport.pages.length,analysis.summary.pages);assert.ok(d.pdfTabImport.pages.every(p=>p.count>0));assert.equal(d.measures.length,analysis.summary.measures);
   if(round===0){expected=signature(d);await writeFile(`${output}/${item.index}-analysis.json`,JSON.stringify(analysis));await writeFile(`${output}/${item.index}-document.json`,JSON.stringify(d));}
   if(round===1||round>=4)assert.deepEqual(signature(d),expected,'cold/repeated imports must not repeat the first four bars or change music');
   let next=d;const found=d.measures.flatMap((m,bar)=>m.events.map((e,event)=>({e,bar,event}))).find(x=>x.e.notes.length),cursor={bar:found.bar,event:found.event,string:found.e.notes[0].string};
   if(round===4){next=enterFret(d,cursor,(found.e.notes[0].fret+1)%13);assert.equal(noteCount(next),noteCount(d));assert.equal(next.measures[cursor.bar].events[cursor.event].notes.find(n=>n.string===cursor.string).fret,(found.e.notes[0].fret+1)%13);}
   if(round===5){const available=[1,2,3,4,5,6].find(s=>!found.e.notes.some(n=>n.string===s));next=moveTone(d,cursor,available?{...cursor,string:available,mode:'tab'}:{...cursor,mode:'staff',midi:d.tuning[cursor.string-1]+(found.e.notes[0].fret+1)%13});assert.equal(noteCount(next),noteCount(d));const moved=next.measures[cursor.bar].events[cursor.event].notes.find(n=>n.id===found.e.notes[0].id);assert.ok(moved);assert.ok(available?moved.string===available:moved.fret!==found.e.notes[0].fret);}
   if(round===6)next=editWholeBeat(d,{bar:0,event:0,string:1},{copy:true}).document;
   if(round===7){const range={start:{bar:0,event:0},end:{bar:0,event:d.measures[0].events.length-1}},clip=copyScoreRange(d,range);next=pasteScoreRange(d,{bar:0,event:0},clip);const once=signature(next);next=pasteScoreRange(next,{bar:0,event:0},clip);assert.deepEqual(signature(next),once);assert.equal(noteCount(next),noteCount(d));}
   if(round===8){next={...d,measures:[...d.measures,...cloneMeasures([d.measures[0]])]};assert.equal(noteCount(next),noteCount(d)+d.measures[0].events.reduce((n,e)=>n+e.notes.length,0));}
   const compiled=compileDocumentV2(next);assert.deepEqual(compiled.errors,[]);assert.equal(scorePlaybackReadiness(next,compiled).allowed,true);
   const timeline=scoreTimeline(compiled.score,next.bpm);assert.ok(timeline.events.length>0);assert.ok(timeline.events.every(e=>Number.isFinite(e.midi)&&e.midi>=24&&e.midi<=108));assert.equal(timeline.events.length,noteCount(next));
   const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};const saved=saveLibraryDocument(storage,next);assert.equal(saved.saved,true);const reopened=loadLibrary(storage).records[next.id].document;assert.deepEqual(signature(reopened),signature(next));assert.equal(reopened.measures.length,next.measures.length);
   Object.assign(record,{passed:true,pages:analysis.summary.pages,measures:analysis.summary.measures,coverageMatchesDefault:analysis.summary.measures===expected.length,summary:analysis.summary,zoom:analysis.pages.map(p=>p.zoom??null),cachedCrops:analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.candidates)).filter(c=>c.ocr?.cacheHit).length,notesAfterEdit:noteCount(next),playable:true,savedReopened:true,progressMonotonic});
  }catch(e){Object.assign(record,{passed:false,error:e.stack});}
  record.seconds=(Date.now()-start)/1000;record.browserErrors=[...errors];reports.push(record);await writeFile(`${output}/matrix.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify({case:reports.length,index:item.index,name,passed:record.passed,seconds:record.seconds,confirmed:record.summary?.confirmed,error:record.error?.split('\n')[0]}));
 }
 await page.close();
}}finally{await browser.close();}
const checked=reports.filter(r=>queue.some(i=>i.index===r.index));assert.equal(checked.length,queue.length*10);assert.equal(checked.filter(r=>r.passed&&!r.browserErrors.length).length,queue.length*10);
