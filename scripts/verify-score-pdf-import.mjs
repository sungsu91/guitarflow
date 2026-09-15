import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const source=await readFile('artifacts/omr-prototype/clean-staff-one-page.pdf');
// >2MB PDF verifies the JSON size limit is not applied to PDF routing.
const pdf={name:'Import-test.PDF',mimeType:'application/pdf',buffer:Buffer.concat([source,Buffer.alloc(2*1024*1024,32)])};
await mkdir('artifacts/score-pdf-import',{recursive:true});
try{for(const mobile of [false,true]){
 const context=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');
 const choose=async button=>{const event=p.waitForEvent('filechooser');await button.click();const picker=await event;assert.match(await picker.element().getAttribute('accept'),/\.pdf/);await picker.setFiles(pdf);};
 await choose(p.getByRole('button',{name:'악보 파일 불러오기',exact:true}));
 await p.getByRole('dialog',{name:'PDF 악보 정보'}).waitFor();await p.getByRole('button',{name:'기기에 저장',exact:true}).click();await p.locator('.pdfPractice').waitFor();assert.equal(await p.getByRole('dialog',{name:'악보 편집',exact:true}).count(),0);
 await p.reload();await p.getByRole('button',{name:'간단 악보 만들기',exact:true}).click();
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true}),surface=p.locator('.etudeEditorCanvas');await surface.focus();await surface.press('2');
 // Hidden input is shared by desktop file menu/footer and mobile file menu.
 await editor.getByLabel('악보 파일 선택',{exact:true}).setInputFiles(pdf);await editor.getByRole('button',{name:'계속 편집',exact:true}).click();
 assert.equal(await p.getByRole('dialog',{name:'확인',exact:true}).count(),0);
 await surface.press('Control+s');
 const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.equal(stored.measures[0].events[0].notes[0].fret,2);
 // Cancelled PDF handoff must not run later when the editor closes normally.
 if(mobile)await editor.getByRole('button',{name:'악보 편집 뒤로',exact:true}).click();else await editor.getByRole('button',{name:'닫기',exact:true}).click();
 assert.equal(await p.getByRole('dialog',{name:'확인',exact:true}).count(),0);
 await p.getByRole('button',{name:'간단 악보 만들기',exact:true}).click();
 const json=await p.evaluate(async()=>{const {createBlankDocument}=await import('/src/etudes/scoreModel.js');const d=createBlankDocument();d.title='JSON routing check';return JSON.stringify(d);});
 await p.getByRole('dialog',{name:'악보 편집',exact:true}).getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'score.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await p.locator('.etudeEditorCanvas').press('Control+s');assert.ok(await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).some(r=>r.document.title==='JSON routing check')));
 await p.getByRole('dialog',{name:'악보 편집',exact:true}).getByLabel('악보 파일 선택',{exact:true}).setInputFiles(pdf);
 await p.getByRole('dialog',{name:'확인',exact:true}).getByRole('button',{name:'확인',exact:true}).click();await p.locator('.pdfPractice').waitFor();
 await p.screenshot({path:`artifacts/score-pdf-import/${mobile?'390':'1440'}.png`});assert.deepEqual(errors,[]);console.log(`${mobile?'390 mobile':'1440 desktop'}: PDF library/editor routing, >2MB PDF, duplicate open, cancelled handoff, JSON import passed`);await context.close();
}}finally{await b.close();}
