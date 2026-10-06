import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const origin=process.env.EDITOR_ORIGIN??'http://127.0.0.1:5174',out='artifacts/mobile-editor-toolbar';
await mkdir(out,{recursive:true});
const normal={...createBlankDocument(),title:'모바일 도구 줄 검증',measures:Array.from({length:4},()=>blankMeasure())};
for(const m of normal.measures)for(const [i,e] of m.events.entries())Object.assign(e,{blank:false,rest:false,notes:[{id:`${e.id}-note`,string:1,fret:i,midi:64+i}]});
const imported=structuredClone(normal);imported.title='불러온 악보 도구 줄 검증';
imported.viewSettings={...imported.viewSettings,measuresPerRow:4};
imported.pdfTabImport={notation:{octaveShift:0},summary:{pageCoverage:{complete:false,completed:1,totalPages:2},pagesWithoutTab:[2],barCountMismatches:[{page:1,staff:1}]}};
for(const m of imported.measures){m.pdfImport={source:{page:1,notation:true},needsReview:true,rhythmVerified:true};for(const e of m.events){e.pdfImport={source:{page:1,notation:true},status:'unresolved',rhythmVerified:true,pendingStrings:[]};for(const n of e.notes)n.source={writtenMidi:n.midi};}}
Object.assign(imported.measures[0].events[1],{blank:true,rest:true,notes:[],pdfImport:{status:'unresolved',pendingStrings:[1],rhythmVerified:true}});
imported.measures[2].pdfImport.rhythmVerified=false;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
const geometry=page=>page.locator('.etudeEditor').evaluate(editor=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 const bar=editor.querySelector('.etudeMeasureLayoutBar'),canvas=editor.querySelector('.etudeEditorCanvas');
 return {canvas:rect(canvas),bar:rect(bar),barWidth:bar.clientWidth,barScroll:bar.scrollWidth,editorWidth:editor.clientWidth,editorScroll:editor.scrollWidth,notation:rect(editor.querySelector('.mobileNotationTools')??editor.querySelector('.etudeDesktopToolbarRow')),controls:[...bar.querySelectorAll('button')].map(e=>({text:e.textContent,...rect(e)}))};
});
try{
 for(const [width,height,initialImport=false] of [[320,568],[390,844],[440,956],[844,390],[390,844,true],[1440,1000]].filter(([width])=>!process.env.TOOLBAR_WIDTH||width===Number(process.env.TOOLBAR_WIDTH))){
  const mobile=width!==1440,page=await browser.newPage({viewport:width===844?{width:390,height:844}:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},initialImport||!mobile?imported:normal);
  try{
   await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   const editor=page.locator('.etudeEditor');await editor.waitFor();
   if(width===844){await page.setViewportSize({width,height});await page.waitForTimeout(300);}
   if(mobile)await page.waitForFunction(()=>document.querySelector('.etudeEditorPreview')?.style.getPropertyValue('--mobile-score-height'));
   const before=await geometry(page),bar=editor.locator('.etudeMeasureLayoutBar');
   if(initialImport)assert(Math.abs(before.canvas.height-results.find(r=>r.width===width).before)<=1,JSON.stringify(before));
   if(mobile){
    assert(before.canvas.height>=180,JSON.stringify(before));
    assert(before.bar.x+before.bar.width<=width&&before.notation.x+before.notation.width<=width,JSON.stringify(before));
    const arrangement=bar.getByRole('button',{name:'기타 편곡',exact:true}),edit=bar.getByRole('button',{name:'편집 ▾',exact:true});
    assert.equal(await editor.locator('.mobileNotationTools').getByRole('button',{name:'기타 편곡',exact:true}).count(),0);
    await arrangement.click();await page.getByRole('dialog',{name:'기타 편곡',exact:true}).getByRole('button',{name:'편곡 닫기',exact:true}).click();
    const a=await arrangement.boundingBox(),b=await edit.boundingBox();assert(a.x<b.x&&Math.abs(a.y-b.y)<1);
    await edit.click();await page.getByRole('button',{name:'편집 설정 닫기',exact:true}).click();
   }
   if(mobile&&!initialImport)await editor.locator('input[type=file][accept*="json"]').setInputFiles({name:'imported-toolbar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
   const reviewButton=editor.getByRole('button',{name:'악보 확인',exact:true});
   if(mobile){
    await reviewButton.waitFor();
    const loaded=await geometry(page);assert(Math.abs(loaded.canvas.height-before.canvas.height)<=1,JSON.stringify({before,loaded}));assert(Math.abs(loaded.bar.height-before.bar.height)<=1);
    assert(Math.abs(loaded.notation.height-before.notation.height)<=1);
    assert.equal(await editor.locator(':scope > .mobilePdfTabReview,:scope > .mobileImportPlaybackNotice,:scope > .mobileStaffPitchRepair,:scope > .pdfTabCoverageNotice').count(),0);
    await reviewButton.click();const review=page.getByRole('dialog',{name:'악보 확인',exact:true});await review.waitFor();
    await page.screenshot({path:`${out}/${width}-review.png`});
    assert(await review.locator('.pdfTabCoverageNotice').count()>0);assert(await review.locator('.mobileStaffPitchRepair').isVisible());
    await review.getByRole('button',{name:'다음 확인 위치',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.mobileReviewQuick')?.textContent.includes('1마디'));
    await review.getByRole('button',{name:'다음 확인 위치',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.mobileReviewQuick')?.textContent.includes('3마디'));
    assert.match(await review.locator('.mobileReviewQuick').innerText(),/3마디/);
    assert(Math.abs((await geometry(page)).canvas.height-before.canvas.height)<=1);
    await review.getByRole('button',{name:'닫기',exact:true}).click();
    await reviewButton.click();await review.waitFor();await page.keyboard.press('Escape');await review.waitFor({state:'detached'});
    await editor.evaluate(e=>{e.scrollTop=e.scrollHeight;});
    const audio=await editor.locator('.editorAudioDock').boundingBox();assert(audio.y+audio.height<=height+1,JSON.stringify(audio));
    await bar.evaluate(e=>{e.scrollLeft=0;});await editor.evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:`${out}/${width}-imported.png`});
    results.push({width,height,initialImport,before:before.canvas.height,after:loaded.canvas.height,toolbarHeight:loaded.bar.height,horizontalScroll:loaded.barScroll>loaded.barWidth,reviewWorks:true,errors});
   }else{
    assert.equal(await reviewButton.count(),0);assert(await editor.locator('.desktopSourceReview').isVisible());assert(await editor.locator(':scope > .etudePaperHeading').isVisible());
    results.push({width,desktopPreserved:true,errors});await page.screenshot({path:`${out}/desktop.png`});
   }
   assert.deepEqual(errors,[]);console.log(JSON.stringify(results.at(-1)));
  }catch(e){await page.screenshot({path:`${out}/${width}-error.png`});console.error((await page.locator('body').innerText()).slice(-3000));throw e;}
  finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${out}/verification${process.env.TOOLBAR_WIDTH?`-${process.env.TOOLBAR_WIDTH}`:''}.json`,JSON.stringify(results,null,2));}
