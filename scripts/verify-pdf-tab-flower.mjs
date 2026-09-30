import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push({url:r.url(),method:r.method()}));
await mkdir('artifacts/pdf-tab-import',{recursive:true});
const file=process.argv[2]||'C:/Users/User/Downloads/Flower Dance.pdf';
const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2'))?.records??{});
const save=async()=>{await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();};
try{
 await p.goto('http://127.0.0.1:5174/#etudes',{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});await p.getByRole('button',{name:'제작',exact:true}).click();
 const surface=p.locator('[data-score-input]');await surface.focus();await surface.press('3');await save();
 const original=Object.values(await read())[0].document;
 await surface.focus();await surface.press('ArrowRight');await surface.press('5');
 await p.getByRole('button',{name:'PDF에서 TAB 초안 생성',exact:true}).click();await p.getByLabel('TAB 분석용 PDF 선택',{exact:true}).setInputFiles(file);await p.getByRole('button',{name:'분석 취소',exact:true}).click();assert.equal(await p.locator('.desktopPdfTabImport').count(),0);assert.deepEqual(Object.values(await read())[0].document,original);
 await p.getByRole('button',{name:'PDF에서 TAB 초안 생성',exact:true}).click();await p.getByLabel('TAB 분석용 PDF 선택',{exact:true}).setInputFiles(file);
 await p.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:240000});
 await p.screenshot({path:'artifacts/pdf-tab-import/flower-summary.png'});
 const summaryText=await p.getByRole('region',{name:'TAB 분석 결과',exact:true}).innerText();
 assert.equal(await p.locator('.desktopPdfTabImport').getByRole('checkbox').count(),0);assert.equal(await p.getByLabel('TAB 검출 디버그 오버레이').count(),0);
 await p.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await p.getByRole('button',{name:'저장 후 불러오기',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();

 await p.locator('.pdfTabReviewBar').waitFor();await p.locator('.pdfTabUnresolvedMarker').first().waitFor();
 const records=await read(),imported=Object.values(records).find(r=>r.document.pdfTabImport).document;
 await writeFile('artifacts/pdf-tab-import/flower-document.json',JSON.stringify(imported,null,2));
 assert.notEqual(imported.id,original.id);assert.equal(imported.measures.length,63);assert.equal(records[original.id].document.measures[0].events.flatMap(e=>e.notes).length,2);
 assert.equal(imported.pdfTabImport.summary.pages,3);assert.equal(imported.pdfTabImport.summary.staffs,17);
 await p.getByRole('button',{name:'다음 미확정',exact:true}).click();await save();
 const normalized=await p.evaluate(async doc=>(await import('/src/etudes/scoreTuning.js')).normalizePitches(doc),imported);
 const stored=(await read())[imported.id].document;assert.ok(JSON.stringify(stored.measures)===JSON.stringify(normalized.measures),'Saved measures retain source metadata after pitch normalization');
 await p.screenshot({path:'artifacts/pdf-tab-import/flower-editor.png'});
 await p.getByRole('button',{name:'닫기',exact:true}).click();
 await p.getByRole('button',{name:'제작',exact:true}).click();await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:imported.title}).click();await p.locator('.pdfTabReviewBar').waitFor();await save();assert.ok(JSON.stringify((await read())[imported.id].document.measures)===JSON.stringify(stored.measures),'Reopened measures retain source metadata');
 assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(r=>/^https?:/.test(r.url)&&!r.url.startsWith('http://127.0.0.1:5174')),[]);assert.deepEqual(requests.filter(r=>!['GET','HEAD'].includes(r.method)),[]);
 const report={pdfLoading:true,summary:imported.pdfTabImport.summary,editorMeasures:imported.measures.length,summaryText,cancelPreservesExisting:true,unsavedWorkSavedBeforeSwitch:true,newId:true,created:true,reopened:true,metadataRoundtrip:true,errors,network:{externalRequests:0,uploads:0},events:imported.measures.flatMap(m=>m.events).length};
 await writeFile('artifacts/pdf-tab-import/flower-verification.json',JSON.stringify(report,null,2));await writeFile('artifacts/pdf-tab-import/flower-document.json',JSON.stringify(imported,null,2));console.log(report);
}catch(error){await p.screenshot({path:'artifacts/pdf-tab-import/flower-failure.png'});console.log('errors',errors);throw error;}finally{await b.close();}
