import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
import {ARPEGGIO_PATTERNS} from '../src/etudes/arpeggioPattern.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.ARPEGGIO_ORIGIN??'http://127.0.0.1:5174',out=process.env.ARPEGGIO_OUTPUT??'artifacts/arpeggio-patterns';
await mkdir(out,{recursive:true});
const source={...createBlankDocument(),title:'아르페지오 검증',bpm:120,measures:['C','G','D','Am'].map(harmony=>({...blankMeasure(),harmony}))};
const results=[];
try{
 for(const mobile of [true,false]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.addInitScript(d=>{
   localStorage.setItem('language','ko');localStorage.setItem('fretiva.score.sound','true');
   localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));
   localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));
   window.__meters=[];const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
  },source);
  const save=async()=>{
   await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();
   await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();
   await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
   return (await readBrowserScoreLibrary(page)).records[source.id].document;
  };
  const open=async()=>{
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   await page.locator('.etudeEditor').waitFor();
  };
  try{
   await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});await open();
   await page.locator('[data-mobile-tool-toggle="picking"]').click();const panel=page.locator('#mobile-tool-picking');
   await panel.getByRole('button',{name:'아르페지오',exact:true}).click();
   assert.equal(await panel.getByLabel('반주 패턴',{exact:true}).locator('option').count(),ARPEGGIO_PATTERNS.length);
   assert.equal(await panel.getByLabel('음표 길이',{exact:true}).count(),0);
   assert.match(await panel.locator('.arpeggioPreview').innerText(),/5 → 3 → 1 → 3/);
   await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('all');
   const engraving=()=>page.locator('.etudeEditor [data-bar-index="0"] [data-draw-count]').evaluateAll(ns=>ns.flatMap(n=>[...n.shadowRoot.querySelectorAll('svg text')].map(t=>t.textContent)));
   const before=await engraving();
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();
   const after=await engraving();assert.notDeepEqual(after,before);
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await engraving(),before);
   await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await engraving(),after);
   let stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.events.map(e=>e.notes[0].string)),[5,6,4,5].map(b=>[b,3,1,3,b,3,1,3]));
   await panel.getByLabel('반주 패턴',{exact:true}).selectOption('bass-3-pinch12-3');
   assert.match(await panel.locator('.arpeggioPreview').innerText(),/5 → 3 → \(1\+2\) → 3/);
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.events.map(e=>e.notes.map(n=>n.string))),[5,6,4,5].map(b=>[[b],[3],[1,2],[3],[b],[3],[1,2],[3]]));
   await panel.getByLabel('반주 패턴',{exact:true}).selectOption('bass-slap');
   assert.equal(await panel.getByLabel('음표 길이',{exact:true}).count(),0);
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();stored=await save();
   for(const m of stored.measures){assert.equal(m.events.length,8);assert.deepEqual(m.events[1].notes.map(n=>n.string),[1,2,3]);assert(m.events[2].notes.every(n=>n.dead));}
   const applied=structuredClone(stored);
   assert.equal(await panel.getByLabel('반주 패턴',{exact:true}).locator('option[value="bass-32123"]').evaluate(option=>option.disabled),true);
   await panel.getByLabel('반주 패턴',{exact:true}).selectOption('bass-slap');
   await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('range');await panel.getByLabel('아르페지오 끝 마디',{exact:true}).selectOption('2');
   assert.equal(await panel.getByLabel('아르페지오 코드',{exact:true}).count(),0);
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.harmony),['C','G','D','Am']);assert.deepEqual(stored.measures[3],applied.measures[3]);
   for(const width of mobile?[390,360]:[1440,1024]){
    await page.setViewportSize({width,height:mobile?844:1000});
    await panel.getByLabel('반주 패턴',{exact:true}).selectOption('bass-3-pinch12-3');
    await panel.getByLabel('반주 패턴',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-controls.png`});
    const box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,JSON.stringify(box));
    assert.equal(await panel.locator(mobile?'.desktopArpeggioControls':'.mobileArpeggioControls').count(),0);
   }
   await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});
   await panel.getByRole('button',{name:'다운·업 표시',exact:true}).click();
   assert.equal(await panel.locator('.arpeggioPatternChoice').count(),0);
   if(mobile)assert(await panel.getByRole('button',{name:'모두 다운',exact:true}).isVisible());else assert(await panel.getByLabel('일괄 피킹 패턴',{exact:true}).isVisible());
   await panel.getByRole('button',{name:'도구 닫기',exact:true}).click();
   const dock=page.locator('.editorAudioDock');
   if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();
   await dock.locator('.editorPlay').click();
   await page.waitForFunction(()=>document.querySelector('.editorPlay')?.getAttribute('aria-pressed')==='true');
   const peak=await page.evaluate(async()=>{let peak=0;for(let i=0;i<100;i++){for(const a of window.__meters){const v=new Float32Array(a.fftSize);a.getFloatTimeDomainData(v);for(const n of v)peak=Math.max(peak,Math.abs(n));}await new Promise(r=>setTimeout(r,50));}return peak;});
   assert(peak>.0001,`PCM ${peak}`);await dock.locator('.editorPlay').click();
   await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await open();
   assert.deepEqual((await readBrowserScoreLibrary(page)).records[source.id].document,stored);
   await page.getByRole('button',{name:mobile?'악보 편집 뒤로':'닫기',exact:true}).click();
   await page.locator('.etudeEditor').waitFor({state:'detached'});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();}
   else await page.getByRole('button',{name:'제작',exact:true}).click();
   await page.locator('.etudeEditor').waitFor();await page.locator('[data-mobile-tool-toggle="picking"]').click();
   await panel.getByRole('button',{name:'아르페지오',exact:true}).click();assert.equal(await panel.getByLabel('아르페지오 코드',{exact:true}).count(),0);assert(await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).isDisabled());
   await panel.getByRole('button',{name:'빠진 코드명 입력',exact:true}).click();
   await page.getByRole('dialog',{name:'코드명 선택',exact:true}).getByRole('button',{name:'입력 완료',exact:true}).click();
   if(mobile){if(!await panel.isVisible())await page.locator('[data-mobile-tool-toggle="picking"]').click();await panel.getByRole('button',{name:'아르페지오',exact:true}).click();}
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();
   await save();const added=Object.values((await readBrowserScoreLibrary(page)).records).find(r=>r.document.id!==source.id).document;
   assert.deepEqual(added.measures[0].events.map(e=>e.notes[0].string),[5,3,1,3,5,3,1,3]);
   assert.deepEqual(errors,[]);results.push({mobile,patterns:ARPEGGIO_PATTERNS.length,pinch12:true,undoRedo:true,saveReload:true,newScore:true,invalidPatternBlocked:true,range:true,peak,errors});console.log(JSON.stringify(results.at(-1)));
  }catch(error){await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-error.png`});console.error((await page.locator('body').innerText()).slice(-9000));throw error;}finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
