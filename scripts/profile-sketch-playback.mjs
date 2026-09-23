import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const id of ['chord-three-strings','together-composition-sketch','daylight-fingerstyle-sketch']){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.addInitScript(()=>{
  localStorage.setItem('fretiva.score.sound','true');
  const Base=window.AudioContext;window.contexts=[];window.AudioContext=class extends Base{constructor(...args){super(...args);window.contexts.push(this);}};
  window.audit={scans:0,toggles:0,frames:[],long:[],running:false};
  const query=Element.prototype.querySelectorAll;Element.prototype.querySelectorAll=function(s){if(audit.running&&s==='[data-rhythm-events][data-rhythm-role="note"]')audit.scans++;return query.call(this,s);};
  const toggle=DOMTokenList.prototype.toggle;DOMTokenList.prototype.toggle=function(...args){if(audit.running&&args[0]==='rhythm-technique-active')audit.toggles++;return toggle.apply(this,args);};
  new PerformanceObserver(list=>{if(audit.running)audit.long.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:false});
 });
 await page.goto(`${process.env.VERIFY_URL??'http://127.0.0.1:5174'}/#etudes`);
 await page.getByRole('tab',{name:'에튀드',exact:true}).click();
 const title=await page.evaluate(async id=>(await import('/src/etudes/catalog.js')).ETUDES.find(e=>e.templateId===id).english,id);
 await page.getByRole('button',{name:'연습 유형',exact:true}).click();await page.getByRole('searchbox',{name:'악보 검색'}).fill(title);await page.locator('.etudePickerCard').click();await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.locator('.etudeNotation svg').waitFor();await page.waitForTimeout(200);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.evaluate(()=>{audit.running=true;let last;const frame=t=>{if(last)audit.frames.push(t-last);last=t;if(audit.running)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await page.getByRole('button',{name:'연습 시작',exact:true}).click();await page.waitForTimeout(5000);
 const data=await page.evaluate(async()=>{audit.running=false;const {stringCacheStats}=await import('/src/audio/pluckedString.js');const frames=audit.frames.sort((a,b)=>a-b);return {scans:audit.scans,toggles:audit.toggles,frames:frames.length,p95:frames[Math.floor(frames.length*.95)],maxFrame:frames.at(-1),longTasks:audit.long.length,longMs:audit.long.reduce((a,b)=>a+b,0),cache:contexts.map(stringCacheStats),glyphs:document.querySelectorAll('.etudeNotation svg *').length,bar:document.querySelector('.savedScorePlayhead')?.dataset.bar};});
 results.push({id,...data});await page.close();
 }await mkdir('artifacts/sketch-performance',{recursive:true});await writeFile(`artifacts/sketch-performance/${process.env.PROFILE_NAME??'before'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
