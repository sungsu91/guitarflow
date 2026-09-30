import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankEvent,newId,ticksOf} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.TAB_REPEAT_ORIGIN||'http://127.0.0.1:5174',out='artifacts/tab-repeat';
await mkdir(out,{recursive:true});
const source=createBlankDocument();source.title='반복 운지 표기 테스트';source.english=source.title;
source.viewSettings={...source.viewSettings,measuresPerRow:2};
source.measures=Array.from({length:2},()=>{
 let onset=0;
 return {id:newId('bar'),chord:null,events:['8','16','8','16','16','8','8','8','8'].map((duration,i)=>{
  const e={...blankEvent(onset,duration),rest:false,blank:false,dotted:i===0,pickStroke:i%2?'up':'down',notes:(i<4?[0,2,2,2,0]:[0,0,1,2,2,0]).map((fret,j)=>({id:newId('tone'),string:j+1,fret}))};
  onset+=ticksOf(e);return e;
 })};
});
const results=[];
try{
 for(const width of [1440,1024,390]){
  const mobile=width<1000,p=await browser.newPage({viewport:{width,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);
  await p.addInitScript(document=>{
   localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[document.id]:{document,status:'draft'}}}));
   window.__meters=[];const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(destination,...rest){const result=connect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
  },source);
  try{
   await p.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
   if(mobile){await p.getByRole('button',{name:'악보 작업',exact:true}).click();await p.getByRole('menuitem',{name:/제작|만들기/}).click();}
   else await p.getByRole('button',{name:'제작',exact:true}).click();
   await p.locator('.etudeEditor').waitFor();
   if(mobile){
    assert.equal(await p.locator('.desktopTabRepeat').count(),0);assert.deepEqual(errors,[]);await p.screenshot({path:`${out}/mobile.png`});results.push({width,desktopControlAbsent:true,errors});continue;
   }
   await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:source.title}).click();
   const repeat=p.getByRole('button',{name:'반복 운지 생략',exact:true}),count=()=>p.locator('[data-tab-repeat]').count();
   const waitCount=async n=>{await p.waitForFunction(n=>[...document.querySelectorAll('[data-draw-count]')].reduce((sum,host)=>sum+(host.shadowRoot?.querySelectorAll('[data-tab-repeat]').length??0),0)===n,n);};
   assert.equal(await count(),0);await repeat.click();await waitCount(7);
   assert.equal(await repeat.getAttribute('aria-pressed'),'true');
   await p.locator('[data-score-input]').press('Control+z');await waitCount(0);await p.locator('[data-score-input]').press('Control+Shift+z');await waitCount(7);
   // Select both measures by the actual pointer gesture, then apply mixed scope.
   const point=async(bar,event)=>p.locator(`[data-bar-index="${bar}"] [data-draw-count]`).evaluate((host,event)=>{
    const hit=host.shadowRoot.querySelector(`[data-event="${event}"][data-mode="tab"][data-string="1"]`),pt=hit.ownerSVGElement.createSVGPoint();
    pt.x=Number(hit.dataset.cursorX)+12;pt.y=Number(hit.dataset.cursorY)+7;const at=pt.matrixTransform(hit.ownerSVGElement.getScreenCTM());return {x:at.x,y:at.y};
   },event);
   const from=await point(0,0),to=await point(1,8);await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:20});await p.mouse.up();
   assert.match(await repeat.getAttribute('title'),/선택 구간/);await repeat.click();await waitCount(14);
   await repeat.click();await waitCount(0);await repeat.click();await waitCount(14);
   await p.screenshot({path:`${out}/desktop-${width}.png`});
   await p.getByRole('button',{name:'오선보+TAB',exact:true}).click();await waitCount(14);
   const staff=await p.locator('[data-draw-count]').first().evaluate(host=>host.shadowRoot.querySelectorAll('.vf-stavenote').length);assert.equal(staff,9);
   const dock=p.locator('.editorAudioDock');await dock.locator('.editorSoundToggle input').check();if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();
   await dock.locator('.editorPlay').click();await p.waitForFunction(()=>document.querySelector('.editorPlay')?.getAttribute('aria-pressed')==='true');
   const peak=await p.evaluate(async()=>{let peak=0;for(let i=0;i<25;i++){for(const a of window.__meters){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);for(const n of data)peak=Math.max(peak,Math.abs(n));}await new Promise(r=>setTimeout(r,50));}return peak;});
   assert.ok(peak>.0001);await dock.locator('.editorPlay').click();
   await p.getByRole('button',{name:'TAB',exact:true}).click();
   await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();
   const stored=await p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,source.id);
   assert.equal(stored.measures.flatMap(m=>m.events).filter(e=>e.tabRepeat).length,18);
   assert.deepEqual(stored.measures.flatMap(m=>m.events.map(e=>e.notes.map(n=>[n.string,n.fret]))),source.measures.flatMap(m=>m.events.map(e=>e.notes.map(n=>[n.string,n.fret]))));
   await p.getByRole('button',{name:'PDF 저장',exact:true}).click();const print=p.locator('.print-preview-overlay');await print.waitFor();
   await print.locator('[data-tab-repeat]').first().waitFor();assert.equal(await print.locator('[data-tab-repeat]').count(),14);
   await p.screenshot({path:`${out}/print-${width}.png`});await print.getByRole('button',{name:'닫기',exact:true}).click();await print.waitFor({state:'detached'});
   await p.getByRole('button',{name:'닫기',exact:true}).click();await p.getByRole('button',{name:'제작',exact:true}).click();
   await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:source.title}).click();await waitCount(14);
   const layout=await p.locator('.etudeEditor').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}));assert.ok(layout.scrollWidth<=layout.width+2);
   assert.deepEqual(errors,[]);results.push({width,slashes:14,staffNotesPerBar:staff,peak,undoRedo:true,dragRange:true,toggleRestore:true,print:true,reopened:true,layout,errors});
   await writeFile(`${out}/document.json`,JSON.stringify(stored,null,2));
  }catch(e){await p.screenshot({path:`${out}/error-${width}.png`});console.error(errors);throw e;}finally{await p.close();}
 }
 console.log(JSON.stringify(results,null,2));await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
