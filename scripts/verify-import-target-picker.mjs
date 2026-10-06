import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const root='artifacts/ocr-instruments-20261005',out=`${root}/picker`,reports=[];await mkdir(out,{recursive:true});
const engine=process.env.IMPORT_UI_WEBKIT?'webkit':'chromium';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}));
try{for(const [width,height,count,theme] of engine==='webkit'?[[390,844,5,'brand']]:[[1440,900,4,'light'],[390,844,5,'light'],[320,568,4,'brand'],[956,440,5,'light']]){
 const mobile=width<600||height<500,doc={...createBlankDocument(),tuning:[64,59,55,50,45,38],capo:2,title:'Original guitar settings'},target=[43,38,33,28,...(count===5?[23]:[])];
 const context=await browser.newContext({viewport:height<500?{width:390,height:844}:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/TypeError|ReferenceError|RangeError|ErrorBoundary/.test(m.text()))errors.push(m.text());});
 try{
  await page.addInitScript(({doc,theme})=>{localStorage.setItem('language','ko');localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{document:doc,status:'draft',updatedAt:new Date().toISOString()}}}));},{doc,theme});
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.locator('input[type=file][accept*="json"]').setInputFiles({name:'original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:doc.title}).click();}
  const openImport=async()=>{if(mobile){await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}else await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();};
  await openImport();const dialog=page.locator('.mobilePdfTabImport,.desktopPdfTabImport'),instrument=dialog.getByRole('combobox',{name:'불러올 악기',exact:true}),tuning=dialog.getByRole('combobox',{name:'불러올 튜닝',exact:true});
  assert.equal(await instrument.inputValue(),'guitar:6');assert.equal(await tuning.inputValue(),'drop-d');
  assert.match(await dialog.locator('.pdfImportTarget').innerText(),/카포 2/);
  await instrument.selectOption(`bass:${count}`);assert.equal(await tuning.inputValue(),count===5?'bass-5':'standard');
  assert.doesNotMatch(await dialog.locator('.pdfImportTarget').innerText(),/카포 2/);
  await tuning.selectOption(count===5?'bass-5-half-down':'half-down');
  assert.match(await dialog.locator('.pdfImportTarget').innerText(),/E♭1.*A♭1.*C♯2.*F♯2/);
  // Cancel is local: opening again must start from the original editor settings.
  await dialog.getByRole('button',{name:'취소',exact:true}).click();await dialog.waitFor({state:'detached'});await openImport();
  assert.equal(await instrument.inputValue(),'guitar:6');assert.equal(await tuning.inputValue(),'drop-d');
  await dialog.getByRole('radio',{name:'TAB → TAB',exact:true}).check();
  const isPdf=!mobile;
  if(isPdf){await instrument.selectOption(`bass:${count}`);await page.screenshot({path:`${out}/${engine}-${width}-selection.png`});await dialog.locator('input[type=file]').first().setInputFiles(`${root}/bass${count}-helvetica.pdf`);}
  else{
   // Changing the target after choosing a photo must retain the selected file.
   await dialog.locator('input[type=file]').first().setInputFiles(`${root}/bass${count}-helvetica.jpg`);
   const analyze=dialog.getByRole('button',{name:'분석하기',exact:true});await analyze.waitFor();await instrument.selectOption(`bass:${count}`);
   await tuning.selectOption(count===5?'bass-5-half-down':'half-down');await tuning.selectOption(count===5?'bass-5':'standard');
   assert.equal(await dialog.locator('.tabPhotoPreview canvas').count(),1);
   if(height<500)await page.setViewportSize({width,height});
   const check=()=>analyze.evaluate(b=>{const r=b.getBoundingClientRect(),d=b.closest('dialog');return {visible:r.top>=0&&r.bottom<=innerHeight,hittable:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b,overflow:d.scrollWidth>d.clientWidth+1};});
   let state=await check();assert(state.visible&&state.hittable&&!state.overflow,JSON.stringify(state));
   await dialog.locator('.mobilePdfTabBody').evaluate(n=>n.scrollTop=n.scrollHeight);state=await check();assert(state.visible&&state.hittable,JSON.stringify(state));
   await dialog.locator('.mobilePdfTabBody').evaluate(n=>n.scrollTop=0);await page.screenshot({path:`${out}/${engine}-${width}-selection.png`});
   if(width===390)await analyze.click();
  }
  if(isPdf||width===390){
   await dialog.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:180000});assert.equal(await instrument.count(),0);
   assert.match(await dialog.locator('.pdfImportTarget').innerText(),new RegExp(`${count}현`));
   await dialog.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await dialog.waitFor({state:'hidden'});
   const discard=page.getByRole('button',{name:'저장하지 않고 불러오기',exact:true});if(await discard.isVisible())await discard.click();
   await dialog.waitFor({state:'detached'});await page.locator('.etudeEditorMeasure svg').first().waitFor({state:'visible'});
   const records=Object.values((await readBrowserScoreLibrary(page)).records),saved=records.map(r=>r.document).find(d=>d.pdfTabImport);
   assert(saved);assert.equal(saved.instrument,'bass');assert.deepEqual(saved.tuning,target);assert.equal(saved.capo,0);assert.equal(saved.measures.length,4);
   assert.equal(saved.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,39);
   const original=records.find(r=>r.document.id===doc.id).document;assert.equal(original.instrument,'guitar');assert.deepEqual(original.tuning,doc.tuning);assert.equal(original.capo,2);
   await page.screenshot({path:`${out}/${engine}-${width}-opened.png`});
  }
  assert.deepEqual(errors,[]);reports.push({engine,width,height,count,theme,input:isPdf?'pdf':'jpg',imported:isPdf||width===390,passed:true});console.log(JSON.stringify(reports.at(-1)));
 }catch(e){await page.screenshot({path:`${out}/${engine}-${width}-failed.png`});console.error(await page.locator('body').innerText());throw e;}finally{await context.close();}
}}finally{await browser.close();await writeFile(`${out}/${engine}.json`,JSON.stringify(reports,null,2));}
