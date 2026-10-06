import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.argv[2]??'artifacts/book-photo-followup-20261006/ui';await mkdir(out,{recursive:true});
const file=JSON.parse(await readFile('artifacts/book-photo-20261005/manifest.json')).cases.find(c=>c.id==='book-9').path;
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
const reports=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__part-ui',r=>r.fulfill({contentType:'text/html',body:'<style>body{font-family:Arial,sans-serif;background:#171717;color:#eee}*{box-sizing:border-box}select,button{font:inherit}</style><div id="root"></div>'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__part-ui`);
 await page.evaluate(async()=>{
  localStorage.setItem('language','ko');
  const {default:RefreshRuntime}=await import('/@react-refresh');RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 });
 await page.addScriptTag({type:'module',url:`http://127.0.0.1:${server.httpServer.address().port}/scripts/book-photo-parts-fixture.jsx`});
 try{await page.getByRole('radio',{name:'TAB → TAB',exact:true}).check();}catch(e){console.error(JSON.stringify({errors,body:await page.locator('body').innerText()}));await page.screenshot({path:`${out}/mount-failure.png`});throw e;}
 await page.locator('input[type=file]').first().setInputFiles(file);
 await page.getByRole('button',{name:'분석하기',exact:true}).click();
 const select=page.getByRole('combobox',{name:'가져올 TAB 파트',exact:true});await select.waitFor({timeout:240000});
 assert.equal(await select.inputValue(),'');
 await select.selectOption('2');
 for(const width of [390,1440,320,390]){
  await page.setViewportSize({width,height:844});await page.locator(width<600?'.mobilePdfTabImport':'.desktopPdfTabImport').waitFor();
  assert.equal(await select.inputValue(),'2','part choice must survive layout replacement');await select.scrollIntoViewIfNeeded();
  const state=await select.evaluate(n=>{const d=n.closest('dialog'),r=n.getBoundingClientRect();return {width:innerWidth,overflow:d.scrollWidth>d.clientWidth+1,controlVisible:r.left>=0&&r.right<=innerWidth,layout:d.className};});
  assert(!state.overflow&&state.controlVisible,JSON.stringify(state));reports.push(state);await page.screenshot({path:`${out}/${width}.png`});
 }
 await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
 await page.waitForFunction(()=>window.openedDocument);
 const doc=await page.evaluate(()=>window.openedDocument);assert.equal(doc.pdfTabImport.partSelection.part,2);assert.equal(doc.measures.length,2);
 assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({reports,errors,importedPart:2,measures:doc.measures.length,sharedControllerSurvivedLayoutChange:true},null,2));console.log(JSON.stringify({reports,measures:doc.measures.length}));
}finally{await browser.close();await server.close();}
