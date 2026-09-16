import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await mkdir('artifacts/string-mutes',{recursive:true});
try{for(const width of [390,444,1440]){
 const p=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/간단 악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const d=p.getByRole('dialog',{name:'악보 편집',exact:true}),btn=name=>d.getByRole('button',{name,exact:true}),input=p.locator('[data-score-input]');
 const fixtures=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js'),t=await import('/src/etudes/tuplets.js');let regular=m.createBlankDocument();regular.title='줄별 X 확인';regular.measures[0].events=Array.from({length:8},(_,i)=>m.blankEvent(i*240,'8'));for(let i=0;i<8;i++){regular=c.enterFret(regular,{bar:0,event:i,string:6},9);regular=c.enterFret(regular,{bar:0,event:i,string:5},7);}let triplet=t.ensureTriplet(m.createBlankDocument(),{bar:0,event:0},'8');triplet=c.enterFret(triplet,{bar:0,event:0,string:6},9);triplet=c.enterFret(triplet,{bar:0,event:0,string:5},7);return {regular,triplet};});
 const load=async doc=>{await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'mute.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});if(await p.locator('.mobileEditorNotice').count())await p.locator('.mobileEditorNotice').click();};
 const tabs=()=>p.locator('[data-bar-index="0"] .vf-tabnote text').allTextContents();
 const xCount=()=>p.locator('[data-bar-index="0"] .vf-tabnote path').count();
 const staff=()=>p.locator('[data-bar-index="0"] .vf-stavenote path').evaluateAll(es=>es.map(n=>n.getAttribute('d')));
 for(const kind of ['regular','triplet']){
  await load(fixtures[kind]);const before=await staff();
  await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="6"]').click();
  if(width<600)await btn('뮤트음').click();else await input.press('x');
  assert.deepEqual(await staff(),before);const text=await tabs();assert.equal(await xCount(),1);assert(text.includes('7'));
  const cursor=await p.locator('[data-bar-index="0"] .etudeInputCursor').getAttribute('x');
  await input.press('Control+z');assert.equal(await xCount(),0);await input.press('Control+y');assert.equal(await xCount(),1);
  assert.equal(await p.locator('[data-bar-index="0"] .etudeInputCursor').getAttribute('x'),cursor);
  if(width===390)await p.screenshot({path:`artifacts/string-mutes/390-${kind}.png`});
  await btn(width<600?'악보 저장':'이 브라우저에 저장').click();
  const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
  assert.equal(saved.measures[0].events[0].duration,'8');assert.equal(saved.measures[0].events[0].notes.find(n=>n.string===6).dead,true);assert.equal(saved.measures[0].events[0].notes.find(n=>n.string===5).fret,7);
  assert.deepEqual(saved.measures[0].events.map(e=>[e.onset,e.duration,e.tuplet]),fixtures[kind].measures[0].events.map(e=>[e.onset,e.duration,e.tuplet]));
  await load(saved);assert.equal(await xCount(),1);await input.press('1');await input.press('2');assert.equal(await xCount(),0);assert((await tabs()).includes('12'));
 }
 assert.deepEqual(errors,[]);console.log({width,stringOnly:true,staffUnchanged:true,rhythmUnchanged:true,triplets:true,undoRedo:true,saveReload:true,errors});await p.close();
}}finally{await browser.close();}
