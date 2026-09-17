import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/navigation-position',{recursive:true});
try{const p=await browser.newPage({viewport:{width:1000,height:800}});await p.goto('http://127.0.0.1:5173/#etudes');
 const result=await p.evaluate(async()=>{
  const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js'),{drawScore}=await import('/src/etudes/Score.jsx'),{scoreTimeline}=await import('/src/etudes/scorePlayback.js');
  let d=m.createBlankDocument();d.measures=Array.from({length:5},()=>m.blankMeasure());d.viewSettings.measuresPerRow=4;d.measures[0].repeatStart=true;d.measures[1].marker='coda';d.measures[2].ending=1;d.measures[3].ending=1;d.measures[3].repeatEnd=true;d.measures[4].ending=2;
  const host=document.createElement('div');Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'99999',background:'white'});document.body.append(host);
  const render=(document,view)=>{const s=m.compileDocumentV2(document).score,before=JSON.stringify(document),timing=JSON.stringify(scoreTimeline(s));drawScore(host,s,{view,mobile:false});const svg=host.querySelector('svg'),marker=svg.querySelector('[data-navigation-bar="1"]'),box=marker.getBBox(),endings=[...svg.querySelectorAll('[data-ending-y]')].map(el=>{const transform=el.transform.baseVal.consolidate()?.matrix.f??0;return Number(el.dataset.endingY)+transform;});return {gap:Number(marker.dataset.staveTop)-box.y-box.height,endings,unchanged:JSON.stringify(document)===before&&timing===JSON.stringify(scoreTimeline(s)),svg:svg.outerHTML};};
  d=c.setEventDuration(d,{bar:1,event:0},'16');const empty=render(d,'both');let high=c.enterFret(d,{bar:1,event:1,string:1},5);high=c.enterFret(high,{bar:2,event:0,string:1},12);const filled=render(high,'both'),tab=render(high,'tab'),staff=render(high,'staff');const deleted=c.deleteTone(high,{bar:1,event:1,string:1}),restored=render(deleted,'both');return {empty,filled,tab,staff,restored};
 });
 assert(result.filled.gap>result.empty.gap+5,JSON.stringify([result.empty.gap,result.filled.gap]));assert(Math.abs(result.restored.gap-result.empty.gap)<.01);
 for(const state of Object.values(result)){assert(state.unchanged);assert.equal(state.endings[0],state.endings[1]);}
 for(const key of ['empty','filled','tab']){await p.setContent(`<html><head><style>body{margin:0;background:white;color:#111}svg{background:white}text{fill:#111}</style></head><body>${result[key].svg}</body></html>`);await p.screenshot({path:`artifacts/navigation-position/${key}.png`});}
 await writeFile('artifacts/navigation-position/results.json',JSON.stringify(Object.fromEntries(Object.entries(result).map(([key,{svg,...value}])=>[key,value])),null,2));console.log(Object.fromEntries(Object.entries(result).map(([key,value])=>[key,value.gap])));
}finally{await browser.close();}
