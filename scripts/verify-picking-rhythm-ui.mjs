import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankEvent,newId,ticksOf} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PICKING_APP_ORIGIN||'http://127.0.0.1:5175',out='artifacts/picking-rhythm';await mkdir(out,{recursive:true});
const source=createBlankDocument();source.title='리듬 피킹 확인';source.english=source.title;source.viewSettings.measuresPerRow=3;
source.measures=[['2','4','4'],[{duration:'8',dotted:true},'16','8','16','16','8','8','8','8'],[{duration:'8',rest:true},'8','4',{duration:'4',dotted:true},'8']].map(spec=>{
 let onset=0;return {id:newId('bar'),chord:null,events:spec.map(item=>{const options=typeof item==='string'?{duration:item}:item;const event={...blankEvent(onset,options.duration),rest:false,blank:false,notes:[{id:newId('tone'),string:1,fret:0},{id:newId('tone'),string:2,fret:2}],tabRepeat:true,...options};if(event.rest)event.notes=[];onset+=ticksOf(event);return event;})};
});
const results=[];
try{
 for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{document:d,status:'draft'}}}));},source);
  try{
   await p.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await p.getByRole('button',{name:'악보 작업',exact:true}).click();await p.getByRole('menuitem',{name:/제작|만들기/}).click();}
   else await p.getByRole('button',{name:'제작',exact:true}).click();
   await p.locator('.etudeEditor').waitFor();
   if(!mobile){await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:source.title}).click();await p.locator('[data-bar-index="2"]').waitFor();}
   await p.locator('[data-mobile-tool-toggle="picking"]').click();const panel=p.locator('#mobile-tool-picking');
   if(mobile){assert.equal(await panel.locator('.desktopPickingBatch').count(),0);assert.equal(await panel.locator('select').count(),0);assert(await panel.getByRole('button',{name:'모두 다운',exact:true}).isVisible());assert.deepEqual(errors,[]);results.push({mobile,unchangedQuickControls:true});continue;}
   const pattern=panel.getByLabel('일괄 피킹 패턴',{exact:true}),restart=panel.getByLabel('교대 다시 시작',{exact:true}),apply=panel.getByRole('button',{name:'피킹 패턴 적용',exact:true});
   const strokes=()=>p.locator('[data-bar-index]').evaluateAll((bars,counts)=>bars.map((bar,b)=>{const values=Array(counts[b]).fill(null);for(const node of bar.querySelector('[data-draw-count]').shadowRoot.querySelectorAll('.tabPickingLabel'))values[Number(node.dataset.rhythmEvents.split(':')[1])]=node.textContent==='Π'?'down':'up';return values;}),source.measures.map(m=>m.events.length));
   const expected=[['down','down','down'],['down','up','down','down','up','down','down','down','down'],[null,'up','down','down','up']];
   assert.equal(await pattern.inputValue(),'rhythm-auto');assert.equal(await restart.count(),0);await apply.click();assert.deepEqual(await strokes(),expected);
   await p.locator('[data-score-input]').press('Control+z');assert.deepEqual(await strokes(),source.measures.map(m=>m.events.map(()=>null)));await p.locator('[data-score-input]').press('Control+Shift+z');assert.deepEqual(await strokes(),expected);
   await pattern.selectOption('alternate-down');assert.equal(await restart.inputValue(),'bar');await apply.click();assert.deepEqual((await strokes()).slice(0,2),[['down','up','down'],['down','up','down','up','down','up','down','up','down']]);
   await restart.selectOption('continuous');await apply.click();assert.equal((await strokes())[1][0],'up');
   await restart.selectOption('beat');await apply.click();assert.deepEqual((await strokes())[1],['down','up','down','up','down','down','up','down','up']);
   await p.screenshot({path:`${out}/restart-desktop.png`});
   const before=await strokes();await pattern.selectOption('rhythm-8');await apply.click();assert.deepEqual(await strokes(),before);assert.match(await p.locator('.etudeEditor').innerText(),/2마디의 리듬/);
   await pattern.selectOption('rhythm-auto');await apply.click();assert.deepEqual(await strokes(),expected);
   await p.setViewportSize({width:1024,height:1000});await p.screenshot({path:`${out}/rhythm-desktop-1024.png`});const bounds=await panel.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=1024);
   await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();
   const stored=await p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,source.id);assert.deepEqual(stored.measures.map(m=>m.events.map(e=>e.pickStroke??null)),expected);
   assert.deepEqual(stored.measures.map(m=>m.events.map(e=>[e.onset,e.duration,e.dotted??false,e.notes.map(n=>[n.string,n.fret])])),source.measures.map(m=>m.events.map(e=>[e.onset,e.duration,e.dotted??false,e.notes.map(n=>[n.string,n.fret])])));
   await p.getByRole('button',{name:'닫기',exact:true}).click();await p.getByRole('button',{name:'제작',exact:true}).click();await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:source.title}).click();await p.locator('[data-bar-index="2"]').waitFor();assert.deepEqual(await strokes(),expected);
   assert.deepEqual(errors,[]);results.push({mobile,defaultPattern:'rhythm-auto',expected,undoRedo:true,restartModes:true,invalidGridUnchanged:true,saveReopen:true,errors});
  }catch(error){await p.screenshot({path:`${out}/error-${mobile}.png`});console.error(errors);throw error;}finally{await p.close();}
 }
 console.log(JSON.stringify(results,null,2));await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
