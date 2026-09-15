import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base='http://127.0.0.1:5173',out='artifacts/omr-prototype';await mkdir(out,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:950}}),p=await context.newPage();
 const external=[];await p.route('**/*',r=>{if(r.request().url().startsWith(base+'/'))return r.continue();external.push(r.request().url());return r.abort();});
 await p.goto(base+'/experiments/omr/');
 // Build a clean, known printed fixture. Ground truth is never supplied to OMR.
 const fixture=await context.newPage();await fixture.goto(base+'/experiments/omr/');
 await fixture.evaluate(async()=>{const {default:VF}=await import('/node_modules/vexflow/build/esm/entry/vexflow.js');document.querySelectorAll('style,link[rel=stylesheet]').forEach(n=>n.remove());document.body.innerHTML='<div id="score"></div>';document.body.style.cssText='margin:0;background:white;color:black';const f=VF.Flow??VF,r=new f.Renderer(document.getElementById('score'),f.Renderer.Backends.SVG);r.resize(800,230);const c=r.getContext(),s=new f.Stave(30,60,740).addClef('treble').addTimeSignature('4/4').setContext(c);s.draw();const v=new f.Voice({num_beats:4,beat_value:4}).addTickables(['c/4','d/4','e/4','f/4'].map(k=>new f.StaveNote({keys:[k],duration:'q'})));new f.Formatter().joinVoices([v]).format([v],600);v.draw(c,s);});
 const pdfPath=out+'/clean-staff-one-page.pdf';await fixture.pdf({path:pdfPath,width:'850px',height:'300px',printBackground:true});await fixture.close();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.getByLabel('시험 PDF').setInputFiles(pdfPath);await p.getByRole('checkbox').check();
 await p.evaluate(()=>{window.omrProbe={ticks:0,maxGap:0,last:performance.now()};window.omrTimer=setInterval(()=>{const t=performance.now(),q=window.omrProbe;q.maxGap=Math.max(q.maxGap,t-q.last);q.last=t;q.ticks++;},20);});
 await p.getByRole('button',{name:'로컬 분석 / 다시 분석'}).click();
 await p.getByRole('heading',{name:'변환 전 확인'}).waitFor({timeout:60000});
 await p.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('원시 결과 저장됨'));
 const raw=await p.locator('pre').textContent();assert.equal(raw,'clef-G2+keySignature-CM+timeSignature-4/4+note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline');
 await p.getByLabel('원본 옥타브').selectOption('0');for(const [i,pos] of ['2:1','2:3','1:0','1:1'].entries())await p.getByLabel(`음 ${i+1} 운지`).selectOption(pos);
 await p.screenshot({path:out+'/review.png',fullPage:true});
 const stats=await p.evaluate(()=>{clearInterval(window.omrTimer);return window.omrProbe;});
 await p.getByRole('button',{name:'확인 후 기존 편집기 열기'}).click();await p.locator('.etudeEditorCanvas svg').first().waitFor();const surface=p.locator('.etudeEditorCanvas');await surface.focus();await surface.press('Control+s');
 const read=()=>p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 const before=await read();assert.equal(before.measures[0].events.length,4);
 const synced=await p.evaluate(async d=>{const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{scoreTimeline}=await import('/src/etudes/scorePlayback.js');const r=compileDocumentV2(d);return {midi:r.score.measures[0].map(e=>e.midi),play:scoreTimeline(r.score).events.map(e=>e.midi)};},before);
 assert.deepEqual(synced.midi,[60,62,64,65]);assert.deepEqual(synced.play,synced.midi);
 // Select the first note on string 2 using existing keyboard cursor.
 for(let i=0;i<4;i++)await surface.press('ArrowUp');await surface.press('2');await surface.press('Control+s');const changed=await read();assert.equal(changed.measures[0].events[0].notes[0].fret,2);
 assert.deepEqual(changed.measures[0].events.slice(1),before.measures[0].events.slice(1));
 await surface.press('Control+z');await surface.press('Control+s');assert.deepEqual((await read()).measures,before.measures);
 await surface.press('Control+y');await surface.press('Control+s');assert.deepEqual((await read()).measures,changed.measures);
 await p.screenshot({path:out+'/existing-editor.png'});
 const persisted=await p.evaluate(async()=>{const {listPdfs,getPdf,fingerprintPdf}=await import('/src/pdf/pdfLibrary.js');const records=await listPdfs(),r=records[0];return {raw:r.omrPrototype.raw,originalIntact:await fingerprintPdf(await getPdf(r.id))===r.fingerprint};});assert.equal(persisted.raw,raw);assert.ok(persisted.originalIntact);
 await p.reload();assert.deepEqual((await read()).measures,changed.measures);
 // Cancellation after starting releases the worker and leaves existing originals intact.
 await p.getByLabel('시험 PDF').setInputFiles(pdfPath);await p.getByRole('checkbox').check();await p.getByRole('button',{name:'로컬 분석 / 다시 분석'}).click();await p.getByRole('button',{name:'취소',exact:true}).click();await p.waitForTimeout(1500);assert.match(await p.getByRole('status').textContent(),/분석 취소/);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 const result={raw,synced,persisted,uiTimer:stats,externalRequests:external,pageErrors:errors,editorSaveUndoRedoReload:true,cancel:true};await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
