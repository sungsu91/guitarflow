import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
await mkdir('artifacts/note-vfx',{recursive:true});
const results=[];
try{for(const enabled of [false,true]){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=123;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 await page.goto(`http://127.0.0.1:5177/?debugHitbox=1&shooterNoteVfx=${enabled?1:0}#shooter`);
 await page.getByText('시작',{exact:true}).click();
 await page.waitForSelector('.shooterEnemy:not(.defeated)',{timeout:20000});
 await page.screenshot({path:`artifacts/note-vfx/${enabled?'neon':'legacy'}-390x844.png`});
 const before=await page.locator('.shooterEnemy').first().evaluate(el=>({pitch:el.getAttribute('aria-label'),width:el.offsetWidth,height:el.offsetHeight,font:el.querySelector('.noteVfxPitch')?.getAttribute('font-size'),hurtbox:document.querySelector('.shooterHitboxDebugEnemy')?.innerHTML}));
 await page.evaluate(()=>{window.trace=[];window.t0=performance.now();const sample=()=>{const now=performance.now();window.trace.push({t:now-window.t0,burst:!!document.querySelector('.noteVfxBurst'),dead:!!document.querySelector('.shooterEnemy.defeated'),pick:document.querySelector('.energyProjectile')?.style.cssText,live:[...document.querySelectorAll('.shooterEnemy:not(.defeated)')].map(e=>e.style.transform),hud:document.querySelector('.mobileShooterHud')?.textContent});if(now-window.t0<1800)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();
 if(enabled){await page.waitForSelector('.noteVfxBurst',{timeout:10000});await page.screenshot({path:'artifacts/note-vfx/impact-390x844.png'});}
 await page.waitForTimeout(1850);
 const trace=await page.evaluate(()=>window.trace);
 assert.equal(await page.locator('.noteVfxBurst').count(),0);
 assert.deepEqual(errors,[]);
 const samples=trace.filter(t=>t.burst);const dead=trace.filter(t=>t.dead);
 if(enabled){assert.ok(samples.length>0);assert.ok(samples.at(-1).t-samples[0].t>300);}
 results.push({enabled,before,burstDuration:samples.length?samples.at(-1).t-samples[0].t:0,deadDuration:dead.length?dead.at(-1).t-dead[0].t:0,trace,body:(await page.locator('body').innerText()).slice(-1200)});
 await page.close();
}
assert.equal(results[0].before.width,results[1].before.width);assert.equal(results[0].before.height,results[1].before.height);
await writeFile('artifacts/note-vfx/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({trace,...r})=>r),null,2));
}finally{await browser.close();}

