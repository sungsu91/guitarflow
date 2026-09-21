import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.evaluate(async w=>(await import('/scripts/tab-visibility-fixture.jsx')).mount(w,true),width);
  await page.getByRole('button',{name:'한 줄 4마디',exact:true}).click();
  const popup=page.waitForEvent('popup');
  await page.getByRole('button',{name:'A4 인쇄 미리보기',exact:true}).click();
  const preview=await popup;
  await preview.waitForFunction(()=>document.body.dataset.previewReady==='true');
  assert.deepEqual(await preview.locator('section').evaluateAll(es=>es.map(e=>e.children.length)),[4,2]);
  await preview.emulateMedia({media:'print'});
  assert.deepEqual(await preview.locator('section').evaluateAll(es=>es.map(e=>e.children.length)),[4,2]);
  assert.equal(await preview.locator('section svg').count(),6);
  await preview.locator('.a4Sheet').first().screenshot({path:`output/fixed-four-bars-${width}.png`});
  await preview.close();
  await page.getByRole('button',{name:width<600?'악보 편집 뒤로':'닫기',exact:true}).click();
  const contrast=await page.locator('.etudeEditorClosePrompt').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,ink:getComputedStyle(e.querySelector('p')).color,fill:getComputedStyle(e.querySelector('p')).webkitTextFillColor}));
  assert.notEqual(contrast.bg,contrast.ink);
  assert.equal(contrast.ink,contrast.fill);
  console.log('PASS',width,'4+2 bars preserved in preview/print; close prompt',contrast);
  await page.close();
 }
} finally {await browser.close();}
