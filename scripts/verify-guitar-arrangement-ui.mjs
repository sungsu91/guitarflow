import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const out=process.env.ARRANGEMENT_AUDIT_OUT??'artifacts/guitar-arrangement-20261006';await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile(process.env.ARRANGEMENT_AUDIT_SOURCE??`${out}/now-first-measure.json`)).document;
const harmony=process.env.ARRANGEMENT_AUDIT_CHORD??'Cmaj7';
const expectedMelody=JSON.parse(process.env.ARRANGEMENT_AUDIT_MELODY??'[[71,0,0.5],[69,0.5,0.5],[64,1,0.5],[71,1.5,1],[64,2.5,0.5],[71,3,0.5],[69,3.5,0.5]]');
source.measures[0].harmony=harmony;source.measures[0].harmonyChanges=[{onset:0,name:harmony}];
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser(),results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.addInitScript(d=>{
   if(!localStorage.getItem('arrangement-test-seeded')){
    localStorage.setItem('language','ko');localStorage.setItem('fretiva.score.sound','true');
    localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));
    localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));localStorage.setItem('arrangement-test-seeded','yes');
   }
   window.__arrangementMeters=[];const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);window.__arrangementMeters.push(analyser);}return result;};
  },source);
  try{
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   await page.locator('.etudeEditor').waitFor();
   await page.screenshot({path:`${out}/piano-source-${mobile?'mobile':'desktop'}.png`});
   await page.getByRole('button',{name:'기타 편곡',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'기타 편곡',exact:true}),preview=dialog.getByRole('button',{name:mobile?'미리보기':'편곡 미리보기',exact:true}),apply=dialog.getByRole('button',{name:'편곡본으로 열기',exact:true});
   assert(await apply.isDisabled());
   await preview.click();await dialog.getByRole('region',{name:'편곡 미리보기'}).waitFor();assert(await apply.isEnabled());
   assert.equal(await page.locator(mobile?'.desktopGuitarArrangement':'.mobileGuitarArrangement').count(),0);
   await dialog.getByRole('radio',{name:/핑거스타일/}).check();assert(await apply.isDisabled());
   await preview.click();await dialog.getByRole('region',{name:'편곡 미리보기'}).waitFor();
   await dialog.getByLabel('편곡 오른손 패턴').selectOption('bossa-basic');assert(await apply.isDisabled());await preview.click();await dialog.getByRole('region',{name:'편곡 미리보기'}).waitFor();
   for(const width of mobile?[390,360]:[1440,1024]){
    await page.setViewportSize({width,height:mobile?844:1000});const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);assert(box.y>=0&&box.y+box.height<=(mobile?844:1000)+1);
    assert(await apply.isVisible());await page.screenshot({path:`${out}/arrangement-${width}.png`});
   }
   const originalRecord=(await readBrowserScoreLibrary(page)).records[source.id].document;
   await apply.click();await dialog.waitFor({state:'detached'});
   const save=async()=>{await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});return readBrowserScoreLibrary(page);};
   const stored=await save(),arranged=Object.values(stored.records).map(r=>r.document).find(d=>d.guitarArrangement);
   assert(arranged);assert.notEqual(arranged.id,source.id);assert.deepEqual(stored.records[source.id].document,originalRecord);
   assert.equal(arranged.guitarArrangement.sourceDocument.id,source.id);assert.equal(arranged.guitarArrangement.options.template,'bossa-basic');
   assert.deepEqual(compileDocumentV2(arranged).issues,[]);
   const audio=scoreTimeline(compileDocumentV2(arranged).score,60).events.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]);
   assert.deepEqual(audio,expectedMelody);
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();await page.getByRole('button',{name:'다시 실행',exact:true}).click();
   const redo=Object.values((await save()).records).map(r=>r.document).find(d=>d.id===arranged.id);assert.deepEqual(redo.measures,arranged.measures);
   const entry=await page.getByRole('button',{name:'기타 편곡',exact:true}).boundingBox(),viewport=page.viewportSize();assert(entry.x>=0&&entry.x+entry.width<=viewport.width+1);await page.screenshot({path:`${out}/arranged-score-${mobile?'mobile':'desktop'}.png`});
   const dock=page.locator('.editorAudioDock');if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();await dock.locator('.editorPlay').click();
   const peak=await page.evaluate(async()=>{let peak=0;for(let i=0;i<60;i++){for(const a of window.__arrangementMeters){const values=new Float32Array(a.fftSize);a.getFloatTimeDomainData(values);for(const n of values)peak=Math.max(peak,Math.abs(n));}await new Promise(r=>setTimeout(r,50));}return peak;});assert(peak>.0001,`PCM ${peak}`);if(await dock.locator('.editorPlay').getAttribute('aria-pressed')==='true')await dock.locator('.editorPlay').click();
   await page.getByRole('button',{name:'기타 편곡',exact:true}).click();await dialog.getByRole('button',{name:'편곡 전 원본으로 돌아가기',exact:true}).click();assert.equal(await page.locator('.scoreInstrumentSelect').inputValue(),'piano');
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await page.locator('.scoreInstrumentSelect').inputValue(),'guitar');
   await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});assert.deepEqual((await readBrowserScoreLibrary(page)).records[arranged.id].document.measures,arranged.measures);
   assert.deepEqual(errors,[]);results.push({mobile,sourcePreserved:true,workerPreview:true,optionInvalidation:true,separateLayout:true,saveReload:true,restoreOriginal:true,undoRedo:true,peak,melodyAudio:audio,errors});console.log(JSON.stringify({mobile,pass:true}));
  }catch(e){await page.screenshot({path:`${out}/arrangement-${mobile?'mobile':'desktop'}-error.png`});console.error((await page.locator('body').innerText()).slice(-5500));throw e;}finally{await page.close();}
 }
}finally{await writeFile(`${out}/ui-results.json`,JSON.stringify(results,null,2));await browser.close();await server.close();}
