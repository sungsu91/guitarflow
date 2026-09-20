import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});const result=[];
try{for(const enabled of [false,true]){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(`http://127.0.0.1:5177/?debugHitbox=1&shooterNoteVfx=${+enabled}#shooter`);
 await page.getByText('시작',{exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.shooterEnemy:not(.defeated)').length>=1);
 await page.waitForTimeout(1200); await page.screenshot({path:`artifacts/note-vfx/${enabled?'neon':'legacy'}-play-390x844.png`,style:'.shooterHitboxDebugOverlay,.shooterHitboxDebugToolbar{visibility:hidden}'});
 await page.evaluate(()=>{window.samples=[];window.qaRun=true;const tick=t=>{window.samples.push({t,burst:document.querySelectorAll('.noteVfxBurst').length,live:[...document.querySelectorAll('.shooterEnemy:not(.defeated)')].map(el=>({id:el.getAttribute('aria-label'),position:el.style.transform})),pick:document.querySelector('.energyProjectile')?.style.cssText});if(window.qaRun)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 for(let i=0;i<5;i++){await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForTimeout(900);}
 await page.waitForTimeout(650);
 const samples=await page.evaluate(()=>{window.qaRun=false;return window.samples});const text=await page.locator('body').innerText();
 assert.match(text,/SCORE\s+500\s+COMBO\s+5/);
 assert.equal(await page.locator('.noteVfxBurst').count(),0);
 const gaps=samples.slice(1).map((s,i)=>s.t-samples[i].t).sort((a,b)=>a-b);
 const during=samples.filter(s=>s.burst>0);if(enabled)assert.ok(during.length>0);
 result.push({enabled,median:gaps[Math.floor(gaps.length*.5)],p95:gaps[Math.floor(gaps.length*.95)],frames:gaps.length,score:500,combo:5,samples});await page.close();
}
await writeFile('artifacts/note-vfx/repeated-hits.json',JSON.stringify(result,null,2));console.log(result.map(({samples,...r})=>r));
}finally{await browser.close();}

