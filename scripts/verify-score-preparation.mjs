import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/score-preparation';await mkdir(out,{recursive:true});
const phase=process.env.CHECK_PHASE??'before';
const doc=JSON.parse(await readFile('artifacts/omr-source-layout/other-final/after.json','utf8'));doc.bpm=180;
const other=structuredClone(doc);other.id+='-other';other.title+=' other';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:440,height:956}:{width:1920,height:912},isMobile:mobile,hasTouch:mobile}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({doc,other})=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{status:'draft',document:doc},[other.id]:{status:'draft',document:other}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:doc.id,pdfId:''}));},{doc,other});
 await page.goto('http://localhost:5174/#etudes',{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('.etudeNotation[aria-busy=false] svg').first().waitFor();
 await page.evaluate(()=>{
  window.preparationLog=[];window.preparationPhase='idle';const root=document.querySelector('.etudeNotation'),feedback=document.querySelector('.scoreRenderFeedback');
  new MutationObserver(entries=>{for(const e of entries){if(e.type==='childList'&&e.target===root)preparationLog.push({phase:preparationPhase,kind:'replace',ms:performance.now()});if(e.type==='attributes')preparationLog.push({phase:preparationPhase,kind:e.attributeName,old:e.oldValue,value:e.target.getAttribute(e.attributeName),visible:!feedback.hidden&&getComputedStyle(feedback).display!=='none',ms:performance.now()});}}).observe(root,{childList:true,attributes:true,attributeOldValue:true,attributeFilter:['aria-busy']});
  new MutationObserver(()=>preparationLog.push({phase:preparationPhase,kind:'feedback',visible:!feedback.hidden&&getComputedStyle(feedback).display!=='none',ms:performance.now()})).observe(feedback,{attributes:true,attributeFilter:['hidden']});
 });
 const wait=ms=>page.evaluate(ms=>new Promise(r=>setTimeout(r,ms)),ms);
 const mark=value=>page.evaluate(value=>{window.preparationPhase=value;},value);
 await wait(2000);
 await mark('simple-buttons');await page.locator('.etudeRemoteScoreSound').click();await page.locator('.etudeRemoteScoreSound').click();await page.locator('.etudeFavoriteToggle').first().click();await page.locator('.etudeFavoriteToggle').first().click();await wait(600);
 await mark('playback');await page.locator('.etudePracticeStart').click();await wait(3500);
 await mark('unchanged-focus');for(let i=0;i<3;i++){await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await wait(600);}
 const playingAfterFocus=await page.locator('.etudePracticeStart').getAttribute('aria-label');
 if(await page.locator('.etudePracticeStop').isEnabled())await page.locator('.etudePracticeStop').click();
 // Another tab updates a different score: current notation should stay intact.
 await mark('other-score-update');
 await page.evaluate(async id=>{const {createBrowserScoreLibrary}=await import('/src/etudes/browserScoreLibrary.js');const library=createBrowserScoreLibrary(),data=await library.load();const changed={...data.records[id].document,title:'다른 악보 이름 수정'};await library.save(changed);window.dispatchEvent(new Event('focus'));},other.id);await wait(750);
 // A real edit to the open score still needs to refresh on returning.
 await mark('current-score-update');
 await page.evaluate(async id=>{const {createBrowserScoreLibrary}=await import('/src/etudes/browserScoreLibrary.js');const library=createBrowserScoreLibrary(),data=await library.load();const changed=structuredClone(data.records[id].document);changed.measures[0].harmony='Am';await library.save(changed);window.dispatchEvent(new Event('focus'));},doc.id);await wait(1000);
 await mark('layout-first');
 if(mobile)await page.locator('.etudeInlineBarCount').getByRole('button',{name:'한 줄 3마디',exact:true}).click();else await page.getByRole('combobox',{name:'한 줄 마디 수',exact:true}).selectOption('3');await wait(700);
 if(mobile)await page.locator('.etudeInlineBarCount').getByRole('button',{name:'한 줄 4마디',exact:true}).click();else await page.getByRole('combobox',{name:'한 줄 마디 수',exact:true}).selectOption('4');await wait(700);
 await mark('cached-layout');
 if(mobile)await page.locator('.etudeInlineBarCount').getByRole('button',{name:'한 줄 3마디',exact:true}).click();else await page.getByRole('combobox',{name:'한 줄 마디 수',exact:true}).selectOption('3');await wait(700);
 await mark('final-idle');await wait(1500);
 const log=await page.evaluate(()=>preparationLog),summary={};
 for(const e of log){summary[e.phase]??={rebuilds:0,loadingShows:0};if(e.kind==='replace')summary[e.phase].rebuilds++;if(e.kind==='feedback'&&e.visible)summary[e.phase].loadingShows++;}
 results.push({mobile,summary,playingAfterFocus,errors,log});console.log(JSON.stringify({mobile,summary,playingAfterFocus,errors}));
 if(phase==='after'){
  for(const name of ['idle','simple-buttons','playback','unchanged-focus','other-score-update','final-idle'])assert.equal(summary[name]?.rebuilds??0,0,`${name} must reuse notation`);
  assert.match(playingAfterFocus,/일시 ?정지/,'returning to unchanged score must not stop playback');
  assert.ok(summary['current-score-update']?.rebuilds>0,'actual edits refresh');
  assert.equal(summary['cached-layout']?.loadingShows??0,0,'cached layout must not flash a loading badge');assert.deepEqual(errors,[]);
 }
 await page.close();
}}finally{await browser.close();await writeFile(`${out}/${phase}.json`,JSON.stringify(results,null,2));}
