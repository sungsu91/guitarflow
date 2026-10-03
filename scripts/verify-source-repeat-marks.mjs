import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {applyImportedNavigation} from '../src/pdf/tab-import/importedNavigation.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),out='artifacts/omr-source-layout';
const results=[];
try{for(const [name,dir] of [['일어나(코드)','other-final'],['Let_It_Be(코드)','let-it-be'],['풀잎사랑(코드)','pulip-final']]){
 const page=await browser.newPage();await page.route('**/__repeat-audit',r=>r.fulfill({contentType:'text/html',body:'<input type="file" multiple>'}));await page.goto('http://127.0.0.1:5174/__repeat-audit');await page.locator('input').setInputFiles([1,2].map(n=>`C:/Users/User/Desktop/sheet music/${name}_페이지_${n}.jpg`));
 const geometry=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js'),results=[];
  for(const [p,file] of [...document.querySelector('input').files].entries()){
   const src=await loadTabImage(file),c=drawTabImage(src),im=c.getContext('2d').getImageData(0,0,c.width,c.height);
   results.push(...cropNotationSystems(im.data,c.width,c.height).map(s=>({page:p+1,staff:s.id,endingBrackets:s.endingBrackets,marks:s.measures.map(m=>({repeatStart:!!m.repeatStart,repeatEnd:!!m.repeatEnd,endBarline:m.endBarline}))})));src.close();
  }return results;
 });await page.close();
 const doc=JSON.parse(await readFile(`${out}/${dir}/after.json`,'utf8')),before=JSON.stringify(doc.measures.map(m=>m.events));
 // Reuse the already verified note OCR. Only apply the independently reread
 // repeat/ending geometry through the production adapter's navigation policy.
 doc.pdfTabImport.notation.systems=doc.pdfTabImport.notation.systems.map(s=>({...s,endingBrackets:geometry.find(g=>g.page===s.page&&g.staff===s.staff).endingBrackets}));
 applyImportedNavigation(doc);assert.equal(JSON.stringify(doc.measures.map(m=>m.events)),before);
 const brackets=geometry.flatMap(g=>g.endingBrackets.map(b=>({page:g.page,staff:g.staff,...b})));
 if(dir==='let-it-be'){assert.equal(brackets.length,4);assert(doc.pdfTabImport.notation.repeatNavigationPending);assert(!doc.measures.some(m=>m.repeatStart||m.repeatEnd));assert.equal(doc.measures.filter(m=>m.pdfImport.repeatMarks).length,4);}
 else assert.equal(brackets.length,0,name+' has no alternate endings');
 const compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);assert(scorePlaybackReadiness(doc,compiled).allowed);
 await writeFile(`${out}/${dir}/navigation-verified.json`,JSON.stringify(doc,null,2));results.push({name,brackets,automaticRepeatBars:doc.measures.flatMap((m,i)=>m.repeatStart||m.repeatEnd?[i+1]:[]),pendingRepeatBars:doc.measures.flatMap((m,i)=>m.pdfImport.repeatMarks?[i+1]:[]),eventsUnchanged:true,playable:true});
}}finally{await browser.close();}
await writeFile(`${out}/repeat-marks.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
