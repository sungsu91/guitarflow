import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure,blankEvent,newId,ticksOf,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';

// Actual editor -> PDF download -> fresh PDF library -> measure recognition.
// Each document ends with a singleton system. Counts AND spatial correspondence
// are checked so one missed bar cannot cancel out a false split elsewhere.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.QA_OUT??'artifacts/score-pdf-corpus',url=process.env.APP_URL??'http://127.0.0.1:5188/#etudes';
const selected=process.env.QA_CASES?.split(','),exportOnly=process.env.QA_EXPORT_ONLY==='1';
const cases=[];
for(const short of [false,true])for(const beam of ['above','below'])for(const pick of ['above','below'])cases.push({id:`tab-${short?'short':'long'}-beam-${beam}-pick-${pick}`,view:'tab',short,beam,pick});
cases.push({id:'tab-short-without-picking',view:'tab',short:true,beam:'below'},
 {id:'staff-guitar-quarter-stems',view:'staff'},
 {id:'staff-piano-quarter-stems',view:'staff',instrument:'piano',layout:'treble'},
 {id:'staff-piano-grand-quarter-stems',view:'staff',instrument:'piano',layout:'grand'});

function fixture(c){
 let d=createBlankDocument();if(c.instrument)d=convertScoreInstrument(d,c.instrument);
 d={...d,title:c.id,english:c.id,bpm:120,viewSettings:{notationView:c.view,measuresPerRow:3,systemBreaks:[],tabRhythm:true,tabShortStems:!!c.short,tabBeamPosition:c.beam??'below',tabPickingPosition:c.pick??'below',...(c.layout?{pianoStaffLayout:c.layout}:{})}};
 const patterns=[['4','4','4','4'],Array(8).fill('8'),Array(16).fill('16'),['8','16','16','4','8','8','4'],['4','4','4','4'],['2','4','8','8']];
 d.measures=Array.from({length:13},(_,bar)=>{
  const durations=c.view==='staff'?['4','4','4','4']:patterns[bar%patterns.length];
  const eventsFor=hand=>{let onset=0;return durations.map((duration,i)=>{
   const event={...blankEvent(onset,duration),rest:false,blank:false};onset+=ticksOf(event);
   if(c.instrument==='piano'){
    const root=hand==='left'?40+(bar+i)%8:64+(bar+i)%10;
    event.notes=(bar%3===1?[root,root+4,root+7]:[root]).map(midi=>({id:newId('tone'),midi,hand}));
    if(c.layout==='grand')event.voice=hand;
   }else{
    const strings=bar%6===4?[1,2,3,4,5,6]:bar%6===0?[1+(i%3)*2]:[1+(bar+i)%6];
    event.notes=strings.map(string=>({id:newId('tone'),string,fret:(bar+i)%5,locked:true}));
    if(c.pick)event.pickStroke=i%2?'up':'down';
   }
   // Break dense groups with rests, leaving partial beams on either side.
   if(c.view==='tab'&&bar%6===3&&i===3){event.rest=true;event.notes=[];delete event.pickStroke;}
   return event;
  });};
  return {...blankMeasure(),events:c.layout==='grand'?[...eventsFor('right'),...eventsFor('left')].sort((a,b)=>a.onset-b.onset):eventsFor('right')};
 });
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);return d;
}
async function readRecord(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('fretiva.pdf.library.v1',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,q=db.transaction('scores','readonly').objectStore('scores').getAll();q.onsuccess=()=>{db.close();resolve(q.result[0]);};q.onerror=()=>reject(q.error);};}));}
async function exportPdf(browser,c,source,dir,result){
 const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(e.message));page.setDefaultTimeout(30000);
 try{
  await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});},source);
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('.desktopScorePage').first().waitFor();
  await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();await page.locator('[data-score-input]').waitFor();
  await page.locator('.etudeEditor .desktopPdfSave').click();const preview=page.locator('.print-preview-overlay');await preview.locator('[data-print-page] svg').first().waitFor();
  result.print=await preview.locator('[data-print-page]').evaluateAll(pages=>pages.map((p,page)=>{
   const paper=p.getBoundingClientRect(),norm=n=>{const r=n.getBoundingClientRect();return {x:(r.x-paper.x)/paper.width,y:(r.y-paper.y)/paper.height,width:r.width/paper.width,height:r.height/paper.height};};
   return {page:page+1,rows:[...p.querySelectorAll(':scope > section')].map(s=>[...s.querySelectorAll('svg')].map(svg=>({number:+svg.querySelector('.etudeMeasureNumber')?.textContent,...norm(svg),staveY:(new DOMPoint(0,+svg.dataset.staveTop).matrixTransform(svg.getScreenCTM()).y-paper.y)/paper.height}))),
    stems:[...p.querySelectorAll('.tabRhythmStem')].map(n=>Math.abs(+n.getAttribute('y2')-+n.getAttribute('y1'))),
    beams:[...new Set([...p.querySelectorAll('.etudeTabRhythm')].map(n=>n.dataset.position))],picks:[...new Set([...p.querySelectorAll('[data-picking-position]')].map(n=>n.dataset.pickingPosition))],
    pickSymbols:[...new Set([...p.querySelectorAll('.tabPickingLabel')].map(n=>n.textContent))],
    pianoLayouts:[...new Set([...p.querySelectorAll('[data-piano-staff-layout]')].map(n=>n.dataset.pianoStaffLayout))]};
  }));
  await writeFile(`${dir}/print.json`,JSON.stringify(result.print,null,2));
  const lengths=result.print.flatMap(p=>p.stems);if(c.view==='tab'){
   assert.ok(lengths.length>50,'TAB rhythm was actually printed');
   if(c.short)assert.ok(lengths.every(n=>n===20||n===10),`short stems must remain short in PDF: got ${[...new Set(lengths)]}`);
   else assert.ok(lengths.some(n=>n>30),'long-stem control must contain long stems');
   assert.deepEqual([...new Set(result.print.flatMap(p=>p.beams))],[c.beam]);
   assert.deepEqual([...new Set(result.print.flatMap(p=>p.picks))],c.pick?[c.pick]:[]);
   if(c.pick)assert.deepEqual([...new Set(result.print.flatMap(p=>p.pickSymbols))].sort(),['V','Π']);
  }
  if(c.layout)assert.deepEqual([...new Set(result.print.flatMap(p=>p.pianoLayouts))],[c.layout]);
  result.numberBounds=await preview.locator('.etudeMeasureNumber').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox(),v=n.ownerSVGElement.viewBox.baseVal;return {number:+n.textContent,left:b.x-v.x,right:v.x+v.width-b.x-b.width};}));
  assert.ok(result.numberBounds.every(b=>b.left>=0&&b.right>=0),'printed measure labels must not be clipped at cell edges');
  assert.deepEqual(result.print.flatMap(p=>p.rows.flatMap(r=>r.map(b=>b.number))),Array.from({length:13},(_,i)=>i+1));
  for(const row of result.print.flatMap(p=>p.rows))assert.ok(Math.max(...row.map(b=>b.staveY))-Math.min(...row.map(b=>b.staveY))<.0001,'adjacent printed measures must share the same staff origin');
  await page.screenshot({path:`${dir}/print.png`});await writeFile(`${dir}/print.html`,await preview.innerHTML());
  const downloading=page.waitForEvent('download',{timeout:120000});await preview.getByRole('button',{name:'PDF 저장',exact:true}).click();
  const filename=preview.locator('.rt-pdf-filename');await filename.waitFor();await filename.locator('input').fill(c.id);await filename.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();await(await downloading).saveAs(`${dir}/${c.id}.pdf`);
  result.exported=true;
 }catch(error){await page.screenshot({path:`${dir}/export-failure.png`});throw error;}finally{await context.close();}
}
async function recognise(browser,c,dir,result){
 const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));page.setDefaultTimeout(30000);
 try{
  await page.addInitScript(()=>localStorage.setItem('language','ko'));await page.goto(url,{waitUntil:'networkidle'});
  await page.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles(`${dir}/${c.id}.pdf`);
  const info=page.getByRole('dialog',{name:'PDF 악보 정보'});await info.getByRole('button',{name:'기기에 저장',exact:true}).click();await info.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'마디 자동 인식',exact:true}).click();await page.getByRole('dialog',{name:'마디 자동 인식',exact:true}).getByRole('button',{name:'분석 시작',exact:true}).click();
  const done=page.locator('.pdfAutoMeasures').getByRole('button',{name:'완료',exact:true});await done.waitFor({timeout:120000});result.summary=await page.locator('.pdfAutoMeasures').innerText();
  await page.screenshot({path:`${dir}/recognition.png`});await done.click();await page.waitForTimeout(1200);
  const record=await readRecord(page);result.barMap=record.barMap;const groups=new Map();for(const b of record.barMap){const key=`${b.page}:${b.system}`;groups.set(key,(groups.get(key)??0)+1);}result.systemCounts=[...groups.values()];
  assert.equal(record.barMap.length,13);assert.deepEqual(record.barMap.map(b=>b.number),Array.from({length:13},(_,i)=>i+1));assert.deepEqual(result.systemCounts,[3,3,3,3,1]);assert.ok(record.barMap.every(b=>b.beats===4));
  const expected=result.print.flatMap(p=>p.rows.flatMap(r=>r.map(b=>({...b,page:p.page}))));
  result.spatial=record.barMap.map((b,i)=>{const cell=expected[i],center={x:b.x+b.width/2,y:b.y+b.height/2};
   assert.equal(b.page,cell.page,`page of measure ${i+1}`);
   assert.ok(center.x>=cell.x&&center.x<=cell.x+cell.width&&center.y>=cell.y&&center.y<=cell.y+cell.height,`measure ${i+1} must occupy its authored cell`);
   const overlap=Math.max(0,Math.min(b.x+b.width,cell.x+cell.width)-Math.max(b.x,cell.x))/b.width;assert.ok(overlap>.9,`measure ${i+1} must not cross the real barline`);return {number:i+1,overlap};});
  if(process.env.QA_PLAYBACK==='1'){
   await page.getByRole('button',{name:'반복 설정',exact:true}).click();const repeat=page.getByRole('dialog',{name:'반복 설정',exact:true});
   await repeat.getByRole('spinbutton',{name:'반복 시작 마디',exact:true}).fill('12');await repeat.getByRole('spinbutton',{name:'반복 끝 마디',exact:true}).fill('13');await repeat.getByRole('button',{name:'설정 적용',exact:true}).click();
   if(await page.locator('.desktopDockCountIn').getAttribute('aria-pressed')==='true')await page.locator('.desktopDockCountIn').click();for(let i=0;i<16;i++)await page.locator('.desktopPracticeDock .metronomeHeroBpmJumpButton--up').click();
   await page.locator('.desktopDockPlay').click();result.playback=await page.evaluate(async()=>{const visits=[];let prior,start=performance.now(),maxPlayheads=0;await new Promise(resolve=>{const tick=now=>{const nodes=[...document.querySelectorAll('.pdfPlayhead')].filter(n=>n.getBoundingClientRect().width>0),bar=nodes[0]?.dataset.bar;maxPlayheads=Math.max(maxPlayheads,nodes.length);if(bar&&bar!==prior){visits.push({bar:+bar,ms:Math.round(now-start)});prior=bar;}if(now-start<6200)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});return {visits,maxPlayheads};});await page.locator('.desktopDockPlay').click();
   assert.deepEqual(result.playback.visits.slice(0,6).map(v=>v.bar),[12,13,12,13,12,13]);assert.equal(result.playback.maxPlayheads,1);
   await page.screenshot({path:`${dir}/loop.png`});
  }
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'마디 자동 인식',exact:true}).waitFor();assert.deepEqual((await readRecord(page)).barMap,record.barMap);result.reopened=true;
 }catch(error){await page.screenshot({path:`${dir}/recognition-failure.png`});throw error;}finally{await context.close();}
}
await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'}),report=[];
try{for(const c of cases.filter(c=>!selected||selected.includes(c.id))){
 const dir=`${out}/${c.id}`;await mkdir(dir,{recursive:true});const source=fixture(c),result={id:c.id,sourceBars:13,errors:[]};await writeFile(`${dir}/source.json`,JSON.stringify(source,null,2));
 try{await exportPdf(browser,c,source,dir,result);if(!exportOnly)await recognise(browser,c,dir,result);assert.deepEqual(result.errors,[]);result.passed=true;}
 catch(error){result.passed=false;result.failure=error.stack;}
 await writeFile(`${dir}/result.json`,JSON.stringify(result,null,2));report.push(result);await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({case:c.id,passed:result.passed,summary:result.summary,failure:result.failure?.split('\n')[0]}));
}}finally{await browser.close();}
if(report.some(r=>!r.passed))process.exitCode=1;
