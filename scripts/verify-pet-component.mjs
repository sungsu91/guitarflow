import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {SHOOTER_SPRITE_PETS} from '../src/shooter/pets.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PET_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const output=process.env.PET_TEST_OUTPUT||`artifacts/shooter-sprite-pets/${engine}`;
const facing=process.env.PET_FACING||'right';
const playbackSpeed=Number(process.env.PET_SPEED||1);
await mkdir(output,{recursive:true});
const report={engine,pets:[],lifecycle:{}};
const origin=process.env.PET_TEST_URL||'http://127.0.0.1:5178';
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:3});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${origin}/tests/fixtures/shooter-sprite-pets.html`);
 await page.waitForFunction(()=>typeof window.petFixture==='function');
 for(const pet of SHOOTER_SPRITE_PETS) {
  await page.evaluate(({id,facing,playbackSpeed})=>window.petFixture({id,score:0,hits:0,combo:0,facing,playbackSpeed}),{id:pet.id,facing,playbackSpeed});
  await page.waitForFunction(id=>{const c=document.querySelector('canvas');return c?.dataset.petSkin===id&&c.dataset.loadState==='ready'&&c.dataset.action;},pet.id);
  await page.evaluate(async ({url,actions})=>{
   window.petTrace=[];window.petPixelFailures=[];
   const image=new Image();image.src=url;await image.decode();
   const live=document.querySelector('canvas'), fresh=document.createElement('canvas');fresh.width=live.width;fresh.height=live.height;
   // Match the live context's GPU/CPU policy so readback does not compare two resamplers.
   const ctx=fresh.getContext('2d',{alpha:true});
   const record=()=>{
    const name=live.dataset.action, frame=Number(live.dataset.frame), t=performance.now(),rect=live.getBoundingClientRect();
    window.petTrace.push({name,frame,t,x:rect.x,y:rect.y});
    ctx.clearRect(0,0,fresh.width,fresh.height);
    ctx.save();
    if(live.dataset.facing==='left'){ctx.translate(fresh.width,0);ctx.scale(-1,1);}
    ctx.drawImage(image,frame*256,actions[name].row*256,256,256,0,0,fresh.width,fresh.height);
    ctx.restore();
    const expected=ctx.getImageData(0,0,fresh.width,fresh.height).data, actual=live.getContext('2d').getImageData(0,0,live.width,live.height).data;
    let maxAlphaDelta=0,maxVisibleDelta=0,ghosts=0;
    for(let i=0;i<expected.length;i+=4){
      maxAlphaDelta=Math.max(maxAlphaDelta,Math.abs(expected[i+3]-actual[i+3]));
      if(expected[i+3]===0&&actual[i+3]>2)ghosts++;
      for(let j=0;j<3;j++)maxVisibleDelta=Math.max(maxVisibleDelta,Math.abs(expected[i+j]*expected[i+3]/255-actual[i+j]*actual[i+3]/255));
    }
    if(maxAlphaDelta>2||maxVisibleDelta>2||ghosts)window.petPixelFailures.push({name,frame,maxAlphaDelta,maxVisibleDelta,ghosts});
   };
   record();window.petTraceObserver=new MutationObserver(record);window.petTraceObserver.observe(live,{attributes:true,attributeFilter:['data-frame']});
  },{url:pet.sheetSrc,actions:pet.actions});
  const names=Object.keys(pet.actions);
  await page.waitForFunction(name=>new Set(window.petTrace.filter(s=>s.name===name).map(s=>s.frame)).size===8,names[0]);
  for(const [reaction,snapshot] of [[1,{score:100,hits:1,combo:1}],[2,{score:500,hits:5,combo:5}]]) {
   await page.evaluate(p=>window.petFixture(p),snapshot);
   await page.waitForFunction(name=>new Set(window.petTrace.filter(s=>s.name===name).map(s=>s.frame)).size===8,names[reaction]);
   await page.waitForFunction(name=>document.querySelector('canvas').dataset.action===name,names[0]);
  }
  const observed=await page.evaluate(()=>{window.petTraceObserver.disconnect();return {trace:window.petTrace,pixelFailures:window.petPixelFailures};});
  assert.deepEqual(observed.pixelFailures,[],`${pet.id}: transparent previous pose is fully cleared`);
  assert.equal(new Set(observed.trace.map(s=>`${s.x},${s.y}`)).size,1);
  await page.screenshot({path:`${output}/${pet.id}-component.png`,scale:'css'});
  report.pets.push({id:pet.id,...observed});
  console.log(`${engine} ${pet.id}: all 24 frames, events, pixels passed`);
 }
 const frame=()=>page.locator('canvas').getAttribute('data-frame');
 await page.evaluate(()=>window.petFixture({active:false}));
 await page.waitForTimeout(100);const paused=await frame();await page.waitForTimeout(600);assert.equal(await frame(),paused);
 await page.evaluate(()=>window.petFixture({active:true}));await page.waitForFunction(f=>document.querySelector('canvas').dataset.frame!==f,paused);
 report.lifecycle.pauseResume=true;
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await frame();await page.waitForTimeout(600);assert.equal(await frame(),hidden);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));});
 await page.waitForFunction(f=>document.querySelector('canvas').dataset.frame!==f,hidden);report.lifecycle.hiddenPageshow=true;
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const reduced=await frame();await page.waitForTimeout(600);assert.equal(await frame(),reduced);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(f=>document.querySelector('canvas').dataset.frame!==f,reduced);report.lifecycle.reducedMotion=true;
 await page.evaluate(()=>window.petFixture({id:'ferret_sable',score:0,hits:0,combo:0}));
 await page.evaluate(()=>window.petFixture({id:'poodle_apricot'}));
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.petSkin==='poodle_apricot'&&document.querySelector('canvas').dataset.loadState==='ready');report.lifecycle.rapidSwitch=true;
 // A fresh context avoids WebKit's already-decoded image cache bypassing route interception.
 const failurePage=await browser.newPage();
 await failurePage.route('**/pets/hamster_golden/atlas.png',route=>route.abort());
 await failurePage.goto(`${origin}/tests/fixtures/shooter-sprite-pets.html`);
 await failurePage.waitForFunction(()=>document.querySelector('canvas')?.dataset.loadState==='ready');
 await failurePage.evaluate(()=>window.petFixture({id:'hamster_golden'}));
 await failurePage.waitForFunction(()=>document.querySelector('canvas')?.dataset.loadState==='error');
 await failurePage.evaluate(()=>window.petFixture({id:'poodle_apricot'}));
 await failurePage.waitForFunction(()=>document.querySelector('canvas')?.dataset.loadState==='ready');
 await failurePage.close();report.lifecycle.loadFailureRecovery=true;
 assert.deepEqual(errors,[]);report.errors=errors;
} finally { await writeFile(`${output}/component-results.json`,JSON.stringify(report,null,2));await browser.close(); }
