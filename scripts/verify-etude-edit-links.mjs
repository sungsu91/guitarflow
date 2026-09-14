import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5173/#etudes');await page.locator('.etudeLibrary summary').click();await page.getByRole('button',{name:'빈 악보 만들기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true}),canvas=dialog.getByRole('group',{name:'악보 키보드 입력'}),save=()=>dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();
 const document=()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 const staff=canvas.locator('[data-mode="staff"][data-event="0"]');await staff.waitFor();
 const point=await staff.evaluate(el=>{const p=el.ownerSVGElement.createSVGPoint();p.x=Number(el.getAttribute('x'))+10;p.y=Number(el.dataset.staffBottom);const screen=p.matrixTransform(el.getScreenCTM());return {x:screen.x,y:screen.y};});
 await page.mouse.click(point.x,point.y);await save();assert.equal((await document()).measures[0].events[0].rest,true,'staff click only selects');
 await canvas.focus();await page.keyboard.press('4');await save();let d=await document();assert.deepEqual(d.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[4,2]]);
 await canvas.focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowDown');await save();d=await document();assert.deepEqual(d.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[5,7]]);
 const baseline=structuredClone(d);await page.setViewportSize({width:390,height:844});await dialog.getByLabel('편집 악보 확대').selectOption('150');await save();assert.deepEqual(await document(),baseline,'viewport/zoom preserves music');
 await dialog.getByRole('button',{name:'닫기',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(async()=>{const {createBlankDocument,blankMeasure,patchEvent}=await import('/src/etudes/scoreModel.js');const {enterFret}=await import('/src/etudes/editorCommands.js');const {saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');let d=createBlankDocument();d.title='Cross bar tie';d.measures.push(blankMeasure());d=enterFret(d,{bar:0,event:3,string:2},5);d=enterFret(d,{bar:1,event:0,string:2},5);d=patchEvent(d,0,3,{tieTo:d.measures[1].events[0].id});saveLibraryDocument(localStorage,d);});
 await page.reload();await page.locator('.etudeLibrary summary').click();await page.locator('.etudeLibrary div').filter({hasText:'Cross bar tie'}).getByRole('button',{name:'열기',exact:true}).click();await canvas.locator('svg').first().waitFor();
 assert.ok(await canvas.locator('[data-bar-index="0"] .vf-stavetie').count());assert.ok(await canvas.locator('[data-bar-index="1"] .vf-stavetie').count(),'incoming tie is visible in next editable bar');
 assert.equal(await dialog.getByRole('button',{name:'악보 음정·리듬 듣기',exact:true}).isDisabled(),false);assert.deepEqual(errors,[]);
 await writeFile('artifacts/etude-input/links-verification.json',JSON.stringify({staffClickOnlySelects:true,staffToTab:true,samePitchMove:true,newScoreSaved:true,viewportZoomPreserved:true,crossBarTieBothSides:true,errors},null,2));
}finally{await browser.close();}
