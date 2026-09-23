import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const folder='artifacts/sketch-label-layout';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 for(const [width,height] of [[390,844],[844,390],[1440,900]]){
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${process.env.VERIFY_URL??'http://127.0.0.1:5174'}/#etudes`);
  await p.getByRole('tab',{name:'에튀드',exact:true}).waitFor();
  await p.setViewportSize({width,height});
  const checks=await p.evaluate(async({width})=>{
   const {drawScore}=await import('/src/etudes/Score.jsx');
   const {daylightFingerstyle}=await import('/src/etudes/daylightFingerstyle.js');
   const {compositionSketch}=await import('/src/etudes/compositionSketch.js');
   const frame=document.createElement('iframe');frame.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:white';document.body.append(frame);
   frame.contentDocument.body.style.cssText='margin:12px;background:white;color:#111';
   const host=frame.contentDocument.createElement('div');host.style.width=`${width-24}px`;frame.contentDocument.body.append(host);
   const checks=[];
   const box=n=>{const b=n.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};};
   const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5;
   for(const score of [compositionSketch,daylightFingerstyle])for(const perRow of [1,4])for(const view of ['tab','both','staff']){
    drawScore(host,score,{mobile:width<1000,landscape:width===844,responsive:true,editorWidth:width-24,measuresPerRow:perRow,view});
    const svg=host.querySelector('svg'),vb=svg.viewBox.baseVal;
    const harmonies=[...svg.querySelectorAll('[data-score-annotation="harmony"]')],sections=[...svg.querySelectorAll('[data-score-annotation="section"]')];
    const staves=[...svg.querySelectorAll(view==='tab'?'[data-tab-time-signature] .vf-stave':'[data-measure] .vf-stave')];
    const outside=harmonies.flatMap(n=>{const b=box(n),bar=Number(n.dataset.annotationBar),s=box(staves[bar]);return b.x<s.x-1||b.x+b.width>s.x+s.width+1?[{bar,b,s}]:[];});
    const collisions=sections.flatMap(n=>harmonies.filter(h=>overlap(box(n),box(h))).map(h=>({section:n.dataset.annotationBar,harmony:h.dataset.annotationBar})));
    const clipped=[...harmonies,...sections].filter(n=>{const b=box(n);return b.x<vb.x-1||b.x+b.width>vb.x+vb.width+1||b.y<vb.y-1||b.y+b.height>vb.y+vb.height+1;}).map(n=>({kind:n.dataset.scoreAnnotation,bar:n.dataset.annotationBar,box:box(n)}));
    checks.push({score:score.templateId,perRow,view,outside,collisions,clipped});
   }
   // Show the reported area with a four-bar landscape arrangement.
   drawScore(host,daylightFingerstyle,{mobile:width<1000,landscape:width===844,responsive:true,editorWidth:width-24,measuresPerRow:4,view:'tab'});
   const svg=host.querySelector('svg'),target=svg.querySelector('[data-annotation-bar="27"][data-score-annotation="harmony"]');
   target.scrollIntoView({block:'center'});
   return checks;
  },{width});
  for(const c of checks){assert.deepEqual(c.outside,[],JSON.stringify(c));assert.deepEqual(c.collisions,[],JSON.stringify(c));assert.deepEqual(c.clipped,[],JSON.stringify(c));}
  assert.deepEqual(errors,[]);await p.screenshot({path:`${folder}/${width}.png`});results.push({width,height,checks});await p.close();
 }
 const app=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await app.goto(`${process.env.VERIFY_URL??'http://127.0.0.1:5174'}/#etudes`);
 await app.getByRole('tab',{name:'에튀드',exact:true}).click();
 await app.getByRole('button',{name:'연습 유형',exact:true}).click();
 await app.getByRole('searchbox',{name:'악보 검색'}).fill('A Little Further');await app.locator('.etudePickerCard').click();await app.getByRole('button',{name:'불러오기',exact:true}).click();
 await app.setViewportSize({width:844,height:390});
 await app.getByRole('combobox',{name:'한 줄 마디 수',exact:true}).selectOption('4');
 await app.waitForTimeout(250);
 const actual=await app.locator('.etudeNotation svg').evaluate(svg=>{
  const staves=[...svg.querySelectorAll('[data-tab-time-signature] .vf-stave')],labels=[...svg.querySelectorAll('[data-score-annotation="harmony"]')];
  return labels.map(n=>{const b=n.getBBox(),s=staves[Number(n.dataset.annotationBar)].getBBox();return {bar:n.dataset.annotationBar,lines:n.querySelectorAll('tspan').length,inside:b.x>=s.x-1&&b.x+b.width<=s.x+s.width+1};});
 });assert.ok(actual.every(x=>x.inside),JSON.stringify(actual));
 await app.locator('.etudeNotation [data-score-annotation="harmony"][data-annotation-bar="27"]').evaluate(n=>{
  const viewport=n.closest('.etudeScoreViewport');viewport.scrollTop+=n.getBoundingClientRect().top-viewport.getBoundingClientRect().top-20;
 });await app.screenshot({path:`${folder}/844-app.png`});
 results.push({actualLandscape:actual});await app.close();
 await writeFile(`${folder}/verification.json`,JSON.stringify(results,null,2));console.log(`PASS ${results.reduce((n,r)=>n+(r.checks?.length??0),0)} score/view/layout combinations and actual landscape app`);
}finally{await browser.close();}
