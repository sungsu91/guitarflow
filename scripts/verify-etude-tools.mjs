import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/etude-tools',{recursive:true});const results=[];
try {
for(const theme of ['light','brand'])for(const size of [{width:320,height:640},{width:390,height:844},{width:1440,height:960}]) {
 const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(theme=>{localStorage.setItem('rifflabThemeMode',theme);const Native=window.AudioContext;window.__audioContextCount=0;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContextCount++;}};},theme);
 await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();await page.locator('.etudeNotation svg').waitFor();
 assert.equal(await page.locator('.etudeLibrary').count(),0);
 const heights={};
 await page.getByRole('button',{name:'악보 듣기',exact:true}).click();
 for(const [value,label] of [['both','오선보+TAB'],['staff','오선보만'],['tab','TAB만']]){
  await page.getByRole('button',{name:'악보 보기',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForFunction(v=>document.querySelector('.etudeNotation svg')?.dataset.notationView===v,value);
  heights[value]=(await page.locator('.etudeNotation svg').boundingBox()).height;
  assert.equal(await page.getByRole('button',{name:'악보 재생 정지',exact:true}).getAttribute('aria-pressed'),'true');
 }
 assert.ok(heights.both>heights.staff&&heights.both>heights.tab);
 await page.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();await page.getByRole('button',{name:'박자',exact:true}).click();await page.getByRole('button',{name:'6/8',exact:true}).click();assert.equal(await page.locator('.etudeFloatingMetro .etudeBeat').count(),6);
 await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();
 await page.getByRole('button',{name:'▶ 메트로놈 시작',exact:true}).click();
 await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();await page.getByRole('button',{name:'세분',exact:true}).click();await page.getByRole('button',{name:'8분음표 — 1박당 2회',exact:true}).click();await page.getByRole('button',{name:'음색',exact:true}).click();await page.getByRole('button',{name:'Clave',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();
 await page.getByRole('button',{name:'BPM 48 조절',exact:true}).click();await page.getByRole('spinbutton',{name:'연습 BPM',exact:true}).fill('72');await page.getByRole('spinbutton',{name:'연습 BPM',exact:true}).press('Enter');

 const handle=page.getByRole('button',{name:'메트로놈 이동 (방향키로 이동)',exact:true});let box=await handle.boundingBox();
 await page.mouse.move(box.x+15,box.y+15);await page.mouse.down();await page.mouse.move(box.x+65,box.y-180,{steps:10});await page.mouse.up();
 assert.equal(await page.getByRole('button',{name:'■ 메트로놈 정지',exact:true}).getAttribute('aria-pressed'),'true');
 const edge=page.getByRole('button',{name:'백킹루프 패널 펼치기',exact:true});box=await edge.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+20,box.y+110,{steps:8});await page.mouse.up();assert.equal(await page.locator('.etudeBackingDrawer').count(),0);
 const scoreBefore=await page.locator('.etudeSheet').first().boundingBox();await edge.focus();await page.keyboard.press('Enter');await page.locator('.etudeBackingDrawer').waitFor();const scoreAfter=await page.locator('.etudeSheet').first().boundingBox();assert.deepEqual(scoreAfter,scoreBefore);
 await page.locator('.backingLoopImportInput').setInputFiles('public/sounds/gpg4.wav');
 await page.waitForFunction(()=>!document.querySelector('[aria-label="백킹 재생"]')?.disabled);
 await page.getByRole('button',{name:'전체 반복 켜기',exact:true}).click();await page.getByRole('button',{name:'백킹 재생',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.etudeBackingHandle [role=status]'));
 const contextCount=await page.evaluate(()=>window.__audioContextCount);await page.getByRole('button',{name:'백킹루프 패널 닫기',exact:true}).click();
 assert.equal(await page.locator('.etudeBackingHandle [role=status]').count(),1);assert.equal(await page.locator('audio.backingLoopAudio').count(),2);
 await page.evaluate(()=>window.scrollTo(0,500));assert.ok((await edge.boundingBox()).y>=0);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 let widget=await page.locator('.etudeFloatingMetro').boundingBox();assert.ok(widget.x>=0&&widget.y>=0&&widget.x+widget.width<=804&&widget.y+widget.height<=390);
 assert.equal(await page.getByRole('button',{name:'■ 메트로놈 정지',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.etudeBackingHandle [role=status]').count(),1);
 await page.setViewportSize(size);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
 await page.screenshot({path:`artifacts/etude-tools/${theme}-${size.width}.png`});
 await edge.click();await page.waitForTimeout(250);await page.screenshot({path:`artifacts/etude-tools/${theme}-${size.width}-panel.png`});await page.keyboard.press('Escape');assert.equal(await page.locator('.etudeBackingDrawer').count(),0);
 assert.equal(await page.evaluate(()=>window.__audioContextCount),contextCount);await page.getByRole('tab',{name:'내 악보',exact:true}).click();assert.equal(await page.locator('audio.backingLoopAudio').count(),0);assert.equal(await page.locator('.etudeFloatingMetro').count(),0);
 assert.deepEqual(errors,[]);results.push({theme,viewport:size,heights,viewDuringPlayback:true,meter:6,dragNoToggle:true,resizeWhilePlaying:true,backingCloseKeepsPlaying:true,exitStops:true,noNewAudioContextOnPanelOrResize:true,errors});await page.close();
}
}finally{await writeFile('artifacts/etude-tools/results.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
