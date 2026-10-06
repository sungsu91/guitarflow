import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import assert from 'node:assert/strict';
const out='artifacts/flower-connections-20261006/verified',document=JSON.parse(await readFile(`${out}/document.json`));
const server=await createServer({root:process.argv[2]??process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=await server.transformIndexHtml('/__connections','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:12px;box-sizing:border-box;background:white"><main id="scores"></main></body></html>');
 await page.route('**/__connections',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__connections`);
 const report=await page.evaluate(async({doc,width})=>{
  const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{drawScore}=await import('/src/etudes/Score.jsx');const compiled=compileDocumentV2(doc);if(compiled.errors.length)throw Error(compiled.errors.join());
  for(const start of [26,47]){const section=document.createElement('section');section.innerHTML=`<h3>${start+1}–${start+2}마디</h3>`;document.querySelector('#scores').append(section);const host=document.createElement('div');section.append(host);const selectedDoc={...doc,measures:doc.measures.slice(start,start+2),viewSettings:{...doc.viewSettings,sourceLayout:false,systemBreaks:[]}},score=compileDocumentV2(selectedDoc).score;drawScore(host,score,{view:'tab',barOffset:start,mobile:width<600,editorWidth:width-24,responsive:true,measuresPerRow:width<600?1:2,tabRhythm:true});}
  return {width,svgs:document.querySelectorAll('svg').length,text:document.body.textContent};
 },{doc:document,width});
 assert(report.svgs>=2);assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/render-${width}.png`,fullPage:true});reports.push({...report,errors});await page.close();
}}finally{await writeFile(`${out}/view-report.json`,JSON.stringify(reports,null,2));await browser.close();await server.close();}
