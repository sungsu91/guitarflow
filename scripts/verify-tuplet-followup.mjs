import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
import {enterFret} from '../src/etudes/editorCommands.js';
const out='artifacts/ocr-followup-20261005/tuplets';await mkdir(out,{recursive:true});
const docs=[];for(const count of [3,6])for(const duration of ['4','8','16','32']){
 let d=ensureTriplet(createBlankDocument(),{bar:0,event:0},duration,count);
 for(let event=0;event<count;event++)d=enterFret(d,{bar:0,event,string:1},event+1);
 assert.deepEqual(compileDocumentV2(d).errors,[]);docs.push({count,duration,d});
}
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__vite_plugin_react_preamble_installed__=true;window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;});
 await page.route('**/__tuplets',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:12px;font:14px Arial;background:white}h3{margin:8px}section{overflow:auto;margin-bottom:12px}</style><main></main>'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__tuplets`);
 const checks=await page.evaluate(async({docs,width})=>{
  const {drawScore}=await import('/src/etudes/Score.jsx'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js'),checks=[];
  for(const view of ['tab','both'])for(const {d,count,duration}of docs){
   const title=document.createElement('h3');title.textContent=`${view} · ${count}:${count===3?2:4} · 1/${duration}`;document.querySelector('main').append(title);
   const host=document.createElement('section');document.querySelector('main').append(host);
   drawScore(host,compileDocumentV2(d).score,{view,tabRhythm:true,editorWidth:width-24,measuresPerRow:1,mobile:width<600,editor:true});
   const row=host.querySelector('.etudeTabRhythm'),label=row.querySelector('.tabRhythmTuplet');
   const xs=[...row.querySelectorAll('.tabRhythmStem')].slice(0,count).map(e=>+e.getAttribute('x1'));
   const brackets=[...row.querySelectorAll('.tabTupletBracket')];
   const levels=[...new Set([...row.querySelectorAll('line.tabRhythmBeam,line.tabRhythmFlag')].map(e=>+e.getAttribute('y1')))];
   checks.push({view,count,duration,label:label?.textContent,normal:+label?.dataset.normalNotes,beamLevels:levels.length,bracketLeft:+brackets[0]?.getAttribute('x1'),bracketRight:+brackets.at(-1)?.getAttribute('x1'),first:xs[0],last:xs.at(-1),nonFinite:[...host.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>/NaN|Infinity/.test(a.value)))});
  }return checks;
 },{docs,width});
 for(const c of checks){assert.equal(c.label,String(c.count));assert.equal(c.normal,c.count===3?2:4);assert.equal(c.beamLevels,Math.log2(Number(c.duration)/4));assert(c.bracketLeft<c.first&&c.bracketRight>c.last,JSON.stringify(c));assert(!c.nonFinite);}
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${width}.png`,fullPage:true});reports.push({width,checks,errors});await page.close();
}}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(reports,null,2));}
console.log(`PASS ${reports.reduce((n,r)=>n+r.checks.length,0)} tuplet render cases`);
