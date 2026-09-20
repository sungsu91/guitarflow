import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'msedge'});await mkdir('artifacts/shooter-progress',{recursive:true});const results=[];
try{for(const [difficulty,speed] of [['쉬움',1],['쉬움 랜덤',1],['보통',1],['보통 랜덤',1],['어려움',1],['어려움 랜덤',1],['어려움 랜덤',1.5]]){
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5177/?shooterNoteVfx=1&debugHitbox=1#shooter');await page.getByRole('button',{name:'슈팅게임 난이도',exact:true}).click();
const dialog=page.getByRole('dialog',{name:'난이도와 진행 속도'});await dialog.getByRole('button').filter({has:page.locator('strong',{hasText:new RegExp(`^${difficulty}$`)})}).click();
await dialog.getByRole('button',{name:new RegExp(`^${speed}×`)}).click();
assert.equal(await dialog.getByRole('button',{name:new RegExp(`^${speed}×`)}).getAttribute('aria-pressed'),'true');
if(difficulty==='어려움 랜덤'&&speed===1)await page.screenshot({path:'artifacts/shooter-progress/settings-390.png'});
const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);
await dialog.getByRole('button',{name:'설정 완료'}).click();await page.getByText('시작',{exact:true}).click();await page.waitForSelector('.shooterEnemy:not(.defeated)',{timeout:25000});
const duration=await page.locator('.shooterEnemy').first().evaluate(el=>parseFloat(el.style.getPropertyValue('--target-duration-ms')));
const offsets=await page.evaluate(()=>new Promise(resolve=>{const samples=[];function tick(){const marker=document.querySelector('.shooterAttachedHitbox');const note=document.querySelector('.shooterEnemy .noteVfxRing circle');if(marker&&note){const a=marker.getBoundingClientRect(),b=note.getBoundingClientRect();samples.push({x:Math.abs(a.x+a.width/2-b.x-b.width/2),y:Math.abs(a.y+a.height/2-b.y-b.height/2)});}if(samples.length>=12)resolve(samples);else requestAnimationFrame(tick);}requestAnimationFrame(tick)}));
assert.ok(offsets.every(p=>p.x<.2&&p.y<.2),JSON.stringify(offsets));
await page.evaluate(()=>{window.impactTime=0;window.nextTime=0;const initial=document.querySelector('.shooterEnemy');const ob=new MutationObserver(()=>{if(!window.impactTime&&initial.classList.contains('defeated'))window.impactTime=performance.now();if(window.impactTime&&[...document.querySelectorAll('.shooterEnemy:not(.defeated)')].some(e=>e!==initial)){window.nextTime=performance.now();ob.disconnect();}});ob.observe(document.querySelector('.shooterArena'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});});
await page.getByRole('button',{name:'TEST SHOT',exact:true}).click();await page.waitForFunction(()=>window.nextTime>0,{},{timeout:12000});
const gap=await page.evaluate(()=>window.nextTime-window.impactTime);assert.deepEqual(errors,[]);results.push({difficulty,speed,duration,gap,maxOffset:Math.max(...offsets.map(p=>Math.max(p.x,p.y)))});console.log(results.at(-1));await page.close();
}
for(const r of results.filter(r=>r.speed===1))assert.equal(r.duration,results[0].duration);
assert.equal(results.at(-1).duration,results[0].duration/1.5);await writeFile('artifacts/shooter-progress/results.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
