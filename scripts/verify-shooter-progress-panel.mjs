import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [320,390,1366]){const page=await browser.newPage({viewport:{width,height:width===1366?768:844},isMobile:width<700,hasTouch:width<700});await page.goto('http://127.0.0.1:5177/?shooterNoteVfx=1&debugHitbox=1#shooter');
await page.getByRole('button',{name:'슈팅게임 난이도',exact:true}).click();const dialog=page.getByRole('dialog',{name:'난이도와 진행 속도'});await dialog.waitFor();
await page.screenshot({path:`artifacts/shooter-progress/settings-${width}.png`});
const geometry=await dialog.locator('button').evaluateAll(buttons=>buttons.map(b=>({text:b.textContent,width:b.clientWidth,scroll:b.scrollWidth})));assert.ok(geometry.every(b=>b.scroll<=b.width+1),JSON.stringify(geometry));
await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'설정 완료');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'설정 닫기');
await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'슈팅게임 난이도');console.log({width,buttons:geometry.length,clipping:false,keyboard:true});await page.close();}}finally{await browser.close();}
