import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {createBlankDocument,blankEvent,compileDocumentV2} from '../src/etudes/scoreModel.js';
const mode=process.argv[2]??'export',root='artifacts/ocr-followup-20261005',out=root+'/roundtrip';await mkdir(out,{recursive:true});
const d=createBlankDocument();d.title='Tuplet regression';
d.measures=[[6,4],[3,8],[6,16],[3,32]].map(([count,duration],bar)=>{
 const normal=count===3?2:4,length=1920/duration*normal/count,n=1920/length;
 return {id:`b-${bar}`,events:Array.from({length:n},(_,i)=>({...blankEvent(i*length,String(duration)),id:`e-${bar}-${i}`,blank:false,rest:false,notes:[{id:`n-${bar}-${i}`,string:i%3+1,fret:i%5}],tuplet:{actualNotes:count,normalNotes:normal,groupId:`t-${bar}-${Math.floor(i/count)}`}}))};
});assert.deepEqual(compileDocumentV2(d).errors,[]);
await writeFile(out+'/exercise.json',JSON.stringify(d,null,2));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{
 for(const version of ['before','after']){
  const p=await browser.newPage({viewport:{width:794,height:1123}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__vite_plugin_react_preamble_installed__=true;window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;});
  await p.route('**/__roundtrip',r=>r.fulfill({contentType:'text/html',body:'<style>@page{size:A4;margin:10mm}body{margin:0;background:white}section{break-inside:avoid;margin:0 0 10px}svg{display:block;max-width:100%}</style><input type="file" style="display:none"><main></main>'}));
  if(mode==='export'&&version==='before'){
   const prior=(await readFile(root+'/before/tabRhythm.js','utf8')).replaceAll("from './","from '/src/etudes/");await writeFile(out+'/prior-tabRhythm.js',prior);
   await p.route('**/src/etudes/tabRhythm.js*',async r=>{const transformed=await server.transformRequest('/'+out+'/prior-tabRhythm.js');await r.fulfill({contentType:'application/javascript',body:transformed.code});});
  }
  await p.goto(`http://127.0.0.1:${server.httpServer.address().port}/__roundtrip`);
  if(mode==='export'){
   await p.evaluate(async d=>{
    const {drawScore}=await import('/src/etudes/Score.jsx'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js');
    const host=document.createElement('section');document.querySelector('main').append(host);drawScore(host,compileDocumentV2(d).score,{view:'tab',tabRhythm:true,editorWidth:710,measuresPerRow:1,editor:true});
    host.querySelectorAll('.etudeEditorHit,.etudeInputCursor').forEach(n=>n.remove());
   },d);
   await p.pdf({path:out+'/'+version+'.pdf',preferCSSPageSize:true,printBackground:true});await p.screenshot({path:out+'/'+version+'.png',fullPage:true});
  }else{
   const jpeg=mode==='jpeg';await p.locator('input').setInputFiles(out+'/'+version+(jpeg?'-stress.jpg':'.pdf'));
   let a;
   try{a=await p.evaluate(async jpeg=>{const options={sourceMode:'tab',signal:AbortSignal.timeout(240000)},file=document.querySelector('input').files[0];if(jpeg){const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js');const photo=await preparePhoto(file,{signal:options.signal,scan:true});return importPhotoBatch([photo],options);}const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');return importPdfTab(file,options);},jpeg);}
   catch(error){reports.push({version,error:error.message});console.log(JSON.stringify(reports.at(-1)));await p.close();continue;}
   await writeFile(out+'/'+version+(jpeg?'-jpeg':'')+'-analysis.json',JSON.stringify(a));
   const bars=a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)),counts=d.measures.map((m,i)=>({bar:i+1,expected:m.events.length,actual:bars[i]?.slots.length??0,correctNotes:m.events.filter((e,j)=>bars[i]?.slots[j]?.notes.some(n=>n.status==='confirmed'&&n.string===e.notes[0].string&&n.fret===e.notes[0].fret)).length,correctRhythm:m.events.filter((e,j)=>{const s=bars[i]?.slots[j];return s?.duration===e.duration&&s.tuplet?.actualNotes===e.tuplet.actualNotes&&s.tuplet?.normalNotes===e.tuplet.normalNotes;}).length}));
   reports.push({version,bars:bars.length,counts});console.log(JSON.stringify(reports.at(-1)));
  }
  assert.deepEqual(errors,[]);await p.close();
 }
 if(mode!=='export'){
  assert(!reports[1].error,reports[1].error);
  if(!reports[0].error){assert.equal(reports[1].bars,reports[0].bars);
   for(const [i,b] of reports[0].counts.entries()){const a=reports[1].counts[i];assert.equal(a.actual,b.actual);assert(a.correctRhythm>=b.correctRhythm,JSON.stringify({before:b,after:a}));assert(a.correctNotes>=b.correctNotes,JSON.stringify({before:b,after:a}));}
  }
 }
}finally{await writeFile(out+'/'+mode+'-report.json',JSON.stringify(reports,null,2));await browser.close();await server.close();}
