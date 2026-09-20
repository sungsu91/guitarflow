import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for (const width of [390,1366]) {
 const page=await browser.newPage({viewport:{width,height:width===390?844:768},isMobile:width===390,hasTouch:width===390});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('rifflabShooterMonsterSkin','backline-resonance'));
 await page.goto('http://127.0.0.1:5177/?debugHitbox=1#shooter');
 await page.getByText('스킨변경',{exact:true}).first().click();
 assert.deepEqual(await page.locator('.shooterSkinTabs button').allTextContents(),['기타','이펙트','펫','맵','피크']);
 await page.getByRole('button',{name:'스킨변경 창 닫기',exact:true}).click();
 await page.getByText('시작',{exact:true}).click();await page.waitForSelector('.shooterEnemy .noteVfxPitch');
 assert.equal(await page.locator('.shooterEnemyMonsterAsset').count(),0);
 await page.screenshot({path:`artifacts/note-vfx/default-neon-${width}.png`});
 await page.evaluate(()=>{window.sawBurst=false;new MutationObserver(()=>{if(document.querySelector('.noteVfxBurst'))window.sawBurst=true;}).observe(document.querySelector('.shooterArena'),{childList:true,subtree:true});});
 await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForFunction(()=>window.sawBurst);await page.waitForTimeout(650);
 assert.equal(await page.locator('.noteVfxBurst').count(),0);assert.deepEqual(errors,[]);
 console.log({width,defaultNeon:true,legacySkinIgnored:true,tabs:5,burst:true,errors});await page.close();
}}finally{await browser.close();}
