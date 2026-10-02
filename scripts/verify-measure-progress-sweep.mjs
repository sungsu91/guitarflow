import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out='work/measure-progress-sweep';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
const profiles=[['desktop',1920,912,''],['tablet',820,1180,'iPad Safari'],['tablet-wide',1376,1032,'iPad Safari'],['phone',440,956,'iPhone Mobile Safari'],['phone-wide',844,390,'iPhone Mobile Safari']];
async function sample(page){return page.locator('.stage3ProgressionHeader .currentProgressionReadout').evaluate(root=>{
 const active=root.querySelector('[data-sweep-active]');
 return{state:root.dataset.sweepState,count:root.querySelectorAll('[data-sweep-active]').length,start:active?.dataset.measureStart,progress:active?Number(active.style.getPropertyValue('--chord-sweep-progress')):null};
});}
try{for(const [name,width,height,userAgent] of profiles.filter(p=>!process.env.PROFILES||process.env.PROFILES.split(',').includes(p[0]))){
 for(const theme of ['light','brand']){
 const page=await browser.newPage({viewport:{width,height},isMobile:!!userAgent,hasTouch:!!userAgent,...(userAgent?{userAgent}:{})});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(t=>localStorage.setItem('rifflabThemeMode',t),theme);
 await page.goto(process.env.AUDIT_URL||'http://127.0.0.1:5176/#stage3');await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'보이싱 이동 학습 코스',exact:true}).click();
 await page.getByRole('tab',{name:'코스 04',exact:true}).click();
 await page.getByRole('option').filter({hasText:'G키 바레 더블스텝'}).click();
 await page.locator('[data-sweep-active]').waitFor();
 const measure=page.locator('[data-measure-start="0"]');
 const geometry=await measure.evaluate(el=>{
  const overlay=el.querySelector(':scope > .stage3ChordSweep'),r=el.getBoundingClientRect(),o=overlay.getBoundingClientRect();
  const root=el.closest('.currentProgressionReadout');
  return{width:r.width,overlayWidth:o.width,children:el.querySelectorAll(':scope > button').length,overlays:el.querySelectorAll('.stage3ChordSweep').length,buttonOverlays:el.querySelectorAll('button .stage3ChordSweep').length,buttons:[...el.querySelectorAll('button')].map(b=>({background:getComputedStyle(b).backgroundColor,shadow:getComputedStyle(b).boxShadow})),fill:getComputedStyle(overlay.querySelector('.stage3ChordSweepFill')).backgroundColor,overflow:root.scrollWidth>root.clientWidth+1};
 });
 assert.equal(geometry.children,2);assert.equal(geometry.overlays,1);assert.equal(geometry.buttonOverlays,0);
 assert(geometry.overlayWidth>=geometry.width-5);assert.equal(geometry.overflow,false);
 for(const button of geometry.buttons){assert.equal(button.background,'rgba(0, 0, 0, 0)');assert.equal(button.shadow,'none');}
 assert.deepEqual(await sample(page),{state:'idle',count:1,start:'0',progress:0});
 // Selecting the back half seeks halfway through the same measure.
 await page.locator('[data-chord-start="2"]').click();
 assert.deepEqual(await sample(page),{state:'idle',count:1,start:'0',progress:.5});
 await page.locator('[data-chord-start="0"]').click();
 // Observe painted frames across the G -> D boundary and retain them in-page.
 await page.evaluate(()=>{
  window.measureFrames=[];window.observeMeasure=true;
  const tick=()=>{const root=document.querySelector('.stage3ProgressionHeader .currentProgressionReadout'),active=root?.querySelector('[data-sweep-active]');
   if(root?.dataset.sweepState==='playing'&&active)window.measureFrames.push({start:active.dataset.measureStart,progress:Number(active.style.getPropertyValue('--chord-sweep-progress'))});
   if(window.observeMeasure)requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
 });
 await page.getByRole('button',{name:'연습 시작',exact:true}).click();
 await page.waitForFunction(()=>{const e=document.querySelector('[data-sweep-active]');return e?.dataset.measureStart==='0'&&Number(e.style.getPropertyValue('--chord-sweep-progress'))>.56;});
 await page.locator('.metronomeHeroPauseButton').click();
 const paused=await sample(page);assert.equal(paused.start,'0');assert(paused.progress>.5&&paused.progress<1);
 await page.waitForTimeout(180);assert.deepEqual(await sample(page),paused);
 await page.evaluate(()=>{window.observeMeasure=false;window.scrollTo(0,0);});
 const frames=await page.evaluate(()=>window.measureFrames.filter(f=>f.start==='0'));
 assert(frames.some(f=>f.progress<.45));assert(frames.some(f=>f.progress>.55));
 for(let i=1;i<frames.length;i++)assert(frames[i].progress>=frames[i-1].progress-.002,JSON.stringify(frames.slice(Math.max(0,i-2),i+2)));
 await page.screenshot({path:`${out}/${name}-${theme}.png`});
 await page.locator('.metronomeHeroPauseButton').click();
 await page.waitForFunction(()=>document.querySelector('[data-sweep-active]')?.dataset.measureStart==='4');
 assert.equal((await sample(page)).count,1);
 await page.getByRole('button',{name:'연습 정지',exact:true}).click();
 assert.deepEqual(await sample(page),{state:'idle',count:1,start:'0',progress:0});
 assert.deepEqual(errors,[]);
 results.push({name,theme,geometry,paused,frameCount:frames.length,errors});
 fs.writeFileSync(`${out}/verification.json`,JSON.stringify(results,null,2));console.log('PASS',name,theme,'one continuous measure sweep');
 await page.close();
 }
}}finally{await browser.close();}
