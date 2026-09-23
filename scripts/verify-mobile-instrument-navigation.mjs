import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const instrument of ['drums','piano'])for(const [width,height] of [[390,844],[375,667]]){
const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'악보 만들기',exact:true}).click();await page.getByLabel('악기 선택',{exact:true}).selectOption(instrument);await page.locator('.mobileInstrumentNavigation').waitFor();
await page.getByRole('button',{name:'마디 추가',exact:true}).click();assert.match(await page.locator('.mobileInstrumentNavigation output').textContent(),/2마디/);await page.getByRole('button',{name:'이전 마디',exact:true}).click();assert.match(await page.locator('.mobileInstrumentNavigation output').textContent(),/1마디/);await page.getByRole('button',{name:'다음 마디',exact:true}).click();assert.match(await page.locator('.mobileInstrumentNavigation output').textContent(),/2마디/);await page.getByRole('button',{name:'마디 삭제',exact:true}).click();
await page.getByRole('button',{name:'다음 입력 위치',exact:true}).click();await page.getByRole('button',{name:'이전 입력 위치',exact:true}).click();
const cursorY=()=>page.locator('.etudeInputCursor').first().getAttribute('y');const before=await cursorY();await page.getByRole('button',{name:'위 입력 위치',exact:true}).click();const up=await cursorY();assert.notEqual(up,before);await page.getByRole('button',{name:'아래 입력 위치',exact:true}).click();assert.notEqual(await cursorY(),up);
await page.screenshot({path:`artifacts/${instrument}-navigation-${width}.png`});assert.ok(await page.locator('.mobileScoreWorkspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.deepEqual(errors,[]);console.log(instrument,width,'passed');await page.close();
}}finally{await browser.close();}
