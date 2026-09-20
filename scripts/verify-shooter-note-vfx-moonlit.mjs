import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try { for(const width of [390,1366]) {
 const page=await browser.newPage({viewport:{width,height:width===390?844:768},isMobile:width===390,hasTouch:width===390});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5177/?shooterNoteVfx=1&debugHitbox=1#shooter');
 await page.getByText('시작',{exact:true}).click();await page.waitForSelector('.shooterEnemy .noteVfxPitch');await page.waitForTimeout(1300);
 assert.ok(await page.locator('.shooterArena img[src*="moonlit-rooftop"]').count()>0);
 const ko=await page.locator('.shooterEnemy .noteVfxPitch').first().textContent();assert.match(ko,/[도레미파솔라시]/);
 const ringRatio=await page.locator('.shooterEnemy .noteVfxArt').first().evaluate(svg=>svg.querySelector('.noteVfxRing circle').getBoundingClientRect().width/svg.getBoundingClientRect().width);
 assert.ok(Math.abs(ringRatio-.28)<.005, `Half-size ring ratio: ${ringRatio}`);
 await page.screenshot({path:`artifacts/note-vfx/moonlit-ko-${width}.png`,style:'.shooterHitboxDebugOverlay,.shooterHitboxDebugToolbar{visibility:hidden}'});
 const toggle=page.getByRole('button',{name:/도레미파솔라시도 표시/});
 if(await toggle.isVisible()) {await toggle.click();assert.match(await page.locator('.shooterEnemy .noteVfxPitch').first().textContent(),/^[A-G]/);await toggle.click();}
 await page.evaluate(()=>{window.burstLabel=null;const observer=new MutationObserver(()=>{const label=document.querySelector('.noteVfxBurst .noteVfxPitch');if(label){window.burstLabel=label.textContent;observer.disconnect();}});observer.observe(document.querySelector('.shooterArena'),{subtree:true,childList:true});});
 await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForFunction(()=>window.burstLabel);
 assert.match(await page.evaluate(()=>window.burstLabel),/[도레미파솔라시]/);
 await page.waitForTimeout(650);assert.equal(await page.locator('.noteVfxBurst').count(),0);assert.deepEqual(errors,[]);
 console.log({width,ko,map:'moonlit-rooftop',errors});await page.close();
}}finally{await browser.close();}
