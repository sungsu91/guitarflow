import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.goto('http://127.0.0.1:5173/#etudes');await page.waitForTimeout(1200);
 const result=await page.evaluate(async width=>{
  const {createBlankDocument,compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const {enterFretWithDuration}=await import('/src/etudes/editorCommands.js');
  const {drawScore}=await import('/src/etudes/Score.jsx');
  document.body.replaceChildren();document.body.style.cssText='display:block!important;margin:0;background:white';
  const out=[];
  for(const kind of ['slide','HPH','tie']){
   let d=createBlankDocument();for(let i=0;i<4;i++)d=enterFretWithDuration(d,{bar:0,event:i,string:2},kind==='tie'?5:[5,7,5,7][i],'8');
   const events=d.measures[0].events;
   if(kind==='slide'){events[0].technique='S';events[0].slurTo=events[1].id;}
   if(kind==='HPH'){events[0].technique='H';events[1].technique='P';events[2].technique='H';}
   if(kind==='tie')events[0].tieTo=events[1].id;
   const host=document.createElement('div');host.style.width=Math.min(width,980)+'px';document.body.append(host);
   drawScore(host,compileDocumentV2(d).score,{editor:true,mobile:width<600,view:'tab',tabRhythm:true,editorWidth:Math.min(width,980)});
   const paths=[...host.querySelectorAll(kind==='slide'?'.etudeSlur':kind==='HPH'?'.tabLegatoArc':'.vf-tabTieArc path')];
   out.push({kind,paths:paths.map(p=>p.getAttribute('d'))});
  }return out;
 },width);
 for(const item of result){assert(item.paths.length>0,item.kind);assert(item.paths.every(p=>!p.includes('NaN')));}
 console.log(width,JSON.stringify(result));await page.screenshot({path:`output/connection-curves-${width}.png`});await page.close();
}}finally{await browser.close();}
