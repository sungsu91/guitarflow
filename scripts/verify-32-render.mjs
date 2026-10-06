import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createBlankDocument,blankEvent,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {saveLibraryDocument} from '../src/etudes/scoreLibrary.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE),out='artifacts/32nd-support/browser';await mkdir(out,{recursive:true});
const d=createBlankDocument();d.title='32분음표 검증';d.viewSettings={...d.viewSettings,notationView:'tab',measuresPerRow:1};
const patterns=[Array(32).fill('32'),Array.from({length:8},()=>['16','32','32']).flat(),Array(24).fill('16'),Array(48).fill('32')];
d.measures=patterns.map((values,b)=>{let onset=0;return {id:`bar-${b}`,events:values.map((duration,i)=>{
 const tuplet=b>1?{actualNotes:b===2?6:3,normalNotes:b===2?4:2,groupId:`${b}-${Math.floor(i/(b===2?6:3))}`} :undefined;
 const e={...blankEvent(onset,duration),id:`e-${b}-${i}`,blank:false,rest:b===1&&i===4,notes:b===1&&i===4?[]:[{id:`n-${b}-${i}`,string:1,fret:[10,11,12,17,19,24,0][i%7]}],...(tuplet?{tuplet}:{})};onset+=1920/Number(duration)*(tuplet?2/3:1);return e;
 })};});
assert.deepEqual(compileDocumentV2(d).errors,[]);await writeFile(`${out}/exercise.json`,JSON.stringify(d,null,2));
const results=[];
for(const engine of (process.env.WEBKIT_ONLY?['webkit']:['chrome'])){
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chrome'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__vite_plugin_react_preamble_installed__=true;window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;});
  await page.route('**/__32-render',r=>r.fulfill({contentType:'text/html',body:'<style>body{background:white;margin:12px}.host{margin-bottom:16px;overflow:auto}</style><main></main>'}));await page.goto('http://127.0.0.1:5174/__32-render');
  const checks=await page.evaluate(async({d,width})=>{
   const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{drawScore}=await import('/src/etudes/Score.jsx');const score=compileDocumentV2(d).score,results=[];
   for(const view of ['tab','both'])for(const scale of [.75,1,1.5]){
    const host=document.createElement('div');host.className='host';document.querySelector('main').append(host);
    drawScore(host,score,{view,tabRhythm:true,editorWidth:width-24,measuresPerRow:1,mobile:width<600,editor:true});const svg=host.querySelector('svg');svg.style.zoom=String(scale);
    const rows=[...svg.querySelectorAll('.etudeTabRhythm')],beams=rows.map(row=>[...new Set([...row.querySelectorAll('.tabRhythmBeam,.tabRhythmFlag')].filter(e=>e.tagName==='line').map(e=>Number(e.getAttribute('y1'))))].length);
    const labels=[...svg.querySelectorAll('.tabRhythmTuplet')].map(n=>n.textContent);
    const nonFinite=[...svg.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>/NaN|Infinity/.test(a.value)));
    const tabs=[...svg.querySelectorAll('.vf-tabnote')];let overlap=0;
    for(let i=1;i<tabs.length;i++){const a=tabs[i-1].getBBox(),b=tabs[i].getBBox();if(Math.abs(a.y-b.y)<3&&b.x>a.x&&a.x+a.width>b.x+.5)overlap++;}
    results.push({view,scale,beamLevels:beams,labels,nonFinite,overlap,tabNotes:tabs.length,width:svg.viewBox.baseVal.width});
   }return results;
  },{d,width});
  for(const r of checks){assert(!r.nonFinite);assert(r.beamLevels.includes(3),JSON.stringify(r));assert(r.labels.includes('6'));assert(r.labels.includes('3'));assert.equal(r.overlap,0,JSON.stringify(r));}
  await page.screenshot({path:`${out}/${engine}-${width}.png`});assert.deepEqual(errors,[]);results.push({engine,width,checks,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${out}/${process.env.WEBKIT_ONLY?'webkit':'chrome'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
