import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {fillDrumMeasure,enterDrumNotes} from '../src/etudes/drumInput.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.QA_OUT??'artifacts/drum-pdf-roundtrip',url=process.env.APP_URL??'http://127.0.0.1:5188/#etudes';
await mkdir(out,{recursive:true});
// Author with the editor's input commands, export through the real editor,
// then import those PDF bytes into a fresh library and test detection/playback.

{
let d={...convertScoreInstrument(createBlankDocument(),'drums'),title:'Drum PDF roundtrip - 37 measures',bpm:120,viewSettings:{notationView:'staff',measuresPerRow:3,systemBreaks:[]},measures:Array.from({length:37},()=>blankMeasure())};
const rhythm=duration=>({selectedDuration:duration,dottedMode:'off',tupletMode:'off'});
for(let bar=0;bar<d.measures.length;bar++){
 const duration=bar%3===0?'8':'16',hat=bar%4===2?46:42;
 d=fillDrumMeasure(d,{bar,event:0},[hat],rhythm(duration)).document;
 const at=tick=>d.measures[bar].events.findIndex(e=>e.onset===tick);
 for(const tick of [0,960])d=enterDrumNotes(d,{bar,event:at(tick)},[36],rhythm('4')).document;
 for(const tick of [480,1440])d=enterDrumNotes(d,{bar,event:at(tick)},[38],rhythm(duration)).document;
 if(bar%4===1)for(const tick of [0,960])d=enterDrumNotes(d,{bar,event:at(tick)},[38],rhythm(duration)).document;
 if(bar%4===3)d=enterDrumNotes(d,{bar,event:at(0)},[49],rhythm(duration)).document;
}
const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
await writeFile(`${out}/source.json`,JSON.stringify(d,null,2));
console.log(JSON.stringify({bars:d.measures.length,notes:d.measures.flatMap(b=>b.events.flatMap(e=>e.notes)).length,errors:compiled.errors,issues:compiled.issues}));

}
{
const source=JSON.parse(await readFile(`${out}/source.json`,'utf8'));
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
try{
 await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});},source);
 await page.goto(url,{waitUntil:'networkidle'});await page.locator('.desktopScorePage').first().waitFor();
 await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();await page.locator('[data-score-input]').waitFor();
 const editor=page.locator('.etudeEditor');
 await editor.locator('[data-bar-index="0"] .etudeEditorHit[data-event="0"]').last().click();await editor.getByRole('button',{name:'8분음표',exact:true}).first().click();await editor.getByRole('button',{name:'스네어',exact:true}).click();
 console.log('Editor: added snare to the simultaneous hat and kick.');
 await page.screenshot({path:`${out}/editor.png`});
 await editor.locator('.desktopPdfSave').click();const preview=page.locator('.print-preview-overlay');await preview.locator('[data-print-page] svg').first().waitFor();
 const pages=await preview.locator('[data-print-page]').count();assert.ok(pages>=2,'multi-page PDF');
 const numberBounds=await preview.locator('[data-print-page] .etudeMeasureNumber').evaluateAll(nodes=>nodes.map(n=>{const box=n.getBBox(),view=n.ownerSVGElement.viewBox.baseVal;return {number:n.textContent,left:box.x-view.x,right:view.x+view.width-box.x-box.width};}));
 await writeFile(`${out}/number-bounds.json`,JSON.stringify(numberBounds,null,2));
 assert.deepEqual(numberBounds.map(b=>Number(b.number)),Array.from({length:37},(_,i)=>i+1));
 assert.ok(numberBounds.every(b=>b.left>=0&&b.right>=0),'all printed measure numbers remain inside their SVG cells');
 await page.screenshot({path:`${out}/print-preview.png`});
 await writeFile(`${out}/print-pages.html`,await preview.innerHTML());
 const downloading=page.waitForEvent('download',{timeout:120000});await preview.getByRole('button',{name:'PDF 저장',exact:true}).click();
 const filename=preview.locator('.rt-pdf-filename');await filename.waitFor({timeout:10000});await filename.locator('input').fill('drum-roundtrip-37-bars');await filename.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();
 const download=await downloading;await download.saveAs(`${out}/drum-roundtrip-37-bars.pdf`);
 assert.deepEqual(errors,[]);const report={sourceBars:source.measures.length,sourceNotes:source.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,pages,filename:download.suggestedFilename(),errors};await writeFile(`${out}/export.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){await page.screenshot({path:`${out}/export-failure.png`});await writeFile(`${out}/export-failure.txt`,await page.locator('body').innerText());throw e;}finally{await browser.close();}


}
{
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('fretiva.pdf.library.v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('scores','readonly').objectStore('scores').getAll();q.onsuccess=()=>{db.close();resolve(q.result[0]);};q.onerror=()=>reject(q.error);};}));
const result={};
try{
 await page.addInitScript(()=>localStorage.setItem('language','ko'));await page.goto(url,{waitUntil:'networkidle'});
 await page.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles(`${out}/drum-roundtrip-37-bars.pdf`);
 const info=page.getByRole('dialog',{name:'PDF 악보 정보'});await info.getByRole('button',{name:'기기에 저장',exact:true}).click();await info.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'마디 자동 인식',exact:true}).click();const confirmation=page.getByRole('dialog',{name:'마디 자동 인식',exact:true});await confirmation.getByRole('button',{name:'분석 시작',exact:true}).click();
 const done=page.locator('.pdfAutoMeasures').getByRole('button',{name:'완료',exact:true});await done.waitFor({timeout:120000});result.summary=await page.locator('.pdfAutoMeasures').innerText();console.log(result.summary);
 await page.screenshot({path:`${out}/recognition-preview.png`});await done.click();
 await page.waitForTimeout(1200);result.record=await read();await writeFile(`${out}/recognition.json`,JSON.stringify(result,null,2));
 assert.equal(result.record.barMap.length,37,'exported 37 measures must be detected as 37');
 assert.deepEqual(result.record.barMap.map(b=>b.number),Array.from({length:37},(_,i)=>i+1));assert.ok(result.record.barMap.every(b=>b.beats===4));
 const systems=new Map();for(const bar of result.record.barMap){const key=`${bar.page}:${bar.system}`;systems.set(key,(systems.get(key)??0)+1);}result.systemCounts=[...systems.values()];assert.deepEqual(result.systemCounts,[...Array(12).fill(3),1]);
 await page.getByRole('button',{name:'반복 설정',exact:true}).click();const repeat=page.getByRole('dialog',{name:'반복 설정',exact:true});await repeat.getByRole('spinbutton',{name:'반복 시작 마디',exact:true}).fill('2');await repeat.getByRole('spinbutton',{name:'반복 끝 마디',exact:true}).fill('3');await repeat.getByRole('button',{name:'설정 적용',exact:true}).click();
 if(await page.locator('.desktopDockCountIn').getAttribute('aria-pressed')==='true')await page.locator('.desktopDockCountIn').click();for(let i=0;i<16;i++)await page.locator('.desktopPracticeDock .metronomeHeroBpmJumpButton--up').click();
 await page.locator('.desktopDockPlay').click();result.playback=await page.evaluate(async()=>{const visits=[];let prior,start=performance.now(),maxPlayheads=0;await new Promise(resolve=>{const tick=now=>{const nodes=[...document.querySelectorAll('.pdfPlayhead')].filter(n=>n.getBoundingClientRect().width>0),bar=nodes[0]?.dataset.bar;maxPlayheads=Math.max(maxPlayheads,nodes.length);if(bar&&bar!==prior){visits.push({bar:+bar,ms:Math.round(now-start)});prior=bar;}if(now-start<6200)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});return {visits,maxPlayheads};});await page.locator('.desktopDockPlay').click();
 assert.deepEqual(result.playback.visits.slice(0,6).map(v=>v.bar),[2,3,2,3,2,3]);assert.equal(result.playback.maxPlayheads,1);await page.screenshot({path:`${out}/recognized-loop.png`});
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'마디 자동 인식',exact:true}).waitFor();assert.deepEqual((await read()).barMap,result.record.barMap,'mapping survives reopen');result.reopened=true;result.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify({bars:37,systems:result.systemCounts,playback:result.playback,reopened:true,errors}));
}catch(error){await page.screenshot({path:`${out}/recognition-failure.png`});await writeFile(`${out}/recognition-failure.txt`,await page.locator('body').innerText());throw error;}finally{await writeFile(`${out}/recognition.json`,JSON.stringify(result,null,2));await browser.close();}

}
