import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();const panel=page.locator('.etudeRemote--mobileBottom');await panel.waitFor();
assert.equal(await page.locator('.etudeMobileRemoteGrip').count(),0);
const before=await panel.boundingBox(),grip=await panel.locator('.etudeRemoteBpm').boundingBox();
const cdp=await page.context().newCDPSession(page);const x=grip.x+grip.width/2,y=grip.y+grip.height/2;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*25}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const after=await panel.boundingBox();assert.ok(Math.abs(after.y-before.y+200)<2);assert.equal(after.height,before.height);
await panel.locator('.etudeRemoteBeats').focus();await page.keyboard.press('ArrowUp');assert.ok(Math.abs((await panel.boundingBox()).y-after.y+16)<2);
await page.reload();await page.getByRole('tab',{name:'에튀드',exact:true}).click();await panel.waitFor();assert.ok(Math.abs((await panel.boundingBox()).y-after.y+16)<2);
await page.getByRole('button',{name:'백킹루프',exact:true}).click();
const backing=page.locator('.etudeBackingDrawer'),start=await backing.boundingBox();
const play=backing.locator('button').filter({has:page.locator('svg.lucide-play')}).first();
const point=await play.boundingBox();assert.ok(point);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x+point.width/2,y:point.y+point.height/2}]});
for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+point.width/2,y:point.y+point.height/2-80*i/8}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok(Math.abs((await backing.boundingBox()).y-start.y)>20,'backing moves from playback button');
await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();await page.getByRole('dialog',{name:'메트로놈 설정',exact:true}).waitFor();assert.deepEqual(errors,[]);console.log('touch drag, unchanged height, keyboard, persistence and settings passed');await page.screenshot({path:'artifacts/mobile-bpm-drag.png'});
}finally{await browser.close();}

