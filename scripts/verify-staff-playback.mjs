import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const source=JSON.parse(await readFile('artifacts/staff-pitch-regression/real-photos/converted-document.json','utf8'));
const checked=compileDocumentV2(source),preview=scorePlaybackReadiness(source,checked);
assert.equal(preview.allowed,true);assert.deepEqual(preview.mutedMeasures,[35,40]);
const expected=scoreTimeline(checked.score).events.filter(e=>![35,40].includes(e.bar)),actual=scoreTimeline(preview.score).events;
assert.deepEqual(actual,expected);
const out=process.env.STAFF_PLAYBACK_OUTPUT||'artifacts/staff-playback';await mkdir(out,{recursive:true});
const results=[],origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 for(const mobile of [true,false]){
  const page=await browser.newPage({viewport:{width:mobile?440:1440,height:956}}),errors=[],name=mobile?'mobile':'desktop';page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(source=>{
   localStorage.setItem('language','ko');
   localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[source.id]:{status:'draft',document:source}}}));
   localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:source.id,pdfId:''}));
   window.__meters=[];const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(destination,...rest){const result=connect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
  },source);
  const sample=()=>page.evaluate(async()=>{let peak=0;for(let i=0;i<70;i++){for(const a of window.__meters){const values=new Float32Array(a.fftSize);a.getFloatTimeDomainData(values);for(const v of values)peak=Math.max(peak,Math.abs(v));}await new Promise(r=>setTimeout(r,50));}return peak;});
  try{
   await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   const notice=page.locator(mobile?'.mobileImportPlaybackNotice':'.desktopImportPlaybackNotice');await notice.waitFor();assert.match(await notice.innerText(),/36 · 41마디.*무음/);
   // Click and count-in are muted to measure actual instrument PCM only.
   await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();
   const countIn=page.getByRole('checkbox',{name:/카운트|예비/});if(await countIn.count()&&await countIn.first().isChecked())await countIn.first().uncheck();
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'메트로놈 볼륨',exact:true}).click();const mute=page.getByRole('button',{name:'클릭 음소거',exact:true});if(await mute.getAttribute('aria-pressed')!=='true')await mute.click();await page.keyboard.press('Escape');
   const start=page.locator('.etudePracticeStart');assert.equal(await start.isEnabled(),true);await start.click();
   await page.waitForFunction(()=>!document.querySelector('.etudePracticeStop')?.disabled);const practicePeak=await sample();assert(practicePeak>.0001,`practice PCM ${practicePeak}`);await page.locator('.etudePracticeStop').click();
   await page.screenshot({path:`${out}/${name}-practice.png`});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/,exact:false}).first().click();
   await page.locator('.etudeEditor').waitFor();await page.locator('.etudeEditor').locator(mobile?'.mobileImportPlaybackNotice':'.desktopImportPlaybackNotice').waitFor();
   const dock=page.locator('.editorAudioDock');assert.equal(await dock.locator('.editorPlay').isEnabled(),true);
   if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();
   await dock.locator('.editorPlay').click();await page.waitForFunction(()=>document.querySelector('.editorPlay')?.getAttribute('aria-pressed')==='true');
   const editorPeak=await sample();assert(editorPeak>.0001,`editor PCM ${editorPeak}`);await dock.locator('.editorPlay').click();
   await page.screenshot({path:`${out}/${name}-editor.png`});
   const saved=(await readBrowserScoreLibrary(page)).records[source.id].document;assert.deepEqual(saved,source);assert.deepEqual(errors,[]);
   results.push({name,passed:true,mutedBars:[36,41],practicePeak,editorPeak,sourceUnchanged:true,errors});console.log(JSON.stringify(results.at(-1)));
  }catch(error){await page.screenshot({path:`${out}/${name}-error.png`});console.error(await page.locator('body').innerText());throw error;}finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
