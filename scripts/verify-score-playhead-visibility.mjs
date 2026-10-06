import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure,newId} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),out='artifacts/score-playhead-visibility',results=[];
await mkdir(out,{recursive:true});
const document=createBlankDocument();document.title='Playhead visibility regression';document.measures=Array.from({length:64},()=>{const bar=blankMeasure();bar.events=bar.events.map(e=>({...e,blank:false,rest:false,notes:[{id:newId('tone'),string:2,fret:3,locked:true}]}));return bar;});
document.bpm=240;document.viewSettings={...document.viewSettings,notationView:'tab',measuresPerRow:4,systemBreaks:[]};
try{for(const width of [1920,390]){
 const mobile=width<600,context=await b.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
 try{
  await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},document);
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('.etudeNotation svg[data-notation-view]').first().waitFor();
  const transitions=await page.evaluate(async()=>{
   const {createScorePlayheadLayer}=await import('/src/etudes/scorePlayheadLayer.js');const root=document.querySelector('.etudeNotation');const layer=createScorePlayheadLayer(root),svgs=[...root.querySelectorAll('svg[data-notation-view]')];
   const styles=()=>svgs.flatMap(s=>[...s.querySelectorAll('line[aria-hidden=true]')]).filter(n=>n.hasAttribute('visibility')).map(n=>({attribute:n.getAttribute('visibility'),computed:getComputedStyle(n).visibility}));
   const checks=[];
   for(const s of [...svgs,svgs[0],svgs.at(-1),svgs[0]]){const pair=layer.activate(s);for(const node of [pair.line,pair.wash]){node.setAttribute('x1',50);node.setAttribute('x2',50);node.setAttribute('y1',30);node.setAttribute('y2',150);}checks.push(styles());}
   layer.hide();checks.push(styles());layer.destroy();return checks;
  });
  for(const s of transitions)assert(s.every(n=>n.attribute===n.computed),'SVG visibility must survive app CSS');
  if(!mobile){
   const edge=await page.locator('.desktopScorePage').first().getAttribute('data-last-bar');
   const select=page.getByRole('combobox',{name:'악보 재생 마디',exact:true});await select.selectOption(String(Number(edge)-1));await select.blur();await page.locator('.etudePracticeStart').click();
   const frames=await page.evaluate(async()=>{
    const output=[],start=performance.now();await new Promise(resolve=>{function sample(){
     const lines=[...document.querySelectorAll('.etudeNotation svg line[aria-hidden=true]')].filter(n=>n.hasAttribute('visibility'));
     output.push({time:performance.now()-start,visible:lines.filter(n=>getComputedStyle(n).visibility!=='hidden').length,active:document.querySelector('.savedScorePlayhead')?.dataset.bar});
     if(performance.now()-start<6500)requestAnimationFrame(sample);else resolve();
    }sample();});return output;
   });assert(frames.every(f=>f.visible<=2));assert(new Set(frames.map(f=>f.active).filter(Boolean)).size>=3);
   await page.screenshot({path:`${out}/playhead-page-transition.png`});await page.locator('.etudePracticeStart').click();
   await page.locator('.etudePracticeStop').click();
   await page.waitForFunction(()=>![...document.querySelectorAll('.etudeNotation svg line[aria-hidden=true][visibility]')].some(n=>getComputedStyle(n).visibility!=='hidden'));
   results.push({width,transitions:transitions.length,frames});
  }else results.push({width,transitions:transitions.length});
 }catch(error){await page.screenshot({path:`${out}/playhead-${width}-failure.png`});throw error;}finally{await context.close();}
}}finally{await b.close();await writeFile(`${out}/playhead-results.json`,JSON.stringify(results,null,2));}
console.log('PASS cursor visibility, desktop page transitions and mobile hide');

