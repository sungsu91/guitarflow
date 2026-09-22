import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
async function setup(width,height,theme='light',permission='prompt'){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({theme,permission})=>{
  localStorage.setItem('rifflabThemeMode',theme);window.midiCalls=0;window.testPermission=permission;
  const access=new EventTarget();class Port extends EventTarget{constructor(id){super();this.id=id;this.name=`Test Keyboard ${id}`;this.state='connected';}async open(){return this;}send(data){const e=new Event('midimessage');e.data=new Uint8Array(data);this.dispatchEvent(e);}}
  const port=new Port('a'),second=new Port('b');access.inputs=new Map([['a',port],['b',second]]);window.testMidi={access,port,second};
  Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:async()=>{if(window.testPermission==='unknown')throw Error('Unsupported descriptor');return {state:window.testPermission==='rejected'?'prompt':window.testPermission};}}});
  Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:permission==='unsupported'?undefined:async options=>{window.midiCalls++;if(options.sysex!==false)throw Error('Unexpected SysEx');if(window.testPermission==='rejected')throw new DOMException('Denied','NotAllowedError');window.testPermission='granted';return access;}});
 },{theme,permission});
 await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:/악보 만들기/}).click();await page.locator('[data-draw-count]').first().waitFor();return {page,errors};
}
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
async function save(p){await click(p,await p.locator('.mobileScoreWorkspace').count()?'악보 저장':'이 브라우저에 저장');await click(p,'저장하기');return p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).find(r=>r.document)?.document);}
async function send(p,messages){await p.evaluate(messages=>messages.forEach(m=>window.testMidi.port.send(m)),messages);await p.waitForTimeout(100);}
try{
 for(const [width,height,theme] of [[390,844,'light'],[360,800,'brand'],[1440,1000,'light'],[1440,900,'brand']]){
  const {page:p,errors}=await setup(width,height,theme);const canvas=p.locator('[data-score-input]');
  assert.equal(await p.evaluate(()=>midiCalls),0);
  const before=await canvas.boundingBox();await click(p,'표준 튜닝 ▾');assert.equal(await p.locator('.editorSettingsPopover').count(),1);assert.deepEqual(await canvas.boundingBox(),before);
  await click(p,'반음 다운');await click(p,'반음 다운 ▾');await click(p,'표준 튜닝');
  await click(p,/^(?:.* · )?카포 없음 ▾$/);await p.getByRole('combobox',{name:'카포 선택',exact:true}).click();await p.getByRole('listbox',{name:'카포 선택',exact:true}).getByRole('option',{name:'2프렛',exact:true}).click();
  await canvas.focus();await canvas.press('1');await canvas.press('2');let d=await save(p);assert.equal(d.capo,2);assert.equal(d.measures[0].events[0].notes[0].fret,12);assert.equal(d.measures[0].events[0].notes[0].midi,54);
  await click(p,/^(?:.* · )?카포 2 ▾$/);await p.getByRole('combobox',{name:'카포 선택',exact:true}).click();await p.getByRole('listbox',{name:'카포 선택',exact:true}).getByRole('option',{name:'3프렛',exact:true}).click();assert(await p.getByRole('radio',{name:'음높이 유지',exact:true}).isChecked());await click(p,'운지 재계산 후 적용');assert.equal(await p.locator('.editorTabWarning').count(),0);
  await click(p,'실행 취소');assert.equal(await p.getByRole('button',{name:/^(?:.* · )?카포 2 ▾$/}).count(),1);await click(p,'다시 실행');assert.equal(await p.getByRole('button',{name:/^(?:.* · )?카포 3 ▾$/}).count(),1);await click(p,'실행 취소');
  await click(p,/^(?:.* · )?카포 2 ▾$/);await p.getByRole('combobox',{name:'카포 선택',exact:true}).click();await p.getByRole('listbox',{name:'카포 선택',exact:true}).getByRole('option',{name:'3프렛',exact:true}).click();await p.getByRole('radio',{name:'운지 유지',exact:true}).check();await click(p,'변경 적용');d=await save(p);assert.equal(d.measures[0].events[0].notes[0].midi,55);assert.equal(d.measures[0].events[0].notes[0].fret,12);
  await click(p,'편집 ▾');await p.locator('.deviceConnection > summary').click();await click(p,'장치 연결');await p.getByText('연결됨 · Test Keyboard a',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>midiCalls),1);
  // Settings own focus: MIDI must not mutate the selected score.
  await send(p,[[0x90,60,100],[0x80,60,0]]);await p.keyboard.press('Escape');await canvas.focus();await canvas.press('ArrowRight');
  await send(p,[[0x90,64,100],[0x90,67,100],[0x90,71,100]]);await click(p,'실행 취소');assert.equal(await p.locator('[data-bar-index="0"] [data-event="1"][data-midi="71"]').count(),0);await click(p,'다시 실행');await send(p,[[0x90,64,100]]);await send(p,[[0x80,64,0],[0x90,67,0],[0x80,71,0],[0xb0,64,127]]);
  d=await save(p);assert.equal(d.measures[0].events[1].notes.length,3);assert.deepEqual(d.measures[0].events[1].notes.map(n=>n.midi),[64,67,71]);assert(d.measures[0].events[2].blank);
  await canvas.focus();await send(p,[[0x90,72,100],[0x80,72,0],[0x90,74,100],[0x80,74,0]]);d=await save(p);assert.equal(d.measures[0].events[2].notes[0].midi,72);assert.equal(d.measures[0].events[3].notes[0].midi,74);assert.equal(d.measures.length,2);
  await click(p,'편집 ▾');await p.locator('.deviceConnection > summary').click();await p.evaluate(()=>{testMidi.port.state='disconnected';testMidi.access.dispatchEvent(new Event('statechange'));});await p.getByText(/장치 미연결 ·/).waitFor();await p.evaluate(()=>{testMidi.port.state='connected';testMidi.access.dispatchEvent(new Event('statechange'));});await p.getByText('연결됨 · Test Keyboard a',{exact:true}).waitFor();await p.getByLabel('MIDI 입력 장치').selectOption('b');await p.getByText('연결됨 · Test Keyboard b',{exact:true}).waitFor();await p.keyboard.press('Escape');
  // Stop/restart events must never turn playback or text edits into input.
  await click(p,'이전 마디');await canvas.focus();await click(p,'악보 재생');await p.getByRole('button',{name:'악보 재생 정지',exact:true}).waitFor();await canvas.focus();await send(p,[[0x90,60,100],[0x80,60,0]]);await click(p,'악보 재생 정지');
  await click(p,width<600?'악보 저장':'이 브라우저에 저장');await send(p,[[0x90,61,100],[0x80,61,0]]);await click(p,'저장하기');
  const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert(saved.measures[1].events[0].blank);
  const popupPromise=p.waitForEvent('popup');await click(p,'A4 인쇄 미리보기');const print=await popupPromise;await print.locator('.scoreCredit').waitFor();assert.match(await print.locator('.scoreCredit').innerText(),/카포 3/);await print.close();
  await click(p,width<600?'악보 편집 뒤로':'닫기');await click(p,'새 악보 열기');await p.getByRole('button',{name:'악보 생성·편집 선택',exact:true}).click();await click(p,'현재 악보 편집');await p.locator('[data-draw-count]').first().waitFor();assert.equal(await p.getByRole('button',{name:/^(?:.* · )?카포 3 ▾$/}).count(),1);
  await canvas.focus();await click(p,'다음 마디');await canvas.focus();await p.evaluate(()=>{testMidi.second.send([0x90,76,100]);testMidi.second.send([0x80,76,0]);});await p.waitForTimeout(100);const reopened=await save(p);assert.equal(reopened.measures[1].events[0].notes.length,1);assert(reopened.measures[1].events[1].blank);
  await p.screenshot({path:`output/tuning-${width}-${theme}.png`});
  if(width<600){const keypad=await p.locator('.mobileFretPad').boundingBox().catch(()=>null),dock=await p.locator('.editorAudioDock').boundingBox();assert(dock.x>=0&&dock.x+dock.width<=width+1);await p.setViewportSize({width:844,height:390});await click(p,'편집 ▾');await p.locator('.deviceConnection > summary').click();const pop=await p.locator('.editorSettingsPopover').boundingBox();assert(pop.x>=0&&pop.y>=0&&pop.y+pop.height<=391);await p.screenshot({path:`output/tuning-landscape-${theme}.png`});}
  assert.deepEqual(errors,[]);console.log({width,height,theme,passed:true});await p.close();
 }
 {
  const {page:p,errors}=await setup(390,844);await click(p,'표준 튜닝 ▾');await click(p,'사용자 지정');await p.getByLabel('6번 줄 개방현').selectOption('39');await click(p,'사용자 튜닝 적용');assert.equal(await p.getByRole('button',{name:'사용자 지정 ▾'}).count(),1);
  await click(p,'편집 ▾');await p.locator('.deviceConnection > summary').click();await p.getByLabel('자동 TAB 포지션').selectOption('range');await p.getByLabel('선호 최소 프렛').fill('3');await p.getByLabel('선호 최대 프렛').fill('7');await click(p,'장치 연결');await p.getByText('연결됨 · Test Keyboard a',{exact:true}).waitFor();await p.keyboard.press('Escape');await p.locator('[data-score-input]').focus();await send(p,[[0x90,20,100],[0x80,20,0]]);
  const d=await save(p);assert.equal(d.tuning[5],39);assert.deepEqual(d.autoTab,{mode:'range',min:3,max:7});assert.equal(d.measures[0].events[0].notes[0].midi,20);assert(d.measures[0].events[0].notes[0].unplaced);assert.equal(await p.getByText(/이 마디를 표시하지 못했습니다/).count(),0);await p.screenshot({path:'output/tuning-unplaced.png'});assert.deepEqual(errors,[]);console.log('custom tuning, preferred range, unplaced notation: passed');await p.close();
 }
 for(const permission of ['granted','denied','rejected','unknown','unsupported']){
  const {page:p,errors}=await setup(390,844,'light',permission);await click(p,'편집 ▾');await p.locator('.deviceConnection > summary').click();
  if(permission==='granted'){await p.getByText('연결됨 · Test Keyboard a',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>midiCalls),1);}
  else if(permission==='unsupported'){assert(await p.getByRole('button',{name:'장치 연결'}).isDisabled());assert.equal(await p.evaluate(()=>midiCalls),0);}
  else{assert.equal(await p.evaluate(()=>midiCalls),0);await click(p,'장치 연결');if(permission==='denied'||permission==='rejected'){await p.getByText(/권한 거부:/).waitFor();await click(p,'장치 연결');assert.equal(await p.evaluate(()=>midiCalls),permission==='rejected'?1:0);}else{await p.getByText('연결됨 · Test Keyboard a',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>midiCalls),1);}}
  assert.deepEqual(errors,[]);console.log({permission,passed:true});await p.close();
 }
}finally{await browser.close();}
