import { chooseInstrument, countInstrumentOptions } from './instrument-dropdown-helpers.mjs';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {VIEWER_PROFILES,getInstrumentPosition} from '../src/fretboard/instruments.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const dir='work/learning-instruments';await mkdir(dir,{recursive:true});const reports=[];
for(const [name,width,height,userAgent] of [
 ['phone',390,844,'iPhone Mobile'],['small-phone',360,800,'iPhone Mobile'],['phone-landscape',844,390,'iPhone Mobile'],
 ['tablet',768,1024,'iPad Safari'],['tablet-split',507,1180,'iPad Safari'],['tablet-landscape',1280,800,'Android Tablet'],['desktop',1440,1000,''],
].filter(p=>!process.argv[2]||p[0]===process.argv[2])){
 const page=await browser.newPage({viewport:{width,height},...(userAgent?{userAgent,isMobile:true,hasTouch:true}:{})});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 for(const stage of ['stage1','stage2','stage3']){
  await page.goto(`${base}#${stage}`);const select=page.locator('.learningInstrumentControls:visible .instrumentDropdownTrigger');await select.waitFor();await page.locator('.launchSplash').waitFor({state:'hidden'});
  assert.equal(await countInstrumentOptions(page, select),7);
  if(stage==='stage3'){await page.getByRole('button',{name:'추천 진행 및 사용자 진행 선택',exact:true}).click();await page.getByRole('option',{name:'밝은 시작',exact:true}).click();}
  const board=page.locator(stage==='stage3'?'.stageChordSharedFretboard':'.trainingSharedFretboard');
  for(const profile of Object.values(VIEWER_PROFILES)){
   await chooseInstrument(page, select, profile.id);
   assert.equal(await select.getAttribute('data-value'),profile.id);
   await page.waitForFunction(({selector,count})=>document.querySelectorAll(`${selector} .fretboardStringRow`).length===count,{selector:stage==='stage3'?'.stageChordSharedFretboard':'.trainingSharedFretboard',count:profile.stringCount});
   const notes=await board.locator('[data-note-pitch]').evaluateAll(es=>es.map(e=>({stringNumber:Number(e.dataset.stringNumber),fretNumber:Number(e.dataset.fretNumber),pitch:e.dataset.notePitch})));
   assert.ok(notes.length,`${name} ${stage} ${profile.id} no notes`);
   for(const note of notes)assert.equal(note.pitch,getInstrumentPosition(profile.tuning,note.stringNumber,note.fretNumber)?.pitch,`${stage} ${profile.id}`);
  }
  await chooseInstrument(page, select, stage==='stage1'?'guitar-7':stage==='stage2'?'ukulele-high-g':'bass-5');
  await select.scrollIntoViewIfNeeded();
  const bounds=await select.boundingBox();assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1,`${name} ${stage} select overflow`);
  const boardBounds=await board.boundingBox();assert.ok(boardBounds.height>=120,`${name} ${stage} fretboard collapsed`);
  await page.screenshot({path:`${dir}/${name}-${stage}.png`});
  if(['phone','desktop','tablet'].includes(name)){
   await page.getByRole('button',{name:'연습 시작',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.learningInstrumentControls .instrumentDropdownTrigger')?.disabled===true);
   await page.getByRole('button',{name:'연습 정지',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.learningInstrumentControls .instrumentDropdownTrigger')?.disabled===false);
  }
 }
 assert.deepEqual(errors,[]);reports.push({name,pass:true});console.log('PASS',name);
 }catch(e){await page.screenshot({path:`${dir}/${name}-failure.png`});reports.push({name,pass:false,error:String(e),errors});console.log('FAIL',name,String(e),errors);}
 await page.close();
}
await browser.close();await writeFile(`${dir}/browser-report${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify(reports,null,2));if(reports.some(r=>!r.pass))process.exitCode=1;
