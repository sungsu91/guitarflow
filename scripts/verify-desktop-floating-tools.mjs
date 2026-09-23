import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/desktop-floating',{recursive:true});
try {
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1920,height:912},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});
  if(!mobile)await page.addInitScript(()=>{localStorage.setItem('riff-etude-remote-position',JSON.stringify({x:800,y:600}));localStorage.setItem('riff-etude-backing-panel-position',JSON.stringify({x:740,y:400}));});
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.getByRole('tab',{name:'에튀드',exact:true}).waitFor();
  assert.deepEqual(await page.getByRole('tablist',{name:'악보 카테고리'}).getByRole('tab').allTextContents(),['에튀드','내 악보']);
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  await page.locator('.etudeNotation svg').waitFor();
  await page.getByRole('button',{name:'백킹루프',exact:true}).click();
  await page.locator('.etudeBackingDrawer').waitFor();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.etudeBackingDragBar').count(),0);
  assert.equal(await page.locator('.etudeRemote .etudeDragHandle').count(),0);
  if(!mobile){
   const remote=page.locator('.etudeRemote'),dot=remote.locator('.etudeBeat').first();
   const label=await dot.getAttribute('aria-label');
   await dot.click();assert.notEqual(await dot.getAttribute('aria-label'),label,'stationary beat click changes accent');
   for(const target of [dot,remote.getByRole('button',{name:'메트로놈 닫기',exact:true}),remote.locator('.etudeRemoteBpm'),remote.locator('.etudePracticeStart'),remote.locator('.etudePracticeStop'),remote.getByRole('button',{name:'메트로놈 볼륨',exact:true}),remote.getByRole('button',{name:'메트로놈 상세 설정',exact:true})]){
    const before=await remote.boundingBox(),r=await target.boundingBox(),accent=await dot.getAttribute('aria-label');
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
    await page.mouse.move(r.x+r.width/2-70,r.y+r.height/2-45,{steps:10});await page.mouse.up();
    const after=await remote.boundingBox();assert.ok(after,'drag must not close the panel');
    assert.ok(Math.abs(after.x-before.x+70)<2&&Math.abs(after.y-before.y+45)<2,'drag starts on a button');
    assert.equal(await dot.getAttribute('aria-label'),accent,'drag does not change beat accent');
   }
   await remote.locator('.etudeRemoteBpm').click();
   await page.getByRole('dialog',{name:'BPM 조절',exact:true}).waitFor();
   await page.getByRole('spinbutton',{name:'연습 BPM',exact:true}).fill('72');
   assert.match(await remote.locator('.etudeRemoteBpm').innerText(),/72/);
   await page.keyboard.press('Escape');
   for(const [selector,handle] of [['.etudeRemote','.etudeRemote .practiceCurrentBar'],['.etudeBackingDrawer','.etudeBackingDrawer .backingLoopTrackInfo.is-drag-handle']]){
    const panel=page.locator(selector);
    for(let i=0;i<2;i++){
     const before=await panel.boundingBox(),r=await page.locator(handle).boundingBox();
     // A pre-existing selection spanning the score and floating controls must
     // never start Chromium's native text drag instead of moving the panel.
     await page.evaluate(()=>{window.__nativeDrags=0;document.addEventListener('dragstart',()=>window.__nativeDrags++,{once:true});const range=document.createRange();range.selectNodeContents(document.querySelector('.app'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
     const dx=selector==='.etudeRemote'?130:-130,dy=selector==='.etudeRemote'?-90:90;
     await page.mouse.move(r.x+15,r.y+15);await page.mouse.down();await page.mouse.move(r.x+15+dx,r.y+15+dy,{steps:8});await page.mouse.up();
     assert.equal(await page.evaluate(()=>window.__nativeDrags),0,'no native text drag');
     const after=await panel.boundingBox();assert.ok(Math.abs(after.x-before.x-dx)<2);assert.ok(Math.abs(after.y-before.y-dy)<2);
    }
    const before=await panel.boundingBox();await page.locator(selector==='.etudeRemote'?'.etudeRemoteBeats':handle).focus();await page.keyboard.press('ArrowUp');assert.equal(Math.round((await panel.boundingBox()).y),Math.round(before.y-16));
    assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
   }
   assert.ok((await page.locator('.etudeRemote').boundingBox()).height<130);
   assert.equal(await page.locator('.etudeBackingDrawer .backingLoopPanel--standaloneDesktop').count(),1,'reuse the original desktop player');
   for(const width of [1920,1024]){
    await page.setViewportSize({width,height:912});await page.waitForTimeout(100);
    const result=await page.locator('.etudeBackingDrawer').evaluate(panel=>{
     const r=panel.getBoundingClientRect();panel.scrollLeft=100;
     return {scrollLeft:panel.scrollLeft,overflow:panel.scrollWidth>panel.clientWidth,clipped:[...panel.querySelectorAll('button')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.left<r.left||b.right>r.right);}).map(e=>e.getAttribute('aria-label')||e.textContent)};
    });assert.deepEqual(result,{scrollLeft:0,overflow:false,clipped:[]});
   }
   await page.setViewportSize({width:1920,height:912});
   await page.screenshot({path:'artifacts/desktop-floating/desktop.png'});
  }else{
   assert.equal(await page.locator('.etudeBackingDragBar').count(),0);
   assert.equal(await page.locator('.etudeRemote .etudeDragHandle').count(),0);
   const box=await page.locator('.etudeRemote').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391&&box.y+box.height<=845);
   await page.screenshot({path:'artifacts/desktop-floating/mobile.png'});
  }
  assert.deepEqual(errors,[]);console.log(mobile?'Mobile pinned transport and separate backing UI PASS':'Desktop repeated dragging, keyboard movement, compact layout and overflow PASS');await page.close();
 }
}finally{await browser.close();}
