import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174',label=process.argv[2]||'before',selection=process.argv.slice(3),out=`artifacts/pdf-tab-release/${label}`;await mkdir(out,{recursive:true});
const reports=[];
try{for(const id of ['chunk-failure','ocr-network-recovery','resize-complete','resize-busy','small-landscape','double-open','repeat-cancel','coverage'].filter(id=>!selection.length||selection.includes(id))){
 const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
 await p.addInitScript(()=>localStorage.setItem('language','ko'));
 await p.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 await p.getByRole('button',{name:'악보 작업',exact:true}).click();await p.getByRole('menuitem',{name:/제작|만들기/}).click();await p.locator('.etudeEditor').waitFor();
 const entry=async()=>{await p.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await p.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();};
 const dialog=p.locator('.mobilePdfTabImport,.desktopPdfTabImport');let failures=[],details={};
 try{
  if(id==='chunk-failure'||id==='ocr-network-recovery'){
   await p.locator('[data-score-input]').press('7');
   await context.route('**/src/pdf/tab-import/MobilePdfTabImport.jsx*',r=>r.abort());
   await context.route('**/src/pdf/tab-import/importPdfTab.js*',r=>r.abort());
   if(id==='ocr-network-recovery')await context.route('**/tab-ocr/core/**',r=>r.fulfill({status:404,body:'not found'}));
   await entry();await p.waitForTimeout(1000);
   if(await dialog.count()){
    await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles(id==='ocr-network-recovery'?'artifacts/pdf-tab-corpus/helvetica-110dpi.pdf':'artifacts/pdf-tab-corpus/helvetica-native.pdf');
    await Promise.race([dialog.getByRole('alert').waitFor(),dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor()]);
    if(await dialog.getByRole('alert').count())details.alert=await dialog.getByRole('alert').innerText();
    else details.codeAlreadyReady=true;
    await context.unroute('**/src/pdf/tab-import/MobilePdfTabImport.jsx*');await context.unroute('**/src/pdf/tab-import/importPdfTab.js*');
    if(id==='ocr-network-recovery')await context.unroute('**/tab-ocr/core/**');
    await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles(id==='ocr-network-recovery'?'artifacts/pdf-tab-corpus/helvetica-110dpi.pdf':'artifacts/pdf-tab-corpus/helvetica-native.pdf');
    try{await dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor({timeout:15000});details.recovered=true;}catch{failures.push('import cannot recover after connectivity is restored');}
   }
   if(!await p.locator('.etudeEditor[open]').count())failures.push('loading failure removes editor and unsaved work');
   else {await dialog.getByRole('button',{name:'취소',exact:true}).click();await p.getByRole('button',{name:'악보 편집기에서 뒤로',exact:true}).click().catch(()=>p.locator('.mobileScoreHeader>button').first().click());details.unsavedPrompt=await p.locator('.etudeEditorClosePrompt').count();if(!details.unsavedPrompt)failures.push('unsaved score was lost');}
  }else{
   await entry();await dialog.waitFor();
   if(id==='small-landscape'){
    await p.setViewportSize({width:568,height:320});await p.waitForTimeout(300);const box=await dialog.boundingBox();details.box=box;
    if(!box||box.y<0||box.x<0||box.x+box.width>568||box.y+box.height>321)failures.push('dialog is outside landscape viewport');
    await dialog.getByRole('button',{name:'취소',exact:true}).click();
   }else if(id==='coverage'){
    await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-release/fixtures/blank-middle.pdf');
    await dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor();
    details.notice=await dialog.locator('.pdfTabCoverageNotice').innerText();if(!details.notice.includes('2.'))failures.push('missing page number not displayed');
    await dialog.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await p.locator('.mobilePdfTabReview').waitFor();
    if(!await p.locator('.etudeEditor>.pdfTabCoverageNotice').isVisible())failures.push('coverage notice is hidden in editor');
   }else if(id==='repeat-cancel'){
    for(let i=0;i<8;i++){
     await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-corpus/helvetica-110dpi.pdf');
     await dialog.getByRole('button',{name:'분석 취소',exact:true}).click();await entry();
    }
    await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-corpus/helvetica-native.pdf');await dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor({timeout:90000});details.retries=8;
   }else{
    await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles(id==='resize-busy'?'artifacts/pdf-tab-release/fixtures/pages-20.pdf':'artifacts/pdf-tab-corpus/helvetica-native.pdf');
    if(id!=='resize-busy')await dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor({timeout:90000});
    if(id.startsWith('resize')){
     await p.setViewportSize({width:1440,height:1000});await p.waitForTimeout(800);
     try{await dialog.getByRole('heading',{name:'TAB 분석 완료'}).waitFor({timeout:12000});}catch{failures.push('analysis lost after switching layout');}
     details.dialogOpen=await dialog.evaluateAll(els=>els.map(el=>el.open));
     if(!details.dialogOpen.some(Boolean))failures.push('import dialog is no longer modal');
    }else{
     await dialog.getByRole('button',{name:'제작실에서 열기',exact:true}).evaluate(el=>{el.click();el.click();el.click();});await p.locator('.mobilePdfTabReview').waitFor();
     details.records=await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).length);if(details.records!==1)failures.push('multiple drafts created');
    }
   }
  }
 }catch(error){failures.push(error.message);}
 if(errors.length)failures.push('unhandled page error');
 await p.screenshot({path:`${out}/ui-${id}.png`});const report={id,passed:!failures.length,failures,details,errors};reports.push(report);console.log(JSON.stringify(report));await writeFile(`${out}/ui.json`,JSON.stringify(reports,null,2));await context.close();
}}finally{await browser.close();}
