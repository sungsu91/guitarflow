import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[];
try{for(const [difficulty,limit] of [['쉬움',2],['쉬움 랜덤',2],['보통',3],['보통 랜덤',3],['어려움',4],['어려움 랜덤',4]]){
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5177/?shooterNoteVfx=1&debugHitbox=1#shooter');await page.getByRole('button',{name:'슈팅게임 난이도',exact:true}).click();const dialog=page.getByRole('dialog');
await dialog.getByRole('button').filter({has:page.locator('strong',{hasText:new RegExp(`^${difficulty}$`)})}).click();await dialog.getByRole('button',{name:'설정 완료'}).click();await page.getByText('시작',{exact:true}).click();
await page.waitForFunction(limit=>document.querySelectorAll('.shooterEnemy:not(.defeated)').length>=limit,limit,{timeout:45000});
const before=await page.locator('.shooterEnemy:not(.defeated)').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),y:n.getBoundingClientRect().y})));
assert.equal(before.length,limit);await page.screenshot({path:`artifacts/shooter-progress/stream-${limit}-${difficulty.includes('랜덤')?'random':'course'}.png`,style:'.shooterHitboxDebugOverlay,.shooterHitboxDebugToolbar,.shooterAttachedHitbox{visibility:hidden}'});
await page.evaluate(()=>{window.otherTarget=[...document.querySelectorAll('.shooterEnemy:not(.defeated)')].at(-1);window.otherStart=window.otherTarget.getBoundingClientRect().y;window.otherSurvived=false;window.scoreAtHit=null;const ob=new MutationObserver(()=>{if(document.querySelector('.shooterEnemy.defeated')){window.otherSurvived=window.otherTarget.isConnected&&!window.otherTarget.classList.contains('defeated');window.scoreAtHit=document.body.innerText;ob.disconnect();}});ob.observe(document.querySelector('.shooterArena'),{childList:true,attributes:true,subtree:true,attributeFilter:['class']});});
await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForFunction(()=>window.scoreAtHit,{},{timeout:10000});assert.ok(await page.evaluate(()=>window.otherSurvived));
await page.waitForTimeout(150);const moved=await page.evaluate(()=>window.otherTarget.getBoundingClientRect().y>window.otherStart);assert.ok(moved);await page.waitForFunction(()=>/SCORE\s+100\s+COMBO\s+1/.test(document.body.innerText));assert.deepEqual(errors,[]);results.push({difficulty,limit,before,otherSurvived:true,otherKeptMoving:moved,score:100,combo:1});console.log({difficulty,limit,passed:true});await page.close();
}await writeFile('artifacts/shooter-progress/stream-results.json',JSON.stringify(results,null,2));}finally{await browser.close();}


