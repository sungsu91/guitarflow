import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const inventory=JSON.parse(await readFile('artifacts/pdf-tab-folder/inventory.json')),folder=process.env.PDF_TAB_UI_OUTPUT||'artifacts/pdf-tab-100/ui';await mkdir(folder,{recursive:true});
const results=[],origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
try{for(const index of process.argv.slice(2).length?process.argv.slice(2).map(Number):[0,4]){
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);
 await p.addInitScript(()=>{
  localStorage.setItem('fretiva.score.sound','false');window.__meters=[];
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...rest){const result=connect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
 });
 const sample=()=>p.evaluate(async()=>{let peak=0;for(let i=0;i<30;i++){for(const a of window.__meters){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);for(const v of data)peak=Math.max(peak,Math.abs(v));}await new Promise(r=>setTimeout(r,50));}return peak;});
 try{
  await p.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});await p.getByRole('button',{name:'제작',exact:true}).click();
  await p.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();assert.equal(await p.locator('.desktopPdfTabImport').getByRole('checkbox').count(),0);await p.getByLabel('TAB 분석용 PDF·사진 선택',{exact:true}).setInputFiles(inventory[index].path);
  await p.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:300000});const importedFrets=Number(await p.locator('.desktopPdfTabImport dl > div').last().locator('dd').innerText());await p.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await p.locator('.pdfTabReviewBar').waitFor();
  if(index===4){
   const strum=p.locator('[data-bar-index="36"]');await strum.scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>document.querySelector('[data-bar-index="36"] [data-draw-count]')?.shadowRoot?.querySelectorAll('[data-tab-repeat]').length===6);
   await p.screenshot({path:`${folder}/${index}-automatic-strum.png`});
  }
  const dock=p.locator('.editorAudioDock');assert.equal(await dock.locator('.editorSoundToggle input').isChecked(),true);assert.equal(await dock.locator('.editorPlay').isEnabled(),true);
  await p.getByRole('button',{name:'오선보+TAB',exact:true}).click();await p.waitForTimeout(500);
  const notes=await p.locator('[data-draw-count]').first().evaluate(el=>el.shadowRoot?.querySelectorAll('.vf-stavenote').length??0);assert.ok(notes>0,'fret positions produce staff notation');
  const click=dock.locator('.editorMute');if(await click.getAttribute('aria-pressed')==='true')await click.click();
  await dock.locator('.editorPlay').click();await p.waitForFunction(()=>document.querySelector('.editorPlay')?.getAttribute('aria-pressed')==='true');const peak=await sample();assert.ok(peak>.0001,`actual instrument PCM is nonzero with metronome off: ${peak}`);await p.screenshot({path:`${folder}/${index}-playing.png`});await dock.locator('.editorPlay').click();
  // Edit through the actual hit target and keyboard, then verify after save.
  const hit=p.locator('[data-bar-index="0"] .etudeEditorHit[data-event="0"][data-mode="tab"][data-string="1"]').first();await hit.click();await p.locator('[data-score-input]').press('5');
  if(index===0){
   await p.getByRole('button',{name:'TAB',exact:true}).click();
   const point=string=>p.locator('[data-bar-index="0"] [data-draw-count]').evaluate((host,string)=>{const hit=host.shadowRoot.querySelector(`[data-event="0"][data-mode="tab"][data-string="${string}"]`),p=hit.ownerSVGElement.createSVGPoint();p.x=Number(hit.dataset.cursorX)+12;p.y=Number(hit.dataset.cursorY)+7;const at=p.matrixTransform(hit.ownerSVGElement.getScreenCTM());return {x:at.x,y:at.y};},string);
   const from=await point(1),to=await point(2);await p.keyboard.down('Alt');await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:8});await p.mouse.up();await p.keyboard.up('Alt');
   assert.equal(await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="2"]').count(),1);
   await p.locator('[data-score-input]').press('Control+c');await p.locator('[data-score-input]').press('Control+v');await p.locator('[data-score-input]').press('Control+v');
  }
  await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();
  const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).find(r=>r.document.pdfTabImport).document);assert.equal(stored.measures[0].events[0].notes.find(n=>n.string===(index===0?2:1)).fret,5);
  if(index===0){assert.equal(stored.measures[0].events[0].notes.some(n=>n.string===1),false);const tones=stored.measures.flatMap(m=>m.events.flatMap(e=>e.notes));assert.equal(tones.length,importedFrets);assert.equal(new Set(tones.map(n=>n.id)).size,tones.length);}
  for(const source of stored.pdfTabImport.pages){await p.getByLabel('원본 페이지로 이동',{exact:true}).selectOption(String(source.page));await p.waitForTimeout(100);assert.match(await p.locator('.pdfTabReviewBar').innerText(),new RegExp(`${source.start+1}마디`));}
  await p.getByRole('button',{name:'닫기',exact:true}).click();await p.getByRole('button',{name:'제작',exact:true}).click();await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:stored.title}).click();await p.locator('.pdfTabReviewBar').waitFor();assert.equal(await dock.locator('.editorPlay').isEnabled(),true);
  if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();await dock.locator('.editorPlay').click();await p.waitForFunction(()=>document.querySelector('.editorPlay')?.getAttribute('aria-pressed')==='true');const reopenedPeak=await sample();assert.ok(reopenedPeak>.0001);await dock.locator('.editorPlay').click();
  assert.deepEqual(errors,[]);results.push({index,origin,pages:stored.pdfTabImport.pages.length,bars:stored.measures.length,staffNotes:notes,instrumentPeak:peak,reopenedPeak,editedFret:5,draggedAndPastedTwice:index===0,defaultSoundOn:true,errors});console.log(results.at(-1));
 }catch(e){await p.screenshot({path:`${folder}/${index}-error.png`});throw e;}finally{await p.close();await writeFile(`${folder}/playback.json`,JSON.stringify(results,null,2));}
}}finally{await browser.close();}
