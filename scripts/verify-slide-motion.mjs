import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.evaluate(async width=>{const {mount}=await import('/scripts/rhythm-progress-fixture.jsx');mount(width);},width);
 await page.locator('.savedScorePlayhead').waitFor({state:'attached'});
 assert.equal(await page.locator('.rhythmSlideMotion').count(),0);
 const samples=await page.evaluate(async()=>{
  const result=[];const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  for(const tick of [2400,2460,2520,2580,2639,2640,2880,960]) {
   rhythmTest.setTick(tick);await frame();
   const host=document.querySelector('.vf-fretiva-tab-view[data-slide-motion]'),motion=host.querySelector('.rhythmSlideMotion'),trail=motion?.querySelector('line');
   result.push({tick,visible:Boolean(motion),progress:Number(motion?.dataset.progress),x:Number(trail?.getAttribute('x2')),y:Number(trail?.getAttribute('y2')),geometry:JSON.parse(host.dataset.slideMotion)});
  }return result;
 });
 for(const s of samples.slice(0,5)) {assert.equal(s.visible,true);assert.equal(s.progress,(s.tick-2400)/240);assert.ok(Math.abs(s.x-(s.geometry.x1+(s.geometry.x2-s.geometry.x1)*s.progress))<1e-6);}
 assert.ok(samples[0].y>samples[4].y);for(const s of samples.slice(5))assert.equal(s.visible,false);
 for(const view of ['staff','both','tab']) {
  await page.evaluate(view=>{rhythmTest.setView(view);rhythmTest.setTick(2520);rhythmTest.setZoom(1.2);},view);
  await page.waitForFunction(()=>[...document.querySelectorAll('.rhythmSlideMotion')].some(n=>n.dataset.progress==='0.5'));
  const count=await page.locator('.rhythmSlideMotion').count();assert.equal(count,view==='both'?2:1);
 }
 const before=await page.locator('.vf-fretiva-tab-view .rhythmSlideMotion line').getAttribute('x2');await page.waitForTimeout(100);assert.equal(await page.locator('.vf-fretiva-tab-view .rhythmSlideMotion line').getAttribute('x2'),before);
 assert.equal(await page.locator('.rhythmSlideMotion circle').count(),0);
 await page.screenshot({path:`output/slide-motion-${width}.png`});
 for(const mode of ['line','off']) {await page.evaluate(mode=>rhythmTest.setFollow(mode),mode);await page.waitForFunction(()=>document.querySelectorAll('.rhythmSlideMotion').length===0);}
 assert.deepEqual(errors,[]);console.log(width,'continuous slide, exact arrival, rests, views, zoom, stationary clock, mode switching passed');await page.close();
}}finally {await browser.close();}
