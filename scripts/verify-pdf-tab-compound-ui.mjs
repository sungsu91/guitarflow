// Test-only reference for a local 12/8 sample. The importer never sees this
// reference or the source filename: the picker receives a random PDF name.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {tabRepeatMask} from '../src/etudes/tabRepeat.js';
import {normalizePitches} from '../src/etudes/scoreTuning.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const output=process.env.PDF_TAB_COMPOUND_OUTPUT||'artifacts/pdf-tab-compound/ui';await mkdir(output,{recursive:true});
const inventory=JSON.parse(await readFile('artifacts/pdf-tab-folder/inventory.json'));
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('language','ko');window.__meters=[];const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);window.__meters.push(analyser);}return result;};
});
try{
 await page.goto(`${process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174'}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
 await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'PDF에서 TAB 초안 생성',exact:true}).click();
 await page.getByLabel('TAB 분석용 PDF 선택',{exact:true}).setInputFiles({name:`runtime-${crypto.randomUUID()}.pdf`,mimeType:'application/pdf',buffer:await readFile(inventory[8].path)});
 await page.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:120000});await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await page.locator('.pdfTabReviewBar').waitFor();
 const stored=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).find(r=>r.document.pdfTabImport).document);
 assert.deepEqual(stored.meter,[12,8]);assert.equal(stored.measures.length,69);assert.equal(stored.pdfTabImport.pages.length,3);
 const compiled=compileDocumentV2(stored);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
 for(const m of stored.measures){assert.equal(m.pdfImport.needsReview,false);assert.equal(m.events.reduce((n,e)=>n+ticksOf(e),0),2880);}
 assert.deepEqual(stored.measures[0].events.map(e=>e.duration),['4','8','4','8','4','8','4','8']);
 for(const index of [3,28]){
  const events=stored.measures[index].events;assert.deepEqual(events.map(e=>[e.duration,!!e.rest]),[['4',false],['8',false],['8',false],['8',false],['8',false],['4',false],['2',true]]);assert.ok(events.every(e=>!e.tuplet));
 }
 let slashes=0;
 for(let index=49;index<65;index++){
  const events=stored.measures[index].events;assert.deepEqual(events.map(e=>e.duration),['4','8','4','8','4','8','4','8']);assert.deepEqual(tabRepeatMask(events),[false,true,true,true,true,true,true,true]);slashes+=7;
 }
 for(const index of [24,65,66,67,68]){const events=stored.measures[index].events;assert.equal(events.length,1);assert.equal(events[0].duration,'1');assert.equal(events[0].dotted,true);}
 const fourth=page.locator('[data-bar-index="3"]');await fourth.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('[data-bar-index="3"] [data-draw-count]')?.shadowRoot?.querySelector('.tabRhythmRest'));
 const fourthDrawing=await fourth.locator('[data-draw-count]').evaluate(host=>({flags:host.shadowRoot.querySelectorAll('.tabRhythmFlag').length,beams:host.shadowRoot.querySelectorAll('.tabRhythmBeam').length,rests:host.shadowRoot.querySelectorAll('.tabRhythmRest').length,slashes:host.shadowRoot.querySelectorAll('[data-tab-repeat]').length}));
 assert.deepEqual(fourthDrawing,{flags:1,beams:2,rests:1,slashes:5});
 await page.screenshot({path:`${output}/first-four-bars.png`});
 for(const index of [49,50,64]){
  const bar=page.locator(`[data-bar-index="${index}"]`);await bar.scrollIntoViewIfNeeded();await page.waitForFunction(index=>document.querySelector(`[data-bar-index="${index}"] [data-draw-count]`)?.shadowRoot?.querySelectorAll('[data-tab-repeat]').length===7,index);
 }
 await page.locator('[data-bar-index="49"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/continuous-strum.png`});
 await page.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
 await page.locator('.desktopEditorActions').getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:stored.title}).click();await page.locator('.pdfTabReviewBar').waitFor();
 const reopened=await page.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,stored.id);assert.ok(JSON.stringify(reopened.measures)===JSON.stringify(normalizePitches(stored).measures),'save/reopen preserves every event and its derived MIDI pitch');assert.deepEqual(reopened.meter,[12,8]);
 const dock=page.locator('.editorAudioDock');if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();await dock.locator('.editorPlay').click();
 const peak=await page.evaluate(async()=>{let peak=0;for(let i=0;i<35;i++){for(const a of window.__meters){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);for(const v of data)peak=Math.max(peak,Math.abs(v));}await new Promise(r=>setTimeout(r,50));}return peak;});assert.ok(peak>.0001);await dock.locator('.editorPlay').click();
 assert.deepEqual(errors,[]);const report={pages:3,bars:69,meter:stored.meter,validRhythmBars:69,fourthDrawing,continuousStrumBars:16,continuousSlashes:slashes,reopened:true,instrumentPeak:peak,errors};await writeFile(`${output}/results.json`,JSON.stringify(report,null,2));console.log(report);
}catch(error){await page.screenshot({path:`${output}/error.png`});throw error;}finally{await browser.close();}
