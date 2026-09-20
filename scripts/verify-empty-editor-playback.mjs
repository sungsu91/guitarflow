import assert from 'node:assert/strict';
const {chromium,webkit}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
for(const [engine,type,options] of [['chrome',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
 if(process.env.TEST_ENGINE&&process.env.TEST_ENGINE!==engine)continue;
 const browser=await type.launch({headless:true,...options});
 try{for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5177/#etudes');if(!await p.evaluate(()=>Boolean(window.AudioContext||window.webkitAudioContext))){console.log(`${engine} ${width}: SKIPPED — test browser has no Web Audio API`);await p.close();continue;}await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
  const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js');const d=m.createBlankDocument();d.measures.push(m.blankMeasure());d.bpm=120;return d;});
  await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  const start=p.getByRole('button',{name:'악보 재생',exact:true});await start.click();await p.locator('.etudePlayingSlot').waitFor({state:'attached',timeout:12000}).catch(async error=>{console.log(await p.locator('.editorAudioDock').innerText());console.log(errors);throw error;});
  const x=await p.locator('.etudePlayingSlot').getAttribute('x1');await p.waitForTimeout(250);assert(Number(await p.locator('.etudePlayingSlot').getAttribute('x1'))>Number(x));
  await p.waitForFunction(()=>document.querySelector('[data-bar-index="1"] [data-draw-count]')?.shadowRoot.querySelector('.etudePlayingSlot'),{},{timeout:5000});
  assert((await p.locator('.editorAudioStatus').innerText()).includes('2마디'));
  await start.waitFor({state:'visible',timeout:5000});assert.equal(await p.locator('.etudePlayingSlot').count(),0);
  await start.click();await p.getByRole('button',{name:'악보 재생 정지',exact:true}).click();assert.equal(await p.locator('.etudePlayingSlot').count(),0);
  assert.deepEqual(errors,[]);console.log(`${engine} ${width}: empty playback advances across bars, completes and stops`);await p.close();
 }}finally{await browser.close();}
}
