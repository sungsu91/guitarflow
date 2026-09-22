import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.evaluate(async width=>{const {mount}=await import('/scripts/rhythm-progress-fixture.jsx');mount(width);},width);
 await page.locator('.savedScorePlayhead').waitFor({state:'attached'});
 for(const tick of [2460,2520,2580]){
 await page.evaluate(t=>rhythmTest.setTick(t),tick);await page.waitForTimeout(70);
 const result=await page.evaluate(()=>({active:[...document.querySelectorAll('.rhythm-technique-active')].map(n=>n.tagName),extras:document.querySelectorAll('.rhythmFingeringTouch,.rhythmSlideMotion').length,x:document.querySelector('.savedScorePlayhead').getAttribute('x1')}));
 assert.ok(result.active.length);assert.ok(result.active.every(tag=>tag==='text'));assert.equal(result.extras,0);console.log(width,tick,result);
 }
 await page.close();
}}finally{await browser.close();}
