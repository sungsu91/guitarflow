import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='work/mobile-score-pages';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];let page;
const ready=()=>page.waitForFunction(()=>document.querySelector('.etudeNotation[aria-busy="false"] [data-playback-bar="39"]'));
const number=()=>page.locator('.mobileScorePageNav output').innerText();
const waitPage=n=>page.waitForFunction(n=>document.querySelector('.mobileScorePageStack')?.dataset.visiblePage===String(n),n);
async function geometry(){return page.evaluate(()=>{
 const viewport=document.querySelector('.etudeScoreViewport');
 return {width:innerWidth,body:document.documentElement.scrollWidth,overflow:viewport.scrollWidth-viewport.clientWidth,
 pages:[...document.querySelectorAll('article.mobileScorePage,article.desktopScorePage')].map(p=>{
  const svg=p.querySelector('svg'),box=svg.getBoundingClientRect(),groups=[...svg.querySelectorAll('[data-playback-bar]')],rows={};
  groups.forEach(g=>(rows[g.dataset.row]??=[]).push(Number(g.dataset.playbackBar)));
  const clipped=[...svg.children].filter(n=>n.matches('[data-section-label],[data-score-annotation],.vf-stave,.vf-stavenote,.vf-tabnote')).filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&(r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2);}).map(n=>n.getAttribute('class')??n.tagName);
  return {number:Number(p.dataset.scorePage),bars:groups.map(g=>Number(g.dataset.playbackBar)),rows:Object.values(rows),clipped};
 })};
 });}
try{for(const [width,saved] of [[440,false],[320,true],[1440,true]]){
 const mobile=width<1000;page=await browser.newPage({viewport:{width,height:956},hasTouch:mobile});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('rifflabThemeMode','light');if(!localStorage.getItem('fretiva.score.last-open.v1'))localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'C-daylight-fingerstyle-sketch',savedId:'',pdfId:''}));});
 await page.goto(process.env.AUDIT_URL??'http://127.0.0.1:5173/#etudes');await page.locator('.launchSplash').waitFor({state:'hidden'});
 let original;
 if(saved){
  original=await page.evaluate(async()=>{const {daylightDocument}=await import('/src/etudes/daylightFingerstyle.js'),{saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js'),{writePracticeSelection}=await import('/src/pdf/practiceSelection.js');const document={...structuredClone(daylightDocument),id:'qa-mobile-pages',kind:'user',title:'페이지 테스트 악보'};const saved=saveLibraryDocument(localStorage,document);if(!saved.saved)throw Error(JSON.stringify(saved.errors));writePracticeSelection({lessonId:'C-daylight-fingerstyle-sketch',savedId:document.id,pdfId:''});return JSON.stringify(saved.record.document);});
  await page.reload();await page.locator('.launchSplash').waitFor({state:'hidden'});
 }
 await ready();const layout=await geometry();
 assert.deepEqual(layout.pages.flatMap(p=>p.bars),Array.from({length:40},(_,i)=>i));assert(layout.pages.length>1);
 assert(layout.pages.every(p=>p.clipped.length===0),JSON.stringify(layout.pages));
 if(mobile){
  assert.equal(await page.getByRole('button',{name:'한 줄 2마디',exact:true}).getAttribute('aria-pressed'),'true');
  assert(layout.pages.every(p=>p.rows.every(row=>row.length<=2)&&p.rows.length>1),JSON.stringify(layout));
  assert(layout.overflow<=1,JSON.stringify(layout));assert(layout.body<=width);
  await waitPage(1);await page.screenshot({path:`${out}/${width}-page-1.png`});
  const next=()=>page.getByRole('button',{name:'다음 악보 페이지',exact:true});const prev=()=>page.getByRole('button',{name:'이전 악보 페이지',exact:true});
  await next().click();await waitPage(2);await prev().click();await waitPage(1);
  for(let n=2;n<=layout.pages.length;n++){await next().click();await waitPage(n);}
  assert(await next().isDisabled());
  const lastPageOffset=await page.evaluate(()=>document.querySelector('.mobileScorePage:last-child').getBoundingClientRect().top-document.querySelector('.mobileScorePageNav').getBoundingClientRect().bottom);
  assert(Math.abs(lastPageOffset-8)<=2,`Last page alignment: ${lastPageOffset}`);
  await page.screenshot({path:`${out}/${width}-last-page.png`});
  for(let n=layout.pages.length-1;n>=1;n--){await prev().click();await waitPage(n);}
  if(width===440){
   await next().click();await waitPage(2);await next().click();await waitPage(3);
   await page.locator('[data-start-bar="9"]').click();await page.locator('.etudePracticeStart').click();
   await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar==='2');await waitPage(1);
   await page.locator('.etudePracticeStart').click();
   await page.locator('[data-start-bar="3"]').click();await page.locator('.etudePracticeStart').click();
   await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar==='4');await waitPage(2);
   await next().click();await waitPage(3);await page.waitForTimeout(250);assert.match(await number(),/^3\s*\//);
   await page.locator('.etudeReturnPosition').click();await waitPage(2);await page.locator('.etudePracticeStart').click();
   await page.getByRole('button',{name:'악보 표시 방식 변경',exact:true}).click();await page.getByRole('button',{name:'오선보+TAB',exact:true}).click();
   await ready();await page.waitForFunction(()=>document.querySelector('.mobileScorePage svg')?.dataset.notationView==='both');
   const both=await geometry();assert.deepEqual(both.pages.flatMap(p=>p.bars),layout.pages.flatMap(p=>p.bars));assert(both.overflow<=1);assert(both.pages.every(p=>!p.clipped.length),JSON.stringify(both));
  }
 }else{
  assert.equal(await page.locator('.mobileScorePageNav').count(),0);assert.equal(await page.locator('.mobileScorePage').count(),0);
  await page.screenshot({path:`${out}/desktop.png`});
 }
 if(saved)assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records['qa-mobile-pages'].document)),original);
 assert.deepEqual(errors,[]);results.push({width,saved,pages:layout.pages.length,bars:40,overflow:layout.overflow,errors});console.log('PASS',width,saved?'saved':'built-in');await page.close();
}await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/failure.txt`,await page.locator('body').innerText());}throw error;}finally{await browser.close();}
