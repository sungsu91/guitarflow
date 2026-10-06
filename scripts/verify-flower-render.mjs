import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const out='artifacts/ocr-review-20261005',doc=JSON.parse(await readFile(`${out}/flower-document.json`));doc.title='Flower Dance · 재인식 검증';
const note=doc.measures[4].events[2];assert(note.notes.some(n=>n.string===1&&n.fret===0));assert.equal(note.pdfImport.status,'confirmed');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const width of [1440,390]){
 const mobile=width<600,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(doc=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{document:doc,status:'draft'}}}));},doc);
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.locator('input[type=file][accept*="json"]').setInputFiles({name:'flower.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:doc.title}).click();}
  const bar=page.locator('.etudeEditorCanvas [data-bar-index="4"]');await bar.waitFor();await bar.scrollIntoViewIfNeeded();
  const handle=bar.locator('.etudeNoteHandle[data-event="2"][data-string="1"][data-mode="tab"]');await handle.click();
  const zero=await handle.evaluate(hit=>{
   const h=hit.getBoundingClientRect(),root=hit.getRootNode();
   return [...root.querySelectorAll('text')].filter(t=>t.textContent==='0'&&getComputedStyle(t).visibility!=='hidden').some(t=>{const b=t.getBoundingClientRect();return Math.abs((b.left+b.right-h.left-h.right)/2)<10&&Math.abs((b.top+b.bottom-h.top-h.bottom)/2)<10;});
  });assert(zero,'bar 5 string 1 open string is actually drawn at the selected note');
  const chord=await bar.locator('[data-score-annotation="harmony"]').first().getAttribute('data-harmony-text');assert.equal(chord,'Cmaj7(6)');
  await page.screenshot({path:`${out}/flower-bar5-${width}.png`});assert.deepEqual(errors,[]);results.push({width,bar:5,string:1,fret:0,visible:zero,chord,errors});
 }finally{await context.close();}
}}finally{await browser.close();await writeFile(`${out}/flower-render.json`,JSON.stringify(results,null,2));}console.log(JSON.stringify(results));
