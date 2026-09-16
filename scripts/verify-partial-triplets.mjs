import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/partial-triplets';await mkdir(out,{recursive:true});
const results=[];
try {
 for(const width of [390,360,375,393,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},isMobile:width<600,hasTouch:width<600});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.getByRole('button',{name:/간단 악보 만들기/}).click();
  await page.locator('[data-draw-count]').first().waitFor();
  const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true}),button=name=>dialog.getByRole('button',{name,exact:true});
  // Every combination of entered note, explicit rest and unentered slot.
  const matrix=await page.evaluate(async()=>{
   const m=await import('/src/etudes/scoreModel.js'),t=await import('/src/etudes/tuplets.js'),c=await import('/src/etudes/editorCommands.js'),{drawScore}=await import('/src/etudes/Score.jsx');
   let count=0;const host=document.createElement('div');host.style.width='358px';document.body.append(host);
   try {for(const duration of ['8','16'])for(let mask=0;mask<27;mask++)for(const view of ['both','staff','tab']){
    let d=t.ensureTriplet(m.createBlankDocument(),{bar:0,event:0},duration),code=mask;
    for(let i=0;i<3;i++){const state=code%3;code=Math.floor(code/3);if(state===1)d=c.enterFret(d,{bar:0,event:i,string:3},3+i);if(state===2)d=c.setRest(d,{bar:0,event:i,string:3});}
    const compiled=m.compileDocumentV2(JSON.parse(JSON.stringify(d)));
    if(compiled.errors.length)throw Error(JSON.stringify(compiled.errors));
    drawScore(host,compiled.score,{mobile:true,editor:true,tabRhythm:true,view});
    if(Math.abs(host.querySelector('svg').getBoundingClientRect().width-host.getBoundingClientRect().width)>1)throw Error('SVG width changed '+host.querySelector('svg').getBoundingClientRect().width+' / '+host.getBoundingClientRect().width);
    if(host.innerHTML.includes('NaN'))throw Error('Invalid SVG geometry');
    if(d.measures[0].events.reduce((sum,e)=>sum+m.ticksOf(e),0)!==1920)throw Error('Changed measure timing');
    count++;
   }}finally{host.remove();}return count;
  });
  assert.equal(matrix,162);
  const blank=await page.evaluate(async()=> (await import('/src/etudes/scoreModel.js')).createBlankDocument());
  for(const duration of ['8','16']) {
   await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'partial.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(blank))});
   if(await page.locator('.mobileEditorNotice').count())await page.locator('.mobileEditorNotice').click();
   await button(`${duration}분음표`).click();
   if(await button('3연음 입력').getAttribute('aria-pressed')!=='true')await button('3연음 입력').click();
   const input=page.locator('[data-score-input]');
   await page.evaluate(()=>{window.tripletFrames=[];window.tripletSampling=true;const frame=()=>{for(const host of document.querySelectorAll('[data-draw-count]')){const svg=host.shadowRoot?.querySelector('svg');if(svg)window.tripletFrames.push({svg:svg.getBoundingClientRect().width,host:host.getBoundingClientRect().width,alert:!!document.querySelector('.etudeEditorMeasure [role=alert]')});}if(window.tripletSampling)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
   for(let i=0;i<3;i++) {
    await input.press(String(i+3));await page.waitForTimeout(80);
    assert.equal(await dialog.getByRole('alert').count(),0);
    if(width===390)await page.screenshot({path:`${out}/390-${duration}-${i+1}-notes.png`});
    if(i<2)await input.press('ArrowRight');
   }
   await input.press('Control+z');await page.waitForTimeout(80);assert.equal(await dialog.getByRole('alert').count(),0);
   await input.press('Control+y');await page.waitForTimeout(80);assert.equal(await dialog.getByRole('alert').count(),0);
   const frames=await page.evaluate(()=>{window.tripletSampling=false;return window.tripletFrames;});
   assert(frames.length>0);assert(frames.every(f=>!f.alert&&Math.abs(f.svg-f.host)<1));
   assert(Math.max(...frames.map(f=>f.svg))-Math.min(...frames.map(f=>f.svg))<1);
   // Leave just one note and verify the saved partial group reopens.
   await input.press('Control+z');await input.press('Control+z');
   await button(width<600?'악보 저장':'이 브라우저에 저장').click();
   if(await page.locator('.mobileEditorNotice').count())await page.locator('.mobileEditorNotice').click();
   const saved=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).at(-1).document);
   assert.equal(saved.measures[0].events.filter(e=>!e.rest).length,1);
   assert.equal(saved.measures[0].events[0].tuplet.actualNotes,3);
   assert.equal(saved.measures[0].events[0].duration,duration);
   await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'reopened.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
   await page.waitForTimeout(80);assert.equal(await dialog.getByRole('alert').count(),0);
   results.push({width,duration,renderCases:matrix,frames:frames.length,partialInput:true,undoRedo:true,savedPartialReload:true,errors});
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}`);
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
