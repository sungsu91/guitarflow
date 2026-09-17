import assert from 'node:assert/strict';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try { const p=await b.newPage();await p.goto('http://127.0.0.1:5173/#etudes');
const result=await p.evaluate(async()=>{
 const {drawScore}=await import('/src/etudes/Score.jsx'),{ETUDES}=await import('/src/etudes/catalog.js');
 const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js'),{ensureTriplet}=await import('/src/etudes/tuplets.js');
 const variants=[];
 for(const duration of ['8','16']){let d=m.createBlankDocument();for(let i=0;i<1920/(1920/Number(duration));i++)d=c.enterFretWithDuration(d,{bar:0,event:i,string:6},[1,2,3,4][i%4],duration);d.measures=Array.from({length:4},()=>m.cloneMeasure(d.measures[0]));d.viewSettings.measuresPerRow=4;variants.push(m.compileDocumentV2(d).score);}
 let triplet=m.createBlankDocument();for(let beat=0;beat<4;beat++){triplet=ensureTriplet(triplet,{bar:0,event:beat*3,string:6});for(let i=0;i<3;i++)triplet=c.enterFret(triplet,{bar:0,event:beat*3+i,string:6},i+3);}variants.push(m.compileDocumentV2(triplet).score);
 let dotted=m.createBlankDocument();dotted=c.setEventDuration(dotted,{bar:0,event:0},'8');dotted=c.setDotted(dotted,{bar:0,event:0});dotted=c.enterFret(dotted,{bar:0,event:0,string:6},5);dotted=c.setRest(dotted,{bar:0,event:1});variants.push(m.compileDocumentV2(dotted).score);
 variants.push(m.compileDocumentV2(m.createBlankDocument()).score);
 const failures=[];let total=0;
 for(const score of [...ETUDES,...variants])for(const view of ['both','staff','tab']){try{const host=document.createElement('div'),before=JSON.stringify(score),metrics=drawScore(host,score,{mobile:true,view});if(host.innerHTML.includes('NaN'))throw Error('NaN');if(JSON.stringify(score)!==before)throw Error('mutated');for(const bar of metrics)for(const n of bar)if(n.noteX>=n.end||(!n.rest&&Math.abs(n.noteCenterX-n.tabCenterX)>.001))throw Error('overflow/alignment');total++;}catch(e){failures.push({id:score.id,view,error:e.message});}}
 return {total,failures};
});console.log(result);assert.deepEqual(result.failures,[]);
}finally{await b.close();}
