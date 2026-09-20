import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 for(const viewport of [{width:390,height:844},{width:1365,height:900}]) {
 const p=await b.newPage({viewport});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rifflabThemeMode','brand'));
 await p.goto('http://127.0.0.1:5174/#mini-chord');
 await p.locator('.miniChordLoadPicker button').first().click();
 await p.getByRole('option').filter({hasText:'첫 번째 드라이브'}).click();
 await p.getByRole('button',{name:'반주 사운드 전체 끄기',exact:true}).waitFor();
 await p.getByRole('button',{name:'미니코드 반주 시작',exact:true}).click();
 await p.getByRole('button',{name:'미니코드 반주 정지',exact:true}).waitFor();
 const snapshot=()=>p.evaluate(()=>({bars:[...document.querySelectorAll('.miniChordBar.is-playing')].map(e=>e.dataset.miniChordBarIndex),slots:[...document.querySelectorAll('.miniChordSlot.playing')].map(e=>({slot:e.dataset.miniChordSlotIndex,bar:e.closest('.miniChordBar').dataset.miniChordBarIndex}))}));
 await p.waitForTimeout(1900);
 for(const bar of [7,0,8,1,7,0]) {
  await p.locator(`[data-mini-chord-bar-index="${bar}"] .miniChordPlaybackSeekLayer`).click();
  await p.waitForTimeout(100);
  const s=await snapshot();console.log(viewport.width,bar,JSON.stringify(s));
  assert.deepEqual(s.bars,[String(bar)]);assert.equal(s.slots.length,1);assert.equal(s.slots[0].bar,s.bars[0]);
 }
 await p.waitForTimeout(2800);
 const advanced=await snapshot();assert.deepEqual(advanced.bars,['1']);assert.equal(advanced.slots.length,1);assert.equal(advanced.slots[0].bar,'1');
 await p.screenshot({path:`output/mini-transition-playing-${viewport.width}.png`});
 await p.getByRole('button',{name:'미니코드 반주 정지',exact:true}).click();
 const stopped=await snapshot();console.log('stopped',JSON.stringify(stopped));
 assert.deepEqual(stopped,{bars:[],slots:[]});assert.deepEqual(errors,[]);
 for(const name of ['드럼 끄기','베이스 끄기','피아노 끄기']) assert.equal(await p.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
 await p.getByRole('button',{name:'피아노 끄기',exact:true}).click();
 assert.equal(await p.getByRole('button',{name:'피아노 켜기',exact:true}).getAttribute('aria-pressed'),'false');
 await p.evaluate(()=>{location.hash='#metronome';});
 await p.locator('.miniChordMakerPanel').waitFor({state:'hidden'});
 await p.evaluate(()=>{location.hash='#mini-chord';});
 for(const name of ['드럼 끄기','베이스 끄기','피아노 끄기']) await p.getByRole('button',{name,exact:true}).waitFor();
 await p.screenshot({path:`output/mini-transition-${viewport.width}.png`});await p.close();
 }
}finally{await b.close();}
