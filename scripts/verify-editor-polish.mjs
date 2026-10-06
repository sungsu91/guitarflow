import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
import {createBlankDocument,blankMeasure,newId,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {normalizePitches} from '../src/etudes/scoreTuning.js';
const out='artifacts/editor-polish-20261006';await mkdir(out,{recursive:true});
const source=normalizePitches({...createBlankDocument(),title:'코드명 창 · 손가락 표시 검증',measures:Array.from({length:64},(_,bar)=>{
 const m=blankMeasure();m.harmony='C';
 m.events=m.events.map((e,i)=>({...e,rest:false,blank:false,...(bar===0&&i<2?{pickStroke:i?'up':'down'}:{}),notes:[{id:newId('tone'),string:3,fret:2,finger:3,rightFinger:['p','i','m','a'][i],locked:true}]}));
 if(bar===42){m.harmony=null;m.harmonyReview={reason:'missing'};m.events[0]={...m.events[0],notes:[],rest:true,blank:true,pdfImport:{status:'unresolved',pendingStrings:[],rhythmVerified:false}};}
 return m;
})});
const sound=d=>scoreTimeline(compileDocumentV2(d).score,60).events.map(n=>[n.midi,n.start,n.duration]);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser(),results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.addInitScript(d=>{
   localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));
   localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));
  },source);
  try{
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   await page.locator('.etudeEditor').waitFor();
   const labels=await page.locator('.etudeEditor .tabPickingLabel').allTextContents();
   assert.deepEqual(labels,['Π','V'],'only explicit stroke directions remain');
   if(!mobile)assert.equal(await page.locator('.pdfTabUnresolvedMarker').count(),1,'a genuine missing note must stay visible');
   await page.locator('[data-mobile-tool-toggle="picking"]').click();const panel=page.locator('#mobile-tool-picking');
   await panel.getByRole('button',{name:'아르페지오',exact:true}).click();await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('all');
   await panel.getByRole('button',{name:'빠진 코드명 입력',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'코드명 선택',exact:true});await dialog.waitFor();
   assert.equal(await dialog.locator('#chord-name-bar').inputValue(),'42');
   const sizes=mobile?[[390,844],[360,740]]:[[1920,1080],[1440,900],[1024,600],[1024,480]];
   for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    const state=await dialog.evaluate(n=>{const r=n.getBoundingClientRect(),apply=n.querySelector('.chordApply').getBoundingClientRect(),close=n.querySelector('header button').getBoundingClientRect();return {modal:n.matches(':modal'),x:r.x,y:r.y,width:r.width,height:r.height,apply:{x:apply.x,y:apply.y,width:apply.width,height:apply.height},closeY:close.y,position:getComputedStyle(n).position};});
    assert.equal(state.modal,!mobile);assert.equal(state.position,mobile?'relative':'fixed');
    assert(state.x>=-1&&state.x+state.width<=width+1,JSON.stringify(state));
    if(!mobile){assert(state.y>=0&&state.y+state.height<=height+1,JSON.stringify(state));assert(state.closeY>=0);assert(state.apply.y+state.apply.height<=height+1);}
    assert.equal(await page.locator(mobile?'.desktopArpeggioControls':'.mobileArpeggioControls').count(),0);
    await page.screenshot({path:`${out}/chord-name-${width}x${height}.png`});results.push({mobile,viewport:{width,height},...state});
   }
   await page.setViewportSize({width:mobile?390:1440,height:mobile?844:900});
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await page.locator('.etudeEditor').isVisible());
   if(mobile)await panel.getByRole('button',{name:'아르페지오',exact:true}).click();
   await panel.getByRole('button',{name:'빠진 코드명 입력',exact:true}).click();await dialog.waitFor();
   await dialog.getByRole('button',{name:'G',exact:true}).click();await dialog.getByRole('button',{name:'M7',exact:true}).click();
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'Gmaj7');
   await dialog.getByRole('button',{name:'불러오기',exact:true}).click();await dialog.waitFor({state:'detached'});
   await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
   const saved=(await readBrowserScoreLibrary(page)).records[source.id].document;
   assert.equal(saved.measures[42].harmony,'Gmaj7');
   for(const [i,m] of saved.measures.entries())assert.deepEqual(m.events,source.measures[i].events,`bar ${i+1}: chord name UI and hidden labels preserve all notes, metadata and durations`);
   assert.deepEqual(sound(saved),sound(source),'performed pitches and timing are unchanged');assert.deepEqual(errors,[]);
   results.push({mobile,savedChord:saved.measures[42].harmony,notesPreserved:true,pitchesAndRhythmPreserved:true,fingerLabelsRemoved:true,strokesPreserved:true,errors});console.log(JSON.stringify({mobile,pass:true}));
  }catch(e){await page.screenshot({path:`${out}/polish-${mobile?'mobile':'desktop'}-error.png`});console.error((await page.locator('body').innerText()).slice(-4000));throw e;}finally{await page.close();}
 }
}finally{await writeFile(`${out}/ui-results.json`,JSON.stringify(results,null,2));await browser.close();await server.close();}
