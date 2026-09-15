import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/pdf-continuous';await mkdir(out,{recursive:true});const results=[];let p;
try{for(const mobile of [true,false]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});p=await ctx.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles('tmp/pdfs/pdf-practice-24pages.pdf');const d=p.getByRole('dialog',{name:'PDF 악보 정보'});await d.getByRole('button',{name:'기기에 저장',exact:true}).click();await d.waitFor({state:'hidden'});await p.locator('.pdfCardActions').getByRole('button',{name:'연습하기',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false');
 await p.getByLabel('PDF 보기 방식',{exact:true}).selectOption('continuous');await p.waitForFunction(()=>document.querySelector('.pdfContinuous [data-page="1"]'));
 assert.equal(await p.locator('[data-pdf-page-slot]').count(),24);assert.ok(await p.locator('.pdfCanvas canvas').count()<=3);
 const slots=await p.locator('[data-pdf-page-slot]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.ok(slots.every((v,i)=>!i||v>slots[i-1]));
 await p.locator('.pdfContinuous').evaluate(e=>{const slot=e.querySelector('[data-pdf-page-slot="2"]');e.scrollTop+=slot.getBoundingClientRect().top-e.getBoundingClientRect().top-12;});
 await p.waitForFunction(()=>document.querySelector('input[aria-label="PDF 페이지"]')?.value==='2');
 await p.getByLabel('PDF 페이지',{exact:true}).fill('24');await p.waitForFunction(()=>document.querySelector('[data-pdf-page-slot="24"] [data-page="24"]'));
 assert.ok(await p.locator('.pdfCanvas canvas').count()<=3);assert.equal(await p.getByLabel('PDF 페이지',{exact:true}).inputValue(),'24');
 await p.getByLabel('PDF 확대',{exact:true}).selectOption('100');await p.waitForTimeout(250);await p.getByLabel('PDF 확대',{exact:true}).selectOption('fit');await p.waitForTimeout(250);
 const width=await p.locator('.pdfContinuous').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert.ok(width.scroll<=width.client+1,'fit width has no horizontal clipping');
 await p.getByLabel('PDF 페이지',{exact:true}).fill('2');await p.waitForFunction(()=>document.querySelector('[data-pdf-page-slot="2"] [data-page="2"]'));
 await p.getByRole('button',{name:'PDF 간단 편집',exact:true}).click();await p.getByRole('button',{name:'텍스트 메모',exact:true}).click();
 const target=p.locator('[data-pdf-page-slot="2"] .pdfPaper');await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();await p.mouse.click(b.x+b.width*.3,b.y+50);await p.getByLabel('악보 위 메모',{exact:true}).fill('2페이지 메모');await p.getByRole('button',{name:'메모 저장',exact:true}).click();await p.getByRole('status').filter({hasText:'기기에 저장됨'}).waitFor();
 const read=()=>p.evaluate(async()=>{const [r]=await(await import('/src/pdf/pdfLibrary.js')).listPdfs();return r;});assert.equal((await read()).pageEdits[2].notes[0].text,'2페이지 메모');
 await p.getByRole('button',{name:'PDF 간단 편집',exact:true}).click();await p.getByLabel('PDF 페이지',{exact:true}).fill('3');await p.waitForFunction(()=>document.querySelector('[data-pdf-page-slot="3"] [data-page="3"]'));await p.getByRole('status').filter({hasText:'기기에 저장됨'}).waitFor();await p.getByRole('button',{name:'‹ 내 악보 보관함',exact:true}).click();await p.reload();await p.locator('.pdfCardActions').getByRole('button',{name:'연습하기',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-pdf-page-slot="3"] [data-page="3"]'));assert.equal(await p.getByLabel('PDF 보기 방식',{exact:true}).inputValue(),'continuous');assert.equal(await p.getByLabel('PDF 페이지',{exact:true}).inputValue(),'3');
 await p.getByLabel('PDF 페이지',{exact:true}).fill('1');await p.waitForFunction(()=>document.querySelector('[data-pdf-page-slot="1"] [data-page="1"]'));await p.locator('.pdfViewTools').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${mobile?'390':'1440'}.png`});
 await p.getByLabel('PDF 확대',{exact:true}).selectOption('page');await p.waitForFunction(()=>!document.querySelector('.pdfContinuous'));assert.equal(await p.getByLabel('PDF 보기 방식',{exact:true}).inputValue(),'single');assert.deepEqual(errors,[]);results.push({mobile,all24InOrder:true,canvasesAtMost3:true,scrollUpdatesPage:true,directNavigation:true,fitWidth:true,notePageCorrect:true,restored:true,errors});await ctx.close();
}}catch(e){await p?.screenshot({path:`${out}/failure.png`});throw e;}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
