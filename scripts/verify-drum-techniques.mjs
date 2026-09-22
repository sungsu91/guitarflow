import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let currentPage;
try{for(const width of [390,360,1440]){
 const height=width===360?800:width===390?844:900;
 const p=await browser.newPage({viewport:{width,height}}),errors=[];currentPage=p;p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.getByLabel('악기 선택',{exact:true}).selectOption('drums');
 const menu=p.getByRole('combobox',{name:'드럼 주법'});await menu.waitFor();assert(await menu.isDisabled());
 await p.getByRole('button',{name:'추가 악기',exact:true}).click();assert(await p.getByRole('group',{name:'드럼 그림 입력',exact:true}).isVisible());
 for(const name of ['사이드 스틱','일렉트릭 스네어','페달 하이햇','라이드 벨','림샷 (합성)'])assert(await p.getByRole('button',{name,exact:true}).isVisible());
 const imageBox=await p.locator('.drumKit').boundingBox(),extraBox=await p.locator('.drumExtra').boundingBox();assert(extraBox.y>=imageBox.y+imageBox.height);
 for(const name of ['킥','스네어','하이햇 닫힘'])await p.getByRole('button',{name,exact:true}).click();
 const snare=p.locator('.etudeNoteHandle[data-midi="38"]').first();await snare.click();assert(!(await menu.isDisabled()));
 const apply=async label=>{await menu.click();const box=await p.getByRole('listbox',{name:'드럼 주법'}).boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height);if(label==='드래그')await p.screenshot({path:`output/drum-menu-${width}.png`});await p.getByRole('option',{name:label,exact:true}).click();};
 await apply('악센트 >');assert.equal(await p.locator('dialog[open] [data-drum-accent]').count(),1);
 await apply('드래그');assert.equal(await p.locator('dialog[open] [data-drum-grace]').count(),2);assert.equal(await p.locator('dialog[open] [data-drum-technique]').count(),1);
 await p.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await p.locator('dialog[open] [data-drum-grace]').count(),0);
 await p.getByRole('button',{name:'다시 실행',exact:true}).click();assert.equal(await p.locator('dialog[open] [data-drum-grace]').count(),2);
 await apply('고스트 노트 (음)');assert.equal(await p.locator('dialog[open] [data-drum-accent]').count(),0);
 for(const [name,count] of [['롤 · 빗금 1개',1],['롤 · 빗금 2개',2],['롤 · 빗금 3개',3],['버즈 롤',3]]){await menu.click();await p.getByRole('option',{name:'롤 ▸',exact:true}).click();await p.getByRole('option',{name,exact:true}).click();assert.equal(await p.locator('dialog[open] [data-drum-roll-slash]').count(),count);assert.equal(await p.locator('dialog[open] [data-drum-grace]').count(),0);}
 await apply('주법 지우기');assert.equal(await p.locator('dialog[open] [data-drum-technique]').count(),0);await apply('플램');await apply('악센트 >');
 await p.getByRole('button',{name:width<600?'악보 저장':'이 브라우저에 저장',exact:true}).click();await p.getByLabel('악보 제목',{exact:true}).fill('드럼 주법 검증');await p.getByRole('button',{name:'저장하기',exact:true}).click();
 const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document),notes=saved.measures[0].events[0].notes;
 assert.deepEqual(notes.find(n=>n.midi===38).drumTechnique,{ornament:'flam',dynamic:'accent'});assert(notes.filter(n=>n.midi!==38).every(n=>!n.drumTechnique));assert.equal(saved.measures[0].events[0].onset,0);assert.equal(saved.measures[0].events[0].duration,'4');
 const popup=p.waitForEvent('popup');await p.getByRole('button',{name:'A4 인쇄 미리보기',exact:true}).click();const print=await popup;await print.locator('[data-drum-accent]').waitFor();assert.equal(await print.locator('[data-drum-grace]').count(),1);await print.close();
 await p.getByRole('button',{name:width<600?'악보 편집 뒤로':'닫기',exact:true}).click();await p.getByRole('button',{name:'드럼 주법 검증 열기',exact:true}).click();await p.getByRole('button',{name:'악보 생성·편집 선택',exact:true}).click();await p.getByRole('button',{name:'현재 악보 편집',exact:true}).click();await p.locator('dialog[open] [data-drum-accent]').waitFor();assert.equal(await p.locator('dialog[open] [data-drum-grace]').count(),1);
 await p.getByRole('button',{name:'추가 악기',exact:true}).click();await p.getByRole('button',{name:'림샷 (합성)',exact:true}).click();assert.equal(await p.locator('dialog[open] [data-drum-technique] text').filter({hasText:'R'}).count(),1);await p.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await p.locator('dialog[open] [data-drum-technique] text').filter({hasText:'R'}).count(),0);await p.getByRole('button',{name:'다시 실행',exact:true}).click();
 await p.locator('dialog[open]').getByLabel('악보 소리',{exact:true}).check();await p.getByRole('button',{name:'악보 재생',exact:true}).click();await p.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 const bounds=await p.locator('.drumHatRow').evaluate(e=>[...e.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,right:r.right,height:r.height};}));assert(bounds.every(r=>r.x>=0&&r.right<=width+1&&r.height>=40),JSON.stringify(bounds));
 await p.screenshot({path:`output/drum-techniques-${width}.png`});assert.deepEqual(errors,[]);console.log('PASS drum UI/undo/save/reopen/print',width);await p.close();
}
const p=await browser.newPage();await p.goto('http://127.0.0.1:5173/');
const audio=await p.evaluate(async()=>{
 const {scheduleDrum,prepareDrumSamples}=await import('/src/audio/scoreDrums.js');const results=[];
 for(const [name,technique,articulation] of [['normal',{}],['accent',{dynamic:'accent'}],['ghost',{dynamic:'ghost'}],['flam',{ornament:'flam'}],['drag',{ornament:'drag'}],['roll',{ornament:'roll-2'}],['buzz',{ornament:'buzz'}],['rimshot',{},'rimshot']]){
  const ctx=new OfflineAudioContext(1,96000,48000);await prepareDrumSamples(ctx);const starts=[],create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const s=create(),start=s.start.bind(s);s.start=at=>{starts.push(at);start(at);};return s;};
  scheduleDrum(ctx,{midi:38,duration:.5,beatSeconds:.5,writtenDuration:'4',drumTechnique:technique,drumArticulation:articulation},.1,ctx.destination,.3);const buffer=await ctx.startRendering();results.push({name,starts,energy:buffer.getChannelData(0).reduce((sum,x)=>sum+x*x,0)});
 }
 // Stopping before the written hit must also cancel scheduled roll bounces.
 const ctx=new OfflineAudioContext(1,48000,48000);await prepareDrumSamples(ctx);const voice=scheduleDrum(ctx,{midi:38,duration:.5,drumTechnique:{ornament:'buzz'}},.1,ctx.destination,.3);voice.release(.05);const stopped=await ctx.startRendering();return {results,stoppedEnergy:stopped.getChannelData(0).reduce((sum,x)=>sum+x*x,0)};
});
const by=name=>audio.results.find(r=>r.name===name);assert(by('accent').energy>by('normal').energy);assert(by('ghost').energy<by('normal').energy);assert.equal(by('flam').starts.length,2);assert.equal(by('drag').starts.length,3);assert.equal(by('roll').starts.length,4);assert(by('buzz').starts.length>4);assert.equal(by('rimshot').starts.length,2);assert.equal(audio.stoppedEnergy,0);console.log('PASS offline audio',JSON.stringify(audio));await p.close();
}catch(error){if(currentPage&&!currentPage.isClosed()){console.log((await currentPage.locator('body').innerText()).slice(-5000));await currentPage.screenshot({path:'output/drum-failure.png'});}throw error;}finally{await browser.close();}
