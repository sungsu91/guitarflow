import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const [width,height] of [[390,844],[375,667],[1440,900]]){
const mobile=width<600,page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'악보 만들기',exact:true}).click();await page.getByLabel('악기 선택',{exact:true}).selectOption('drums');await page.locator('.drumKit').waitFor();
if(mobile){
await page.getByRole('button',{name:'마디 추가',exact:true}).click();assert.ok(await page.getByRole('button',{name:'마디 삭제',exact:true}).isEnabled());await page.getByRole('button',{name:'마디 삭제',exact:true}).click();assert.ok(await page.getByRole('button',{name:'마디 삭제',exact:true}).isDisabled());
await page.getByLabel('드럼 사운드 설정',{exact:true}).click();await page.getByLabel('드럼 음량',{exact:true}).fill('0.35');assert.equal(await page.getByLabel('드럼 음량',{exact:true}).inputValue(),'0.35');await page.getByLabel('입력 소리',{exact:true}).uncheck();await page.getByLabel('드럼 음량',{exact:true}).press('Escape');assert.equal(await page.locator('.editorDrumAudio').getAttribute('open'),null);
await page.getByRole('button',{name:'킥',exact:true}).click();
const box=await page.locator('.etudeEditorCanvas').boundingBox();console.log(width,height,'score canvas',box);assert.ok(box.height>(height<700?180:270));assert.equal(await page.locator('.drumVolume').count(),0);
assert.ok(await page.locator('.mobileDrumWorkspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
await page.screenshot({path:`artifacts/drum-mobile-${width}.png`});
}else{assert.equal(await page.locator('.drumVolume').count(),1);assert.equal(await page.locator('.mobileDrumBarActions').count(),0);}
assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close();}


