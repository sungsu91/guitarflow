import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const originalHash=createHash('sha256').update(readFileSync('C:/Users/User/Downloads/Flower Dance.pdf')).digest('hex');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/pdf-auto-measures';await mkdir(out,{recursive:true});
const reports=[];
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});const p=await context.newPage(),errors=[];globalThis.qaPage=p;p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);
 await p.goto('http://127.0.0.1:5174/#etudes');await p.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles('C:/Users/User/Downloads/Flower Dance.pdf');
 const dialog=p.getByRole('dialog',{name:'PDF 악보 정보'});await dialog.waitFor();await dialog.getByRole('button',{name:'기기에 저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const records=()=>p.evaluate(async()=> (await import('/src/pdf/pdfLibrary.js')).listPdfs());const r=(await records())[0];
 await p.getByRole('button',{name:'마디 자동 인식',exact:true}).waitFor();
 await p.getByRole('button',{name:'마디 자동 인식',exact:true}).click();await p.getByRole('button',{name:'적용 후 수정',exact:true}).waitFor({timeout:90000});
 assert.equal((await records())[0].barMap.length,0);assert.match(await p.locator('.pdfAutoMeasures').innerText(),/마디: 63/);
 await p.getByRole('checkbox',{name:'Detection debug'}).check();
 for(let n=1;n<=3;n++){await p.evaluate(async n=>{const v=await import('/src/pdf/pdfLibrary.js');const r=(await v.listPdfs())[0];},n);
 if(n>1){if(mobile){await p.locator('.pdfPracticeDock').getByRole('button',{name:'다음 PDF 페이지',exact:true}).click();}else{await p.getByRole('button',{name:'다음 PDF 페이지',exact:true}).click();}}
 await p.waitForFunction(n=>document.querySelector('.pdfCanvas')?.dataset.page===String(n)&&document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false',n);await p.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-preview-${n}.png`});}
 await p.locator('.pdfAutoMeasures').getByRole('button',{name:'취소',exact:true}).click();assert.equal((await records())[0].barMap.length,0);
 await p.getByRole('button',{name:'마디 자동 인식',exact:true}).click();await p.getByRole('button',{name:'적용 후 수정',exact:true}).waitFor();await p.getByRole('button',{name:'적용 후 수정',exact:true}).click();
 await p.waitForFunction(async()=>{const r=(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0];return r.barMap.length===63;});
 const applied=(await records())[0];assert.deepEqual(applied.barMap.map(b=>b.number),Array.from({length:63},(_,i)=>i+1));
 console.log('applied',mobile);
 await p.getByRole('button',{name:'PDF 편집 실행 취소',exact:true}).click();await p.waitForFunction(async()=>!(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap.length);
 await p.getByRole('button',{name:'PDF 편집 다시 실행',exact:true}).click();await p.waitForFunction(async()=>(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap.length===63);

 await p.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-edit.png`});
 if(!mobile){
  await p.waitForFunction(()=>document.querySelector('.pdfCanvas')?.dataset.page==='1'&&document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false');
  const first=p.locator('[data-pdf-row="1"]');await first.click();const handle=p.locator('.pdfRowResize'),rect=await handle.boundingBox();
  await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();await p.mouse.move(rect.x+rect.width/2+10,rect.y+rect.height/2+5,{steps:5});await p.mouse.up();
  await p.waitForFunction(async prior=>(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap[0].width>prior,applied.barMap[0].width);assert.deepEqual((await records())[0].barMap[1],applied.barMap[1]);
  await p.getByRole('button',{name:'PDF 편집 실행 취소',exact:true}).click();await p.waitForFunction(async width=>(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap[0].width===width,applied.barMap[0].width);
  await first.click();await p.locator('.pdfBarDelete').click();await p.waitForFunction(async()=>(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap.length===62);await p.getByRole('button',{name:'PDF 편집 실행 취소',exact:true}).click();await p.waitForFunction(async()=>(await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0].barMap.length===63);
 }

 if(!mobile){await p.locator('.pdfMappingQuick').click();await p.getByLabel('PDF 확대',{exact:true}).selectOption('150');await p.waitForTimeout(500);const geometry=await p.locator('[data-pdf-row="1"]').evaluate(el=>{const r=el.getBoundingClientRect(),paper=el.closest('.pdfPaper').getBoundingClientRect();return {x:(r.x-paper.x)/paper.width,y:(r.y-paper.y)/paper.height,w:r.width/paper.width,h:r.height/paper.height};});for(const [k,v] of Object.entries({x:applied.barMap[0].x,y:applied.barMap[0].y,w:applied.barMap[0].width,h:applied.barMap[0].height}))assert.ok(Math.abs(geometry[k]-v)<.001);
 await p.getByLabel('PDF BPM',{exact:true}).fill('240');await p.locator('summary').filter({hasText:'마디 위치 · 반복 연습'}).click();await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('20');
 await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(1300);await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();assert.equal((await records())[0].lastPage,2);await p.screenshot({path:`${out}/desktop-page-transition.png`});
 await p.getByRole('button',{name:'‹ 이전 마디',exact:true}).click();assert.equal((await records())[0].lastPage,1);
 await p.getByRole('button',{name:'다음 마디 ›',exact:true}).click();assert.equal((await records())[0].lastPage,2);
 await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('43');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(1300);await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();assert.equal((await records())[0].lastPage,3);
 await p.getByLabel('구간 반복',{exact:true}).check();await p.getByLabel('시작 순번',{exact:true}).fill('43');await p.getByLabel('끝 순번',{exact:true}).fill('44');await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('43');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.pdfPlayhead')?.dataset.bar==='44');await p.waitForFunction(()=>document.querySelector('.pdfPlayhead')?.dataset.bar==='43');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.getByLabel('구간 반복',{exact:true}).uncheck();
 await p.getByLabel('PDF 연속 스크롤',{exact:true}).check();await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('20');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(1300);await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();assert.equal((await records())[0].lastPage,2);const visible=await p.locator('[data-pdf-row="21"]').evaluate(el=>{const r=el.getBoundingClientRect(),v=el.closest('.pdfContinuous').getBoundingClientRect();return r.top>=v.top&&r.bottom<=v.bottom;});assert.equal(visible,true);
 await p.getByLabel('PDF 연속 스크롤',{exact:true}).uncheck();await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('1');await p.getByLabel('PDF BPM',{exact:true}).fill('60');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(2200);assert.equal(await p.locator('.pdfPlayhead').getAttribute('data-bar'),'1');await p.waitForTimeout(2100);assert.equal(await p.locator('.pdfPlayhead').getAttribute('data-bar'),'2');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();
 await p.getByLabel('PDF 박자',{exact:true}).selectOption('3/4');assert.ok((await records())[0].barMap.every(b=>b.beats===3));await p.getByLabel('PDF BPM',{exact:true}).fill('240');await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('1');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(950);assert.equal(await p.locator('.pdfPlayhead').getAttribute('data-bar'),'2');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();
 await p.getByLabel('PDF 박자',{exact:true}).selectOption('6/8');assert.ok((await records())[0].barMap.every(b=>b.beats===6));await p.getByLabel('PDF 선택 마디',{exact:true}).selectOption('1');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();await p.waitForTimeout(950);assert.equal(await p.locator('.pdfPlayhead').getAttribute('data-bar'),'2');await p.getByRole('button',{name:'PDF 연습 시작 정지',exact:true}).click();
 const prior=(await records())[0];await p.getByRole('button',{name:'마디 자동 인식',exact:true}).click();await p.getByRole('button',{name:'적용 후 수정',exact:true}).waitFor();assert.deepEqual((await records())[0].barMap,prior.barMap);await p.locator('.pdfAutoMeasures').getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual((await records())[0].barMap,prior.barMap);
 const backup=await p.evaluate(async()=>{const lib=await import('/src/pdf/pdfLibrary.js'),r=(await lib.listPdfs())[0],blob=await lib.getPdf(r.id),entries=await lib.readBackup(lib.exportPdfPractice(r,blob));return {sameBytes:await entries[0].pdfBlob.arrayBuffer().then(async b=>JSON.stringify([...new Uint8Array(b)])===JSON.stringify([...new Uint8Array(await blob.arrayBuffer())])),sameMap:JSON.stringify(entries[0].record.barMap)===JSON.stringify(r.barMap)};});assert.deepEqual(backup,{sameBytes:true,sameMap:true});
 const originalUnchanged=await p.evaluate(async originalHash=>{const lib=await import('/src/pdf/pdfLibrary.js'),r=(await lib.listPdfs())[0],blob=await lib.getPdf(r.id);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('')===originalHash;},originalHash);assert.equal(originalUnchanged,true);
 const savedMap=(await records())[0].barMap;await p.reload();await p.getByRole('button',{name:'마디 자동 인식',exact:true}).waitFor();assert.deepEqual((await records())[0].barMap,savedMap);

 }

 if(mobile){
 await p.getByRole('button',{name:'PDF 간단 편집',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.pdfCanvas')?.dataset.page==='1'&&document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false');
 const baseWidth=(await p.locator('.pdfPaper').boundingBox()).width,cdp=await context.newCDPSession(p),touches=d=>[{x:195-d,y:250,id:1},{x:195+d,y:250,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(45)});for(let d=50;d<=80;d+=5)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(d)});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(700);assert.ok((await p.locator('.pdfPaper').boundingBox()).width>baseWidth*1.5);
 const geometry=await p.locator('[data-pdf-row="1"]').evaluate(el=>{const r=el.getBoundingClientRect(),paper=el.closest('.pdfPaper').getBoundingClientRect();return {x:(r.x-paper.x)/paper.width,y:(r.y-paper.y)/paper.height,w:r.width/paper.width,h:r.height/paper.height};});for(const [k,v] of Object.entries({x:applied.barMap[0].x,y:applied.barMap[0].y,w:applied.barMap[0].width,h:applied.barMap[0].height}))assert.ok(Math.abs(geometry[k]-v)<.001);await p.screenshot({path:out+'/mobile-pinch.png'});
 }
 reports.push({mobile,preview:true,cancelPreserves:true,apply:true,undoRedo:true,...(!mobile?{zoom:true,manualResizeDelete:true,reopen:true,originalHashUnchanged:true,nextPrevious:true,pageTransitions:["20→21","43→44"],continuousFollow:true,bpm60:true,meter3:true,meter6:true,loop:true,existingMappingPreserved:true,backupOriginalBytes:true}:{pinchZoom:true}),summary:{pages:3,systems:17,measures:63},errors});assert.deepEqual(errors,[]);await context.close();
}}catch(e){if(globalThis.qaPage&&!globalThis.qaPage.isClosed()){await globalThis.qaPage.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.txt',await globalThis.qaPage.locator('body').innerText());}console.error(e);throw e;}finally{await writeFile(out+'/ui-verification.json',JSON.stringify(reports,null,2));await browser.close();}
