import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium,webkit}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
await mkdir('artifacts/print-preview',{recursive:true});
for(const [name,type,options] of [['chrome',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
 const browser=await type.launch({headless:true,...options});
 try{for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});
  await page.goto('http://127.0.0.1:5177/#etudes');await page.getByRole('button',{name:/악보 만들기/}).click();await page.locator('[data-draw-count]').first().waitFor();
  const fixture=await page.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();d.title='A4 악보 미리보기';d.measures=Array.from({length:20},()=>m.blankMeasure());for(let bar=0;bar<20;bar++)for(let event=0;event<4;event++)d=c.enterFretWithDuration(d,{bar,event,string:6},5,'4');d.viewSettings.measuresPerRow=2;return d;});
  await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'preview.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  const button=page.getByRole('button',{name:'A4 인쇄 미리보기',exact:true});
  assert.equal(await button.evaluate(el=>el.nextElementSibling.classList.contains('etudeEditorSave')),true);
  const box=await button.boundingBox();assert(box.x>=0&&box.x+box.width<=width);
  await page.screenshot({path:`artifacts/print-preview/${name}-${width}-editor.png`});
  const popup=page.waitForEvent('popup');await button.click();const preview=await popup;await preview.setViewportSize({width:width<600?width:1000,height:900});
  await preview.waitForFunction(()=>document.body.dataset.previewReady==='true');
  const count=await preview.locator('.a4Sheet').count();assert(count>1);assert.equal(await preview.locator('section svg').count(),20);assert.equal(await preview.locator('.etudeInputCursor,.etudePlayingSlot,.etudeEditorHit').count(),0);
  assert.equal(await preview.getByRole('heading',{name:fixture.title}).count(),1);
  const layout=await preview.locator('.a4Sheet').evaluateAll(papers=>papers.map(paper=>({ratio:paper.offsetWidth/paper.offsetHeight,overflow:[...paper.querySelectorAll('section')].some(row=>row.offsetTop+row.offsetHeight>paper.clientHeight-parseFloat(getComputedStyle(paper).paddingBottom)+1)})));
  assert(layout.every(p=>Math.abs(p.ratio-210/297)<.002&&!p.overflow));
  await preview.screenshot({path:`artifacts/print-preview/${name}-${width}-preview.png`,fullPage:true});
  await preview.evaluate(()=>{window.print=()=>{document.body.dataset.printCalled='true';};});await preview.getByRole('button',{name:'인쇄 · PDF로 저장',exact:true}).click();assert.equal(await preview.locator('body').getAttribute('data-print-called'),'true');
  await preview.emulateMedia({media:'print'});assert.equal(await preview.locator('.previewToolbar').isVisible(),false);assert.equal(await preview.locator('.a4Sheet').first().evaluate(el=>getComputedStyle(el).transform),'none');
  await preview.close();await page.close();console.log(`${name} ${width}: ${count} A4 pages, button order, page bounds, print action passed`);
 }}finally{await browser.close();}
}
