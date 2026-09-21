import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const width of [390,1440]){
 const p=await browser.newPage({viewport:{width,height:1000}});await p.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await p.evaluate(async w=>(await import('/scripts/tab-visibility-fixture.jsx')).mountSlideChain(w),width);
 for(const i of [0,1]){
  await p.locator(`[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-string="1"][data-event="${i}"]`).click({force:true});
  if(!await p.getByRole('button',{name:'슬라이드',exact:true}).isVisible())await p.getByRole('button',{name:'주법 도구 열기',exact:true}).click();
  await p.getByRole('button',{name:'슬라이드',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'슬라이드',exact:true}).getAttribute('aria-pressed'),'true');
 }
 assert.equal(await p.locator('[data-bar-index="0"] .vf-tabSlideLine path').count(),2);
 const popup=p.waitForEvent('popup');await p.getByRole('button',{name:'A4 인쇄 미리보기',exact:true}).click();const print=await popup;await print.waitForFunction(()=>document.body.dataset.previewReady==='true');
 assert.deepEqual(await print.locator('section').evaluateAll(es=>es.map(e=>e.children.length)),[4]);
 const lines=await print.locator('.vf-tabSlideLine path').evaluateAll(es=>es.map(e=>({d:e.getAttribute('d'),width:e.getAttribute('stroke-width')})));
 assert.equal(lines.length,2);console.log(width,lines);
 await print.locator('.a4Sheet').screenshot({path:`output/slide-chain-${width}.png`});await print.close();await p.close();
}}finally{await browser.close();}

