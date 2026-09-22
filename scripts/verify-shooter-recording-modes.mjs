import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
await mkdir("artifacts/shooter-recording-modes",{recursive:true});
try {
for (const mobile of [true,false]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,permissions:['camera','microphone']});
const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.cameraRequests=0; const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=c=>{if(c.video)window.cameraRequests++;return get(c);};});
await page.goto('http://127.0.0.1:5174/#shooter');
const entry=page.getByRole('button',{name:'촬영모드',exact:true});await entry.waitFor({timeout:60000});
await entry.click();const dialog=page.getByRole('dialog',{name:'촬영모드 선택'});await dialog.waitFor();assert.equal(await page.evaluate(()=>window.cameraRequests),0);
await dialog.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await page.evaluate(()=>window.cameraRequests),0);
for(const mode of ['full','split']) {
await entry.click(); await dialog.getByRole('button',{name:mode==='full'?'전체':'분할',exact:false}).click();
await page.waitForFunction(mode=>document.querySelector('.shooterArena')?.dataset.recordingLayout===mode,mode);
await page.getByRole('button',{name:'● REC',exact:true}).waitFor({timeout:30000});
assert.equal(await page.locator('.shooterRecordingMapCamera').count(),mode==='full'?1:0);
if(mode==='full') {assert.equal(await page.locator('.shooterArena .shootingMapRenderer,.shooterArena .mapSkinRenderer').count(),0); assert.equal(await page.locator('.shooterPanel').evaluate(n=>n.style.scale || '1'),'1');}
if(mode==='full') {
  await page.getByRole('button',{name:'슈팅게임 시작',exact:true}).click();
  await page.locator('.shooterArena .fallingTarget').first().waitFor({timeout:20000});
  const aboveCamera = await page.locator('.shooterArena .fallingTarget').first().evaluate(n=>Number(getComputedStyle(n).zIndex)>Number(getComputedStyle(document.querySelector('.shooterRecordingMapCamera')).zIndex));
  assert.equal(aboveCamera,true);
}
await page.screenshot({path:`artifacts/shooter-recording-modes/${mobile?'mobile':'desktop'}-${mode}.png`});
await page.getByRole('button',{name:'● REC',exact:true}).click();await page.getByRole('button',{name:'녹화 중지',exact:true}).waitFor({timeout:30000});await page.waitForTimeout(1300);await page.getByRole('button',{name:'녹화 중지',exact:true}).click();await page.getByRole('dialog',{name:'촬영 결과 확인'}).waitFor({timeout:20000});
await page.waitForFunction(()=>document.querySelector('.shooterRecordingReview video')?.videoWidth>0);
await page.getByRole('dialog',{name:'촬영 결과 확인'}).getByRole('button',{name:'촬영모드 종료',exact:true}).click();
await page.waitForFunction(()=>!document.querySelector('.shooterArena')?.dataset.recordingLayout);
}
assert.deepEqual(errors,[]);console.log(mobile?'mobile passed':'desktop passed');await context.close();
}
} finally { await browser.close(); }


