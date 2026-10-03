import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='artifacts/desktop-playback-follow';await mkdir(out,{recursive:true});
const document=JSON.parse(await readFile('artifacts/omr-source-layout/other-final/after.json','utf8'));
document.title='실제 재생 화면 이동 검사';document.bpm=240;
document.viewSettings={...document.viewSettings,notationView:'tab',measuresPerRow:4,systemBreaks:[]};
document.measures.push(...structuredClone(document.measures).map(m=>({...m,id:m.id+'-copy',events:m.events.map(e=>({...e,id:e.id+'-copy',notes:e.notes.map(n=>({...n,id:n.id+'-copy'}))}))})));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1920,height:912}}),errors=[],results={};
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
try{
 await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},document);
 await page.goto('http://localhost:5174/#etudes',{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('.desktopScorePage').first().waitFor();
 const geometry=await page.evaluate(()=>{
  const pages=[...document.querySelectorAll('.desktopScorePage')],a=pages[0].getBoundingClientRect(),b=pages[1].getBoundingClientRect(),widget=document.querySelector('.etudeSessionWidget');
  widget.style.cssText=`position:fixed!important;left:${b.left+20}px!important;top:780px!important;right:auto!important;bottom:auto!important;transform:none!important;width:500px!important`;
  return {last:+pages[0].dataset.lastBar,next:+pages[1].dataset.firstBar,sideBySide:Math.abs(a.top-b.top)<2};
 });assert.ok(geometry.sideBySide);
 const position=page.getByRole('combobox',{name:'악보 재생 마디',exact:true});
 await position.focus();await position.selectOption(String(geometry.last-2));await position.blur();
 await page.locator('.etudePracticeStart').click();
 // Sample the production audio-clock-driven cursor through the last row and
 // the next right-hand page, without manually invoking the follow hook.
 results.playback=await page.evaluate(async()=>{
  const viewport=document.querySelector('.etudeScoreViewport'),frames=[],start=performance.now();let previous=start;
  await new Promise(resolve=>{const tick=now=>{
   const line=document.querySelector('.savedScorePlayhead'),bar=document.querySelector('.practiceCurrentBar')?.textContent;
   frames.push({ms:Math.round(now-start),gap:now-previous,bar,page:line?.closest('.desktopScorePage')?.dataset.scorePage,x:line?.getAttribute('x1'),top:viewport.scrollTop});previous=now;
   if(now-start<6500)requestAnimationFrame(tick);else resolve();
  };requestAnimationFrame(tick);});return frames;
 });
 const frames=results.playback,visible=frames.filter(f=>f.page);
 assert.ok(new Set(visible.map(f=>f.x)).size>30,'playhead advances continuously');
 assert.ok(visible.some(f=>f.page==='1')&&visible.some(f=>f.page==='2'),'playback crosses from left to right page');
 assert.equal(Math.max(...visible.map(f=>f.top)),0,'actual playback never scrolls an already visible spread');
 await page.screenshot({path:`${out}/live-right-page.png`});
 // Manual wheel navigation must continue to suspend auto-follow until asked
 // to return to the current position.
 await page.locator('.etudeScoreViewport').hover({position:{x:600,y:400}});await page.mouse.wheel(0,400);
 await page.locator('.etudeReturnPosition').waitFor();
 results.manual=await page.evaluate(async()=>{
  await new Promise(r=>setTimeout(r,400));const v=document.querySelector('.etudeScoreViewport'),before=v.scrollTop;
  await new Promise(r=>setTimeout(r,800));return {before,after:v.scrollTop};
 });assert.ok(results.manual.before>0);assert.equal(results.manual.after,results.manual.before);
 await page.locator('.etudeReturnPosition').click();await page.locator('.etudeReturnPosition').waitFor({state:'detached'});
 results.resumed=await page.evaluate(()=>({top:document.querySelector('.etudeScoreViewport').scrollTop,line:document.querySelector('.savedScorePlayhead')?.getBoundingClientRect().toJSON(),viewport:document.querySelector('.etudeScoreViewport').getBoundingClientRect().toJSON()}));
 assert.ok(results.resumed.line.top>=results.resumed.viewport.top&&results.resumed.line.bottom<=results.resumed.viewport.bottom);
 await page.locator('.etudePracticeStart').click();
 const gaps=visible.map(f=>f.gap).sort((a,b)=>a-b);results.summary={sampleCount:visible.length,p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxScroll:Math.max(...visible.map(f=>f.top)),pages:[...new Set(visible.map(f=>f.page))],errors};
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results.summary));
}catch(error){await page.screenshot({path:`${out}/live-failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/live-results.json`,JSON.stringify(results,null,2));await browser.close();}
