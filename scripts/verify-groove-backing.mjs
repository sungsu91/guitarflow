import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.evaluate(async()=>{
   const {defaults,savePacks}=await import('/src/metronome/groovePackLibrary.js');
   savePacks([{...defaults[0],id:'shared-test',builtin:false,title:'공유 테스트 팩',bpm:120,createdAt:Date.now()}]);
  });
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  await page.getByRole('button',{name:'메트로놈 닫기',exact:true}).click();
  await page.getByRole('button',{name:'백킹루프',exact:true}).click();
  await page.getByRole('button',{name:'Playlist 열기',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'App 내 파일 추가',exact:true}).count(),0);
  await page.getByRole('button',{name:'그루브팩',exact:true}).click();
  
  // Compact browser controls use the shared catalog without an import dropdown.
  assert.equal(await page.locator('.backingGrooveMini select').count(),0);
  await page.getByRole('button',{name:'재즈',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'8비트 선택',exact:true}).count(),0);
  await page.getByRole('button',{name:'전체',exact:true}).click();
  await page.getByLabel('백킹 팩 검색').fill('8비트');
  assert.equal(await page.locator('.backingGrooveMiniRow').count(),1);
  await page.getByRole('button',{name:'8비트 미리 듣기',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="8비트 미리 듣기 정지"]')?.getAttribute('aria-busy')==='false');
  await page.getByLabel('백킹 팩 검색').fill('');
  await page.screenshot({path:'output/backing-groove-mini-'+width+'.png'});
  const bounds=await page.locator('.backingGrooveMini').boundingBox();assert.ok(bounds.height<350);assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
  await page.getByRole('button',{name:'내 저장 팩',exact:true}).click();
  await page.getByRole('button',{name:'공유 테스트 팩 선택',exact:true}).click();
  await page.getByRole('button',{name:'목록에 연결',exact:true}).click();
  await page.locator('.backingLoopGroovePicker').waitFor({state:'detached'});
  const stored=()=>page.evaluate(async()=>{
   const {loadBackingLoopLibrary}=await import('/src/backing-loop/backingLoopStorage.js');
   const {loadBackingPlaylistState}=await import('/src/backing-loop/backingPlaylist.js');
   return {recordings:(await loadBackingLoopLibrary()).length,ids:loadBackingPlaylistState().currentQueue.itemIds};
  });
  assert.deepEqual(await stored(),{recordings:0,ids:['groove:saved:shared-test']});
  await page.getByRole('button',{name:'그루브팩',exact:true}).click();
  await page.getByRole('button',{name:'내 저장 팩',exact:true}).click();
  await page.getByRole('button',{name:'공유 테스트 팩 선택',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'목록에 있음',exact:true}).isDisabled());
  await page.getByRole('button',{name:'그루브팩 선택 닫기',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Playlist 닫기',exact:true}).click();
  await page.getByRole('button',{name:'백킹 재생',exact:true}).click();
  await page.getByRole('button',{name:'백킹 일시정지',exact:true}).waitFor({timeout:10000}).catch(async e=>{console.log(await page.locator('.etudeBackingDrawer').innerText());throw e;});
  const duration=()=>page.evaluate(()=>[...document.querySelectorAll('audio')].find(a=>a.src&&Number.isFinite(a.duration))?.duration);
  assert.equal(await duration(),16);console.log(width,'initial playback');
  assert.ok(await page.getByRole('button',{name:'현재 백킹 편집 화면 열기'}).isDisabled());
  assert.equal((await stored()).recordings,0);
  await page.evaluate(async()=>{
   const {readPacks,savePacks}=await import('/src/metronome/groovePackLibrary.js');
   savePacks(readPacks().map(p=>({...p,title:'수정된 공유 팩',bpm:60})));
  });
  await page.getByRole('button',{name:'백킹 재생',exact:true}).waitFor();
  await page.getByRole('button',{name:'백킹 재생',exact:true}).click();
  await page.getByRole('button',{name:'백킹 일시정지',exact:true}).waitFor({timeout:10000}).catch(async e=>{console.log(await page.locator('.etudeBackingDrawer').innerText());throw e;});
  assert.equal(await duration(),32);console.log(width,'updated playback');
  await page.getByRole('button',{name:'백킹 일시정지',exact:true}).click();
  await page.reload();
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  assert.deepEqual(await stored(),{recordings:0,ids:['groove:saved:shared-test']});
  await page.evaluate(async()=>{const {savePacks}=await import('/src/metronome/groovePackLibrary.js');savePacks([]);});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rifflab-backing-playlist-v3')).currentQueue.itemIds.length===0,null,{timeout:10000});
  assert.equal((await stored()).recordings,0);assert.deepEqual(errors,[]);
  console.log(width,'shared reference, no copied recording, playback, edit, dedupe, reload, delete passed');
  await page.close();
 }
} finally {await browser.close();}
