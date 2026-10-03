import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
import {chordProgression} from '../src/etudes/arpeggioChords.js';
const source=JSON.parse(await readFile(process.env.ARPEGGIO_FIXTURE??'artifacts/imported-chords/document.json','utf8'));
assert.deepEqual(source.measures.slice(0,4).map(m=>m.harmony),['G','Am','D7','G']);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const origin=process.env.ARPEGGIO_ORIGIN??'http://127.0.0.1:5174',out=process.env.ARPEGGIO_OUTPUT??'artifacts/arpeggio-import';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(d=>{
   localStorage.setItem('language','ko');localStorage.setItem('fretiva.score.sound','true');
   localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));
   localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));
   window.__meters=[];const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
  },source);
  const save=async()=>{
   await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();
   await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
   return (await readBrowserScoreLibrary(page)).records[source.id].document;
  };
  try{
   await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   await page.locator('.etudeEditor').waitFor();
   const names=()=>page.locator('.etudeEditor [data-draw-count]').evaluateAll(ns=>ns.flatMap(n=>[...n.shadowRoot.querySelectorAll('[data-score-annotation="harmony"]')].map(el=>el.dataset.harmonyText)));
   const before=await names();assert(before.includes('G'),JSON.stringify(before));
   const baseline=await save();
   await page.locator('[data-mobile-tool-toggle="picking"]').click();const panel=page.locator('#mobile-tool-picking');
   await panel.getByRole('button',{name:'아르페지오',exact:true}).click();
   assert.equal(await panel.getByLabel('아르페지오 코드',{exact:true}).count(),0);
   await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('all');
   assert.match(await panel.locator('.arpeggioProgression').innerText(),/1: G → 2: Am → 3: D7 → 4: G/);
   assert(await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).isEnabled());
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await names(),before);
   await page.getByRole('button',{name:'다시 실행',exact:true}).click();
   const stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.harmony),baseline.measures.map(m=>m.harmony));
   assert(stored.measures.every(m=>!m.chord&&m.events.length===8));
   const progression=chordProgression(stored);
   for(const [i,m] of stored.measures.entries()){
    assert.deepEqual(m.harmonyChanges,baseline.measures[i].harmonyChanges);
    assert.equal(m.events[2].notes[0].fret,progression[i][0].shape.frets[5]);
   }
   assert.deepEqual(stored.measures.slice(0,4).map(m=>m.events[0].notes[0].string),[6,5,4,6]);
   assert.deepEqual(await names(),before);
   await panel.getByLabel('반주 패턴',{exact:true}).scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-automatic-chords.png`});
   await panel.getByRole('button',{name:'도구 닫기',exact:true}).click();
   const dock=page.locator('.editorAudioDock');if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();
   await dock.locator('.editorPlay').click();
   const peak=await page.evaluate(async()=>{let peak=0;for(let i=0;i<60;i++){for(const a of window.__meters){const v=new Float32Array(a.fftSize);a.getFloatTimeDomainData(v);for(const n of v)peak=Math.max(peak,Math.abs(n));}await new Promise(r=>setTimeout(r,50));}return peak;});
   assert(peak>.0001,`PCM ${peak}`);await dock.locator('.editorPlay').click();
   await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
   assert.deepEqual((await readBrowserScoreLibrary(page)).records[source.id].document,stored);
   assert.deepEqual(errors,[]);results.push({mobile,measures:stored.measures.length,chordNames:stored.measures.flatMap(m=>m.harmonyChanges??[]).length,progressionPreserved:true,undoRedo:true,saveReload:true,peak,errors});console.log(JSON.stringify(results.at(-1)));
  }catch(error){await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-error.png`});console.error((await page.locator('body').innerText()).slice(-7000));throw error;}finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
