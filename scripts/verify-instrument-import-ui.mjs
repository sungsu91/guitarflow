import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.argv[2]??'artifacts/instrument-support-20261005/ui';await mkdir(out,{recursive:true});
await writeFile(`${out}/harness.jsx`, `import React from 'react';import {createRoot} from 'react-dom/client';import PdfTabImport from '/src/pdf/tab-import/PdfTabImport.jsx';const root=createRoot(document.getElementById('root'));root.render(<PdfTabImport mobile={new URLSearchParams(location.search).get('mobile')==='true'} onClose={()=>root.unmount()} onOpen={d=>window.importedDocument=d}/>);`);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),report=[];
try{for(const mobile of [true,false])for(const theme of ['light','classic-gold']){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=await server.transformIndexHtml('/__instrument-ui',`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${theme==='light'?'#e9e6e0':'#15130f'}"><div id="root"></div><script type="module" src="/${out}/harness.jsx"></script></body></html>`);
 await page.route('**/__instrument-ui?*',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__instrument-ui?mobile=${mobile}`);
 await page.locator('dialog').waitFor();
 const target=page.locator('.pdfImportTarget select').first();await target.selectOption('guitar:7');await page.locator('.pdfImportTarget select').nth(1).selectOption('guitar-7-drop-a');
 assert((await page.locator('.pdfImportTarget').innerText()).includes('A1'));
 await page.locator('input[value=tab]').check();const paired=page.locator('.importPairedCheck input');await paired.check();
 await page.locator('.importSourcePitch select').selectOption('octave-down');
 const suffix=`${mobile?'mobile':'desktop'}-${theme}`;await page.screenshot({path:`${out}/${suffix}-tab.png`});
 await page.locator('input[value=grand]').check();assert.equal(await target.inputValue(),'piano:0');assert.equal(await page.locator('.pdfImportTarget select').count(),1);
 await target.selectOption('guitar:6');assert(await page.locator('input[value=grand]').isChecked(),'explicit target change preserves Grand Staff source');
 await page.locator('input[value=tab]').check();await target.selectOption('piano:0');assert(await page.locator('input[value=grand]').isChecked(),'piano never uses TAB source implicitly');
 const dialog=await page.locator('dialog').boundingBox(),footer=await page.locator('dialog>footer').boundingBox();assert(dialog.height<=page.viewportSize().height);assert(footer.y+footer.height<=page.viewportSize().height+1);
 assert.equal(await page.locator('input[capture=environment]').count(),mobile?1:0);await page.screenshot({path:`${out}/${suffix}-grand.png`});
 assert.deepEqual(errors,[]);report.push({mobile,theme,passed:true,sevenString:true,customPreset:true,sourcePitch:true,explicitGrandConversion:true,footerVisible:true});await page.close();
}}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report));
