import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/playback-cursor';await mkdir(out,{recursive:true});const results=[];
try{for(const width of (process.env.CURSOR_WIDTHS?.split(',').map(Number)??[390,444,1440])){
 const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:/간단 악보 만들기/}).click();await page.locator('[data-draw-count]').first().waitFor();
 const fixture=await page.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js');const d=m.createBlankDocument();d.bpm=120;d.title='리듬 진행 확인';d.viewSettings.measuresPerRow=4;d.measures=Array.from({length:8},(_,bar)=>{const measure=m.blankMeasure();measure.events=Array.from({length:bar%2?12:8},(_,i)=>({...m.blankEvent(i*(bar%2?160:240),'8'),blank:false,rest:false,notes:[{id:m.newId('tone'),string:5,fret:7},{id:m.newId('tone'),string:6,fret:9}],...(bar%2?{tuplet:{actualNotes:3,normalNotes:2,groupId:`${measure.id}-${Math.floor(i/3)}`}}:{})}));return measure;});return d;});
 await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'cursor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true});
 const play=dialog.getByRole('button',{name:width<600?'악보 재생 정지':'악보 음정·리듬 듣기',exact:true});
 const draw=await page.locator('[data-draw-count]').evaluateAll(ns=>ns.map(n=>n.dataset.drawCount));
 await play.click();await page.locator('.etudePlayingSlot').waitFor({state:'attached'});
 const sample=()=>page.locator('.etudePlayingSlot').evaluate(n=>{const svg=n.ownerSVGElement,host=svg.getRootNode().host,bar=Number(host.closest('[data-bar-index]').dataset.barIndex),tick=Number(n.dataset.tick);const hits=[...svg.querySelectorAll('.etudeEditorHit[data-mode="tab"][data-string="1"]')].filter(n=>!n.classList.contains('etudeNoteHandle'));const spacing=bar%2?160:240,index=Math.min(hits.length-1,Math.floor(tick/spacing));const a=Number(hits[index].dataset.cursorX)+12,b=index+1<hits.length?Number(hits[index+1].dataset.cursorX)+12:svg.viewBox.baseVal.width-2;return {bar,tick,x:Number(n.getAttribute('x1')),x2:Number(n.getAttribute('x2')),expected:a+(b-a)*(tick-index*spacing)/spacing,tag:n.tagName,time:performance.now()};});
 const a=await sample();await page.waitForTimeout(180);const b=await sample();assert.equal(a.tag,'line');assert.equal(b.x,b.x2);assert(b.x>a.x);assert(Math.abs(b.x-b.expected)<.01);assert(Math.abs((b.tick-a.tick)/(b.time-a.time)-.96)<.15);
 assert.equal(await page.locator('.etudePlayingRow').count(),4);assert.deepEqual(await page.locator('.etudePlayingRow').evaluateAll(ns=>ns.map(n=>n.getAttribute('stroke'))),Array(4).fill('none'));
 assert.deepEqual(await page.locator('[data-draw-count]').evaluateAll(ns=>ns.map(n=>n.dataset.drawCount)),draw);
 await page.screenshot({path:`${out}/${width}-eighths.png`});
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-bar-index="1"] [data-draw-count]')].some(h=>h.shadowRoot.querySelector('.etudePlayingSlot')));
 const t=await sample();assert.equal(t.bar,1);assert(Math.abs(t.x-t.expected)<.01);await page.screenshot({path:`${out}/${width}-triplets.png`});
 if(width===390){await page.waitForFunction(()=>[...document.querySelectorAll('[data-bar-index="4"] [data-draw-count]')].some(h=>h.shadowRoot.querySelector('.etudePlayingSlot')),{},{timeout:12000});const rows=await page.locator('.etudePlayingRow').evaluateAll(ns=>ns.map(n=>n.getRootNode().host.closest('[data-layout-row]').dataset.layoutRow));assert.deepEqual(rows,['2','2','2','2']);}
 await dialog.getByRole('button',{name:'악보 재생 정지',exact:true}).click();assert.equal(await page.locator('.etudePlayingSlot').count(),0);assert.equal(await page.locator('.etudePlayingRow').count(),0);assert.deepEqual(errors,[]);
 if(width===390){
  await dialog.getByRole('button',{name:'TAB만',exact:true}).click();await dialog.getByRole('button',{name:'한 줄 1마디',exact:true}).click();
  await play.click();await page.locator('.etudePlayingSlot').waitFor({state:'attached'});await page.waitForTimeout(120);
  const bounds=await page.locator('.etudePlayingSlot').evaluate(n=>({top:Number(n.getAttribute('y1')),bottom:Number(n.getAttribute('y2'))}));assert(bounds.top>=0&&bounds.bottom>bounds.top);
  await page.screenshot({path:`${out}/390-tab.png`});await dialog.getByRole('button',{name:'악보 재생 정지',exact:true}).click();assert.equal(await page.locator('.etudePlayingRow').count(),0);
 }
 results.push({width,a,b,triplet:t,errors});await page.close();
}}finally{await browser.close();}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
