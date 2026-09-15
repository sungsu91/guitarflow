import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const out='artifacts/mobile-score';await mkdir(out,{recursive:true});const report=[];
try{for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932]]){const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();globalThis.qa=p;const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:'간단 악보 만들기',exact:true}).click();await p.locator('[data-draw-count]').first().waitFor();
 const button=name=>p.getByRole('button',{name,exact:true});const fret=async n=>button(`프렛 ${n}`).click();const state=()=>p.locator('.mobileCursorPad output').textContent();
 const dismiss=async()=>{if(await p.locator('.mobileEditorNotice').count())await p.locator('.mobileEditorNotice').click();};
 const read=async()=>{await button('악보 저장').click();await dismiss();return p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);};
 for(const n of [2,3,2,3,5])await fret(n);let d=await read();assert.deepEqual(d.measures[0].events.map(e=>e.notes[0].fret),[2,3,2,3]);assert.equal(d.measures[1].events[0].notes[0].fret,5);assert.equal(d.measures[1].events[0].notes[0].string,6);assert.match(await state(),/2마디 · 2박 · 6번줄/);
 const geometry=await p.locator('.etudeEditorCanvas').evaluate(e=>{const a=e.getBoundingClientRect(),panel=document.querySelector('.mobileScoreInput').getBoundingClientRect();return {width:e.clientWidth,scroll:e.scrollWidth,height:a.height,bottom:a.bottom,panelTop:panel.top,panelBottom:panel.bottom,screen:innerHeight};});assert.ok(geometry.scroll<=geometry.width+1);assert.ok(geometry.height>240);assert.ok(geometry.bottom<=geometry.panelTop);assert.ok(geometry.panelBottom<=height+1);
 const svg=await p.locator('[data-bar-index="1"] svg').boundingBox();assert.ok(svg.x>=0&&svg.x+svg.width<=width,'entire measure');
 await button('위 기타 줄').click();assert.match(await state(),/5번줄/);await button('아래 기타 줄').click();await fret(1);await fret(2);d=await read();assert.equal(d.measures[1].events[1].notes[0].fret,12);assert.match(await state(),/3박/);
 await button('뮤트음').click();d=await read();assert.equal(d.measures[1].events[2].dead,true);assert.ok(await p.locator('[data-bar-index="1"] svg').count());assert.equal(await p.getByRole('alert').count(),0);
 await button('이전 입력 위치').click();await button('삭제').click();await button('실행 취소').click();d=await read();assert.equal(d.measures[1].events[2].dead,true);await button('다시 실행').click();d=await read();assert.equal(d.measures[1].events[2].rest,true);
 await button('모두↑').click();d=await read();assert.ok(d.measures.flatMap(m=>m.events).filter(e=>!e.rest).every(e=>e.pickStroke==='up'));
 await button('모두↓').click();d=await read();assert.ok(d.measures.flatMap(m=>m.events).filter(e=>!e.rest).every(e=>e.pickStroke==='down'));
 await p.locator('[data-bar-index="0"] .etudePickHit').first().click();await button('직접 피킹 ↑').click();d=await read();assert.equal(d.measures[0].events[0].pickStroke,'up');assert.match(await state(),/1마디 · 2박/);
 await button('보기 · 메뉴').click();await p.locator('.etudeDocumentMenus>details').filter({has:p.locator('summary').filter({hasText:/^보기$/})}).locator('summary').click();await p.getByLabel('TAB 리듬 표시',{exact:true}).check();await button('상세 설정 닫기').click();
 await button('8분음표').click();for(const n of [2,3,4,5,6,7,8,9,0])await fret(n);d=await read();assert.ok(d.measures[1].events.some(e=>e.duration==='8'));assert.ok(await p.locator('.etudeTabRhythm').count()>0);
 const beams=await p.locator('.etudeTabRhythm').evaluateAll(gs=>gs.map(g=>({gap:Number(g.dataset.beamY)-6-Number(g.dataset.sixthY),spacing:Number(g.dataset.lineGap),beams:g.querySelectorAll('.tabRhythmBeam').length})));assert.ok(beams.every(g=>g.gap>=g.spacing*2));
 let longPerformance=null;
 if(width===390){
  await button('16분음표').click();for(let i=0;i<24;i++)await fret(i%8+2);d=await read();assert.ok(d.measures.length>=3);assert.equal(await p.getByRole('alert').count(),0);
  await button('↓↑교대').click();await read();await button('이전 마디').click();await p.screenshot({path:`${out}/390x844-editor.png`});
  const before=await read(),counts=await p.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>Number(e.dataset.drawCount)));await fret(5);const after=await read(),counts2=await p.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>Number(e.dataset.drawCount)));assert.ok(counts2.filter((v,i)=>v!==counts[i]).length<=2,'local engraving');
  const selected=await state(),scroll=await p.locator('.etudeEditorCanvas').evaluate(e=>e.scrollTop);await button('상세').click();await button('상세 설정 닫기').click();assert.equal(await state(),selected);assert.equal(await p.locator('.etudeEditorCanvas').evaluate(e=>e.scrollTop),scroll);
  await button('보기 · 메뉴').click();await p.locator('.etudeDocumentMenus summary').filter({hasText:/^보기$/}).click();await p.getByLabel('TAB 리듬 표시',{exact:true}).uncheck();await button('상세 설정 닫기').click();assert.equal(await p.locator('.etudeTabRhythm').count(),0);assert.deepEqual(await read(),after);
  await button('이전 마디').click();await button('악보 재생 정지').click();await p.locator('.etudePlayingSlot').first().waitFor();await p.waitForTimeout(350);assert.equal(await button('악보 재생 정지').getAttribute('aria-pressed'),'true');await button('악보 재생 정지').click();
  await button('빈 마디 ＋').click();for(const pair of [[1,0],[1,2],[1,5]]){await fret(pair[0]);await fret(pair[1]);}d=await read();const entered=d.measures.find(m=>m.events.length===4&&m.events.slice(0,3).map(e=>e.notes[0]?.fret).join(',')==='10,12,15');
  // Current entry length is still a sixteenth; inspect values independent of rhythmic density.
  assert.ok(d.measures.some(m=>m.events.slice(0,3).map(e=>e.notes[0]?.fret).join(',')==='10,12,15'));
  const long=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js');const d=m.createBlankDocument();d.measures=Array.from({length:32},()=>m.blankMeasure());const {enterFret}=await import('/src/etudes/editorCommands.js');return enterFret(d,{bar:0,event:0,string:6},3);});await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'qa.fretiva.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(long))});await dismiss();const last=p.locator('[data-bar-index="31"] [data-mode="tab"][data-event="0"][data-string="6"]').first();await last.click();const beforeLong=await p.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>Number(e.dataset.drawCount)));for(let i=0;i<30;i++)await fret(i%8+2);await read();const afterLong=await p.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>Number(e.dataset.drawCount)));assert.deepEqual(afterLong.slice(0,31),beforeLong.slice(0,31));longPerformance=await p.locator('.etudeEditorCanvas').evaluate(e=>{const a=[...(e.inputMeasurements??[])].sort((a,b)=>a-b);return {samples:a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};});
  const saved=await read();
  // A swipe beginning on a note scrolls the score, without dragging musical data.
  await p.locator('.etudeEditorCanvas').evaluate(e=>e.scrollTop=0);
  const touch=await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"]').first().boundingBox();
  // Keep a fallback for an empty input hit.
  const target=touch??await p.locator('[data-bar-index="0"] [data-mode="tab"]').first().boundingBox();
  const cdp=await ctx.newCDPSession(p),tx=target.x+target.width/2,ty=Math.min(300,target.y+target.height/2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty-n*12}]});await p.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(150);
  assert.ok(await p.locator('.etudeEditorCanvas').evaluate(e=>e.scrollTop)>40,'native touch scroll');assert.deepEqual(await read(),saved);
  await button('악보 편집 뒤로').click();await p.reload();await button('열기').click();assert.deepEqual(await read(),saved);
 }
 await p.screenshot({path:`${out}/${width}x${height}.png`});assert.deepEqual(errors,[]);const performance=await p.locator('.etudeEditorCanvas').evaluate(e=>{const a=[...(e.inputMeasurements??[])].sort((a,b)=>a-b);return {samples:a.length,p95:a[Math.floor(a.length*.95)]??null,max:a.at(-1)??null};});report.push({width,height,geometry,beams,performance:longPerformance??performance,errors});await ctx.close();
}}catch(e){if(globalThis.qa&&!globalThis.qa.isClosed())await globalThis.qa.screenshot({path:`${out}/failure.png`});throw e;}finally{await writeFile(`${out}/verification.json`,JSON.stringify(report,null,2));await browser.close();}
