import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/editor-tool-row',{recursive:true});const results=[];
try{const p=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const row=p.locator('.mobileScoreInput .mobileInputExtras');
 for(const width of [360,375,390,393,430]){
  await p.setViewportSize({width,height:667});await row.scrollIntoViewIfNeeded();
  const sizes=await row.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,buttons:[...el.children].map(b=>{const r=b.getBoundingClientRect(),span=b.querySelector('span').getBoundingClientRect(),icon=b.querySelector('svg').getBoundingClientRect();return {label:b.textContent,width:r.width,height:r.height,y:r.y,left:r.left,right:r.right,contentLeft:Math.min(span.left,icon.left),contentRight:Math.max(span.right,icon.right)};})}));
  assert.equal(sizes.buttons.length,6);assert(sizes.scroll<=sizes.width);assert(sizes.buttons.every(b=>b.height>=34&&Math.abs(b.y-sizes.buttons[0].y)<1&&b.left>=0&&b.right<=width&&b.contentLeft>=b.left&&b.contentRight<=b.right),JSON.stringify(sizes));
  await row.screenshot({path:`artifacts/editor-tool-row/${width}.png`});results.push({width,...sizes});
 }
 await p.setViewportSize({width:375,height:667});
 const paper=p.locator('.etudeEditorCanvas'),pads=p.locator('.mobileScoreInput .mobileCursorPad');
 const paperBox=await paper.boundingBox(),rowBox=await row.boundingBox(),padsBox=await pads.boundingBox();
 assert(rowBox.y>=paperBox.y+paperBox.height&&rowBox.y-paperBox.y-paperBox.height<15);assert(padsBox.y>=rowBox.y+rowBox.height);
 assert.equal(await p.locator('.mobileScoreInput').evaluate(el=>el.firstElementChild.className),'mobileToolDock');
 await p.screenshot({path:'artifacts/editor-tool-row/375-below-score.png'});
 for(const kind of ['picking','note','beam','repeat']){
  const toggle=row.locator(`[data-mobile-tool-toggle="${kind}"]`);await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  const pop=p.locator('.mobileScoreInput .mobileDockPopover,.mobileScoreInput .mobileScoreSmallSheet.is-anchored');await pop.waitFor();
  // Wait for the short entry transition before checking visual bounds.
  await p.waitForTimeout(180);
  const box=await pop.boundingBox(),audioBox=await p.locator('.editorAudioDock').boundingBox();assert(box.y>=rowBox.y+rowBox.height);assert(box.y+box.height<=audioBox.y,JSON.stringify({kind,box,audioBox}));
  await paper.locator('.etudeEditorHit[data-event="0"][data-mode="tab"][data-string="4"]').first().click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await p.screenshot({path:`artifacts/editor-tool-row/375-${kind}-below.png`});
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 }
 await row.getByRole('button',{name:'마디 추가',exact:true}).click();await row.getByRole('button',{name:'마디 삭제',exact:true}).click();
 const desktopPage=await browser.newPage({viewport:{width:1440,height:1000}});await desktopPage.goto('http://127.0.0.1:5173/#etudes');await desktopPage.getByRole('button',{name:/악보 만들기/}).click();await desktopPage.locator('.desktopScoreInput').waitFor();
 assert.equal(await desktopPage.locator('.desktopScoreInput').evaluate(el=>el.firstElementChild.className),'mobileCursorPad');
 await desktopPage.locator('.desktopScoreInput [data-mobile-tool-toggle="repeat"]').click();await desktopPage.getByRole('region',{name:'반복 도구',exact:true}).waitFor();
 await desktopPage.screenshot({path:'artifacts/editor-tool-row/1440-panel.png'});
}finally{await browser.close();await writeFile('artifacts/editor-tool-row/results.json',JSON.stringify(results,null,2));}
console.log(results.map(r=>({width:r.width,noOverflow:r.scroll<=r.width,buttons:r.buttons.length})));
