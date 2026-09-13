import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const output='artifacts/etude-editor';await mkdir(output,{recursive:true});const report=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.ETUDE_BASE_URL||'http://127.0.0.1:5173/')+'#etudes');
  const firstFret=()=>page.locator('.etudeSheet .vf-tabnote').first().locator('text').first().textContent();
  await page.locator('.etudeNotation svg').waitFor({timeout:60000});assert.equal(await firstFret(),'2');
  const open=async()=>{await page.getByRole('button',{name:'악보 편집',exact:true}).click();await page.getByRole('dialog',{name:'악보 편집',exact:true}).waitFor();};
  const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true});
  await open();
  await dialog.getByLabel('음 1 프렛',{exact:true}).fill('3');
  await dialog.getByLabel('음표 길이',{exact:true}).selectOption('8');
  assert.ok(await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).isDisabled());
  assert.ok((await dialog.locator('[role=alert]').textContent()).includes('박자 합계'));
  await dialog.getByRole('button',{name:'음표 복제',exact:true}).click();
  assert.ok(await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).isEnabled());
  await dialog.getByRole('button',{name:'음표 삭제',exact:true}).click();
  await dialog.getByLabel('음표 길이',{exact:true}).selectOption('4');
  await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();
  await dialog.waitFor({state:'hidden'});assert.equal(await firstFret(),'3');
  await page.reload();await page.locator('.etudeNotation svg').waitFor();assert.equal(await firstFret(),'3');
  await open();
  const downloadPromise=page.waitForEvent('download');await dialog.getByRole('button',{name:'파일 내려받기',exact:true}).click();
  const download=await downloadPromise;const path=`${output}/${mobile?'mobile':'desktop'}.fretiva.json`;await download.saveAs(path);
  const document=JSON.parse(await readFile(path,'utf8'));assert.equal(document.measures[0].events[0].notes[0].fret,3);
  document.measures[0].events[0].notes[0].fret=5;document.bpm=63;
  await dialog.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'edit.fretiva.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
  if(mobile)await dialog.getByRole('button',{name:'미리보기',exact:true}).click();
  await dialog.locator('.etudeEditorPreview svg').waitFor();
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-preview.png`,fullPage:true});
  assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal(await firstFret(),'5');assert.equal(await page.getByLabel('연습 BPM',{exact:true}).inputValue(),'63');
  await page.reload();await page.locator('.etudeNotation svg').waitFor();assert.equal(await firstFret(),'5');assert.equal(await page.getByLabel('연습 BPM',{exact:true}).inputValue(),'63');
  await open();await dialog.getByRole('button',{name:'기본 악보 복원',exact:true}).click();await dialog.getByRole('button',{name:'취소 · 닫기',exact:true}).click();
  assert.equal(await firstFret(),'2');
  await page.reload();await page.locator('.etudeNotation svg').waitFor();assert.equal(await firstFret(),'2');
  await page.getByLabel('연습 유형',{exact:true}).selectOption('아르페지오');
  await page.locator('.etudeChordDiagram').first().waitFor();
  const box=page.locator('.etudeSheet .etudeChordDiagram').first();
  assert.deepEqual(await box.locator('.etudeChordStringLabel').allTextContents(),['1','2','3','4','5','6']);
  await open();await dialog.locator('.etudeEditorChord summary').click();
  await dialog.getByLabel('코드 1번줄 프렛',{exact:true}).fill('3');
  if(mobile){await page.setViewportSize({width:320,height:740});await page.screenshot({path:`${output}/mobile-320-controls.png`,fullPage:true});assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1));}
  await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal(await box.locator('circle[data-string="1"]').getAttribute('data-fret'),'3');
  const svg=page.locator('.etudeSheet .etudeNotation svg');await svg.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-horizontal-chords.png`});
  await open();await dialog.getByRole('button',{name:'기본 악보 복원',exact:true}).click();await dialog.getByRole('button',{name:'취소 · 닫기',exact:true}).click();
  await page.getByRole('button',{name:'중급',exact:true}).click();await page.getByRole('button',{name:'다음 ›',exact:true}).click();
  await page.locator('.etudeNotation svg[aria-label*="Bmaj7"]').waitFor();
  await page.locator('.etudeSheet').screenshot({path:`${output}/${mobile?'mobile':'desktop'}-moving-chords.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  if(!process.env.ETUDE_BASE_URL)await page.evaluate(async mobile=>{
   const {ETUDES}=await import('/src/etudes/catalog.js');
   const {toScoreDocument,compileScoreDocument}=await import('/src/etudes/scoreDocument.js');
   const {drawScore,renderCachedScore}=await import('/src/etudes/Score.jsx');
   const base=ETUDES.find(e=>e.templateId==='triad-start'),document=toScoreDocument(base);
   document.measures[0].events[0].notes=[{string:1,fret:24}];
   const result=compileScoreDocument(document,base);if(!result.score)throw Error(result.errors.join(' / '));
   const holder=window.document.createElement('div');window.document.body.append(holder);
   try{
    for(const options of [{mobile},{mobile,enlarged:true},{mobile,enlarged:true,landscape:true}]){
     drawScore(holder,result.score,options);const svg=holder.querySelector('svg'),box=svg.getBBox();
     if(box.y<0||box.y+box.height>svg.viewBox.baseVal.height)throw Error('High edited note clipped');
    }
    renderCachedScore(holder,base,{mobile});
    if(renderCachedScore(holder,result.score,{mobile})!=='engraved')throw Error('Edited data reused stale SVG');
    if(renderCachedScore(holder,result.score,{mobile})!=='cached')throw Error('Edited SVG cache unavailable');
   }finally{holder.remove();}
  },mobile);
  report.push({mobile,errors,saveReloadRestore:true,jsonRoundTrip:true,chordSync:true});await page.close();
 }
 await writeFile(`${output}/verification.json`,JSON.stringify(report,null,2));console.log('PASS: editor note/chord synchronization, beat validation, save/reload/restore, JSON import/export, mobile and desktop.');
}finally{await browser.close()}
