import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Run against a dev server or a deployed build with a fresh, isolated library.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.QA_OUT??'artifacts/desktop-page-follow';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL??'msedge'});
const page=await browser.newPage({viewport:{width:1920,height:912}});
const errors=[],results={};
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(30000);
const initialize=()=>{
 localStorage.setItem('language','ko');
 localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'C-daylight-fingerstyle-sketch'}));
};
const geometry=()=>{
 const v=document.querySelector('.etudeScoreViewport');
 return {viewport:v.getBoundingClientRect().toJSON(),scrollTop:v.scrollTop,pages:[...document.querySelectorAll('.desktopScorePage')].map(p=>({first:+p.dataset.firstBar,last:+p.dataset.lastBar,page:p.dataset.scorePage,box:p.getBoundingClientRect().toJSON()}))};
};
const seek=async bar=>{
 const select=page.getByRole('combobox',{name:'악보 재생 마디',exact:true});
 await select.focus();await select.selectOption(String(bar));await select.blur();
 await page.waitForFunction(bar=>+document.querySelector('.savedScorePlayhead')?.dataset.bar===bar,bar);
};
const sample=ms=>page.evaluate(async duration=>{
 const frames=[],v=document.querySelector('.etudeScoreViewport');let start,previous;
 await new Promise(resolve=>{const tick=now=>{
  start??=now;previous??=now;
  const line=document.querySelector('.savedScorePlayhead'),paper=line?.closest('.desktopScorePage'),box=paper?.getBoundingClientRect(),view=v.getBoundingClientRect();
  frames.push({ms:now-start,gap:now-previous,bar:+line?.dataset.bar,page:paper?.dataset.scorePage,x:line?.getAttribute('x1'),top:v.scrollTop,whole:box?box.top>=view.top-1&&box.bottom<=view.bottom+1:false,cursors:document.querySelectorAll('.savedScorePlayhead[visibility="visible"]').length});
  previous=now;if(now-start<duration)requestAnimationFrame(tick);else resolve();
 };requestAnimationFrame(tick);});return frames;
},ms);
try{
 await page.addInitScript(initialize);
 await page.goto(process.env.APP_URL??'http://127.0.0.1:5188/#etudes',{waitUntil:'networkidle'});
 await page.locator('.desktopScorePage').first().waitFor();
 results.initial=await page.evaluate(geometry);
 const sheets=results.initial.pages;
 assert.equal(sheets.length,4);
 assert.ok(Math.abs(sheets[0].box.top-sheets[1].box.top)<1,'first spread is side by side');
 assert.ok(sheets[2].box.top>results.initial.viewport.bottom,'third page starts below viewport');
 if(await page.locator('.desktopDockCountIn').getAttribute('aria-pressed')==='true')await page.locator('.desktopDockCountIn').click();
 for(let i=0;i<15;i++)await page.locator('.desktopPracticeDock .metronomeHeroBpmJumpButton--up').click();
 assert.equal(await page.locator('.desktopPracticeDock .metronomeHeroBpmValue strong').textContent(),'240');
 await page.locator('.desktopDockPlay').click();
 await seek(sheets[0].last);
 results.sideBySide=await sample(1800);
 assert.ok(results.sideBySide.some(f=>f.page==='2'),'audio clock crosses to right page');
 assert.ok(results.sideBySide.every(f=>f.top<1&&f.whole),'visible spread remains still');
 await seek(sheets[1].last);
 results.lowerPage=await sample(8500);
 const lower=results.lowerPage.filter(f=>f.page==='3');
 assert.ok(new Set(lower.map(f=>f.bar)).size>=7,'playback advances through multiple rows');
 assert.ok(lower.every(f=>f.whole),'the complete lower page is visible from its first frame');
 assert.ok(Math.max(...lower.map(f=>f.top))-Math.min(...lower.map(f=>f.top))<=1,'no measure-by-measure scrolling');
 await page.screenshot({path:`${out}/lower-page.png`});
 await seek(sheets[2].last);
 results.lowerRight=await sample(1800);
 assert.ok(results.lowerRight.some(f=>f.page==='4'));
 assert.ok(results.lowerRight.every(f=>f.whole&&Math.abs(f.top-lower[0].top)<=1),'right page of lower spread stays still');
 await seek(sheets[2].first);
 await page.locator('.etudeScoreViewport').hover({position:{x:500,y:300}});await page.mouse.wheel(0,-250);
 await page.locator('.etudeReturnPosition').waitFor();
 await page.waitForTimeout(400);
 results.manual=await sample(1000);
 assert.ok(results.manual.every(f=>Math.abs(f.top-results.manual[0].top)<=1),'manual scrolling suspends follow');
 await page.locator('.etudeReturnPosition').click();
 await page.locator('.etudeReturnPosition').waitFor({state:'detached'});
 results.resumed=await sample(500);
 assert.ok(results.resumed.every(f=>f.whole),'return to position reveals the whole page');
 await seek(0);
 results.returned=await sample(500);
 assert.ok(results.returned.every(f=>f.page==='1'&&f.whole&&Math.abs(f.top-results.returned[0].top)<=1),'returning to an earlier page restores the whole spread');
 await page.locator('.desktopDockPlay').click();
 const frames=[...results.sideBySide,...results.lowerPage,...results.lowerRight];
 assert.ok(frames.every(f=>f.cursors===1),'one active playhead with no stale cursor');
 assert.ok(new Set(frames.map(f=>f.x)).size>100,'playhead keeps advancing');
 const gaps=frames.map(f=>f.gap).sort((a,b)=>a-b);
 results.summary={frames:frames.length,p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxFrameMs:Math.max(...gaps),lowerPageBars:[...new Set(lower.map(f=>f.bar+1))],lowerPageScroll:lower[0].top,errors};
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.addInitScript(initialize);await mobile.goto(process.env.APP_URL??'http://127.0.0.1:5188/#etudes',{waitUntil:'networkidle'});
 await mobile.locator('.mobileScorePage').first().waitFor();
 assert.equal(await mobile.locator('.desktopScorePage').count(),0,'mobile keeps its own score layout');
 await mobile.screenshot({path:`${out}/mobile.png`});await mobile.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results.summary,null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
