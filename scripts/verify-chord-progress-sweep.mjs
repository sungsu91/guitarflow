import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='work/chord-progress-sweep';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
async function sample(page){return page.locator('.stage3ProgressionHeader .currentProgressionReadout').evaluate(root=>({
 state:root.dataset.sweepState,scroll:root.scrollLeft,
 active:[...root.querySelectorAll('[data-sweep-active]')].map(e=>({start:Number(e.dataset.measureStart),length:Number(e.dataset.measureLength),progress:Number(e.style.getPropertyValue('--chord-sweep-progress')),fill:getComputedStyle(e.querySelector('.stage3ChordSweepFill')).transform,opacity:getComputedStyle(e.querySelector('.stage3ChordSweep')).opacity,label:e.textContent})),
}));}
try{for(const [width,height,theme,userAgent] of [[1920,1080,'light'],[1440,900,'brand'],[820,1180,'light','iPad Safari'],[1376,1032,'brand','iPad Safari'],[390,844,'light','iPhone Mobile Safari'],[844,390,'brand','iPhone Mobile Safari']].filter(([width])=>!process.env.AUDIT_WIDTH||width===Number(process.env.AUDIT_WIDTH))){
 const page=await browser.newPage({viewport:{width,height},isMobile:!!userAgent,hasTouch:!!userAgent,...(userAgent?{userAgent}:{})});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(theme=>localStorage.setItem('rifflabThemeMode',theme),theme);
 await page.goto(process.env.AUDIT_URL??'http://127.0.0.1:5173/#stage3');await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'보이싱 이동 학습 코스',exact:true}).click();await page.getByRole('option').filter({hasText:'7th 순환 하이코드'}).click();
 await page.locator('[data-sweep-active]').waitFor();assert.equal((await sample(page)).active[0].progress,0);
 await page.getByRole('button',{name:'연습 시작',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('[data-sweep-active]')?.style.getPropertyValue('--chord-sweep-progress'))>.2);
 const early=await sample(page);await page.waitForTimeout(450);const later=await sample(page);
 assert.equal(early.active.length,1);assert.equal(later.active.length,1);assert(later.active[0].progress>early.active[0].progress);
 assert.equal(later.active[0].opacity,'1');assert.notEqual(early.active[0].fill,later.active[0].fill);
 await page.locator('.metronomeHeroPauseButton').click();
 const paused=await sample(page);await page.waitForTimeout(450);assert.deepEqual(await sample(page),paused);assert.equal(paused.state,'paused');
 await page.screenshot({path:`${out}/paused-${width}-${theme}.png`});
 await page.locator('.metronomeHeroPauseButton').click();await page.waitForTimeout(450);const resumed=await sample(page);assert.equal(resumed.state,'playing');
 const position=sample=>sample.active[0].start+sample.active[0].progress*sample.active[0].length;
 assert(position(resumed)>position(paused),JSON.stringify({paused,resumed}));
 // Capture the first painted seek frame in the browser: a busy render can delay
 // Playwright's click response until playback has already advanced considerably.
 const next=page.locator('[data-chord-start="4"]');
 await next.evaluate(e=>{window.seekProgress=null;e.addEventListener('click',()=>{let attempts=0;const capture=()=>{const active=document.querySelector('[data-sweep-active]');if(active?.dataset.measureStart==='4')window.seekProgress=Number(active.style.getPropertyValue('--chord-sweep-progress'));else if(attempts++<30)requestAnimationFrame(capture);};requestAnimationFrame(capture);},{once:true});});
 await next.click();await page.waitForFunction(()=>window.seekProgress!==null);const seek=await page.evaluate(()=>window.seekProgress);assert(seek<.15,String(seek));
 await page.waitForFunction(()=>document.querySelector('[data-sweep-active]')?.dataset.measureStart==='8',{},{timeout:10000});
 assert.equal((await sample(page)).active.length,1);
 // Measures wrap after four, and following playback must never pan sideways.
 const layout=await page.locator('.stage3ProgressionHeader .currentProgressionReadout').evaluate(root=>{const rows=[...root.children].map(e=>e.getBoundingClientRect());return{first:rows[0].top,fourth:rows[3].top,fifth:rows[4].top,overflow:root.scrollWidth>root.clientWidth+1,left:root.scrollLeft};});
 assert.equal(layout.first,layout.fourth);assert(layout.fifth>layout.first);assert.equal(layout.overflow,false);assert.equal(layout.left,0);
 const fifth=page.locator('[data-chord-start="16"]');await fifth.click();await page.waitForFunction(()=>document.querySelector('[data-sweep-active]')?.dataset.measureStart==='16');
 const visible=await fifth.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.currentProgressionReadout').getBoundingClientRect();return a.left>=b.left-2&&a.right<=b.right+2;});assert(visible);
 await page.getByRole('button',{name:'연습 정지',exact:true}).click();const stopped=await sample(page);assert.equal(stopped.state,'idle');assert.equal(stopped.active[0].progress,0);
 // Count-in does not consume any of the first chord's highlighted duration.
 await page.getByRole('button',{name:'카운트인 켜기',exact:true}).click();await page.getByRole('button',{name:'연습 시작',exact:true}).click();await page.waitForTimeout(350);
 const countIn=await sample(page);assert.equal(countIn.state,'count-in');assert.equal(countIn.active.length,0);
 await page.waitForFunction(()=>document.querySelector('.currentProgressionReadout')?.dataset.sweepState==='playing',{},{timeout:10000});
 await page.waitForTimeout(1100);await page.screenshot({path:`${out}/playing-${width}-${theme}.png`});
 assert.deepEqual(errors,[]);results.push({width,height,theme,early:early.active[0].progress,later:later.active[0].progress,pause:paused.active[0].progress,seek,errors});
 console.log('PASS',width,height,theme);await page.close();
}fs.writeFileSync(`${out}/verification.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
