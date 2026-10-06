import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const origin=process.env.ARPEGGIO_ORIGIN??'http://127.0.0.1:5174';
const output=process.env.CHORD_ENTRY_OUTPUT??'artifacts/chord-sequential-entry';
await mkdir(output,{recursive:true});
const source={...createBlankDocument(),title:'코드 이어 입력 검증',measures:['C',null,'Am','D7'].map(harmony=>({...blankMeasure(),harmony}))};
source.measures[2].harmonyChanges=[{onset:0,name:'Am'},{onset:960,name:'F'}];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.addInitScript(d=>{
   localStorage.setItem('language','ko');
   localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));
   localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));
  },source);
  const save=async()=>{
   await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();
   await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();
   await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
   return (await readBrowserScoreLibrary(page)).records[source.id].document;
  };
  try{
   await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});
   await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
   else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
   await page.locator('.etudeEditor').waitFor();
   const baseline=await save();
   await page.locator('[data-mobile-tool-toggle="picking"]').click();
   const panel=page.locator('#mobile-tool-picking');
   await panel.getByRole('button',{name:'아르페지오',exact:true}).click();
   await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('range');
   await panel.getByLabel('아르페지오 끝 마디',{exact:true}).selectOption('1');
   assert.match(await panel.getByRole('button',{name:'2마디 코드 입력·수정',exact:true}).innerText(),/C.*앞 코드 유지/s);
   await panel.getByRole('button',{name:'다음 코드 입력 · 3마디 →',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'코드명 선택',exact:true});
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'Am');
   await dialog.getByRole('tab',{name:'장조',exact:true}).click();
   await dialog.getByRole('button',{name:'G',exact:true}).click();
   await dialog.getByRole('button',{name:'입력 후 다음 마디',exact:true}).click();
   assert.equal(await dialog.locator('#chord-name-bar').inputValue(),'3');
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'D7');
   assert.match(await dialog.locator('.chordNameNotice').innerText(),/3마디에 G 입력 완료/);
   assert(await dialog.getByRole('button',{name:'입력 후 다음 마디',exact:true}).isDisabled());
   for(const width of mobile?[390,320]:[1440,1024]){
    await page.setViewportSize({width,height:mobile?844:1000});
    assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    for(const button of await dialog.locator('.chordNameActions button').all()){
     const box=await button.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
    }
    await page.screenshot({path:`${output}/dialog-${width}.png`});
   }
   await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});
   await dialog.getByRole('button',{name:'C',exact:true}).click();
   await dialog.getByRole('button',{name:'기본',exact:true}).click();
   await dialog.getByRole('button',{name:'입력 완료',exact:true}).click();
   await dialog.waitFor({state:'detached'});
   assert.equal(await panel.getByLabel('아르페지오 끝 마디',{exact:true}).inputValue(),'1');
   let stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.harmony),['C',null,'G','C']);
   assert.deepEqual(stored.measures[2].harmonyChanges,[{name:'G',onset:0},{name:'F',onset:960}]);
   assert.deepEqual(stored.measures.map(m=>m.events),baseline.measures.map(m=>m.events));
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();
   assert.equal((await save()).measures[3].harmony,'D7');
   await page.getByRole('button',{name:'다시 실행',exact:true}).click();
   assert.equal((await save()).measures[3].harmony,'C');
   await panel.getByLabel('아르페지오 적용 범위',{exact:true}).selectOption('all');
   await panel.getByRole('button',{name:'1마디 코드 입력·수정',exact:true}).click();
   await dialog.getByRole('button',{name:'G',exact:true}).click();
   await dialog.getByRole('button',{name:'입력 후 다음 마디',exact:true}).click();
   assert.equal(await dialog.locator('#chord-name-bar').inputValue(),'1');
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'G');
   await dialog.locator('#chord-name-bar').selectOption('2');
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'G');
   await dialog.getByLabel('코드 시작 위치',{exact:true}).selectOption('480');
   await dialog.locator('#chord-name-bar').selectOption('0');
   await dialog.locator('#chord-name-bar').selectOption('2');
   assert.equal(await dialog.getByLabel('코드 시작 위치',{exact:true}).inputValue(),'0');
   await dialog.getByRole('button',{name:'코드명 선택 닫기',exact:true}).click();
   await panel.getByRole('button',{name:'2마디 코드 입력·수정',exact:true}).click();
   assert.equal(await dialog.locator('.chordNamePreview').innerText(),'G');
   await dialog.getByRole('button',{name:'코드명 선택 닫기',exact:true}).click();
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();
   await panel.getByRole('button',{name:'반주 패턴 적용',exact:true}).click();
   stored=await save();
   assert.deepEqual(stored.measures.map(m=>m.events[0].notes[0].string),[5,5,6,5]);
   assert(stored.measures.every(m=>m.events.length===8));
   await panel.locator('.arpeggioBarChords').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${output}/panel-${mobile?'mobile':'desktop'}.png`});
   assert.equal(await panel.locator(mobile?'.desktopArpeggioControls':'.mobileArpeggioControls').count(),0);
   assert.deepEqual(errors,[]);
   results.push({mobile,continuousInput:true,existingChordLoaded:true,inheritedChordVisible:true,unaffectedNotesPreserved:true,undoRedo:true,patternApplied:true,errors});
   console.log(JSON.stringify(results.at(-1)));
  }catch(error){await page.screenshot({path:`${output}/error-${mobile?'mobile':'desktop'}.png`});console.error((await page.locator('body').innerText()).slice(-4500));throw error;}
  finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${output}/verification.json`,JSON.stringify(results,null,2));}
