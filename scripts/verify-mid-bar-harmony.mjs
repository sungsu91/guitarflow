import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.goto((process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174')+'/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});
 const results=await page.evaluate(async()=>{
  const {drawScore}=await import('/src/etudes/Score.jsx'),{createBlankDocument,blankEvent,compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const out=[];
  for(const mobile of [false,true])for(const editor of [false,true])for(const view of ['tab','both']){
   const xs=[];
   for(const changes of [[{name:'G',onset:960}],[{name:'C',onset:0},{name:'G',onset:960}],[{name:'G',onset:0}]]){
    const doc=createBlankDocument(),bar=doc.measures[0];bar.events=Array.from({length:8},(_,i)=>({...blankEvent(i*240,'8'),rest:false,blank:false,notes:[{id:`n${i}`,string:1,fret:0}]}));
    bar.harmonyChanges=changes;bar.harmony=changes[0].onset===0?changes[0].name:null;
    const host=document.createElement('div');document.body.append(host);const score=compileDocumentV2(doc).score;
    drawScore(host,score,{view,mobile,editor,editorWidth:600,tabRhythm:true,measuresPerRow:1});
    xs.push(Number(host.querySelector('[data-harmony-text="G"] tspan').getAttribute('x')));host.remove();
   }out.push({mobile,editor,view,singleMiddle:xs[0],multipleMiddle:xs[1],singleStart:xs[2]});
  }return out;
 });
 for(const r of results){assert(Math.abs(r.singleMiddle-r.multipleMiddle)<1,JSON.stringify(r));assert(r.singleMiddle>r.singleStart+100,JSON.stringify(r));}
 await mkdir('artifacts/flower-rhythm-20261004',{recursive:true});await writeFile('artifacts/flower-rhythm-20261004/harmony-render.json',JSON.stringify(results,null,2));console.log(JSON.stringify({cases:results.length,passed:true}));
}finally{await browser.close();}
