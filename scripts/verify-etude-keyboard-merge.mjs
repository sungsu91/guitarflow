import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),reports=[];
const out='artifacts/etude-keyboard-merge';await mkdir(out,{recursive:true});
try{for(const mobile of process.env.ONLY_DESKTOP?[false]:process.env.ONLY_MOBILE?[true]:[false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:5173/#etudes');
 const seed=async(title,bars)=>p.evaluate(async({title,bars})=>{
  const {createBlankDocument,blankMeasure}=await import('/src/etudes/scoreModel.js');const {saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');
  const d=createBlankDocument();d.title=title;d.english=title;d.measures=Array.from({length:bars},()=>blankMeasure());saveLibraryDocument(localStorage,d);return d;
 },{title,bars});
 const initial=await seed('Keyboard UX',8);
 const open=async title=>{await p.reload();await p.getByRole('button',{name:'기존 연습곡 · 에튀드',exact:true}).click();await p.locator('.etudeLibrary summary').click();await p.locator('.etudeLibrary div').filter({hasText:title}).getByRole('button',{name:'열기',exact:true}).click();await canvas.locator('svg').first().waitFor();};
 const dialog=p.getByRole('dialog',{name:'악보 편집',exact:true}),canvas=dialog.getByRole('group',{name:'악보 키보드 입력'});
 const save=async id=>{await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();return p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,id);};
 const hit=async(bar,event,string=6)=>{const base=`[data-bar-index="${bar}"] [data-mode="tab"][data-event="${event}"][data-string="${string}"]`,head=canvas.locator(`${base}.etudeNoteHandle`);const el=await head.count()?head:canvas.locator(base).first();await el.scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await el.evaluate(el=>el.scrollIntoView({block:'center',inline:'center'}));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const at=await el.evaluate(el=>{const p=el.ownerSVGElement.createSVGPoint();p.x=Number(el.dataset.cursorX)+12;p.y=Number(el.dataset.cursorY)+7;const q=p.matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y};});if(mobile)await p.touchscreen.tap(at.x,at.y);else await p.mouse.click(at.x,at.y);};
 const counts=()=>canvas.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>Number(e.dataset.drawCount)));
 const compiled=()=>p.evaluate(async()=>{const urls=[...new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(url=>new URL(url).pathname==='/src/etudes/scoreModel.js'))];return (await Promise.all(urls.map(url=>import(url)))).reduce((sum,m)=>sum+m.compileStats.bars,0);});
 const auto=async value=>{const details=dialog.locator(mobile?'.etudeEntryOptions':'.etudeToolbarMore');if(!await details.getAttribute('open'))await details.locator('summary').click();await dialog.getByLabel('입력 후 다음 위치로 이동').setChecked(value);await details.locator('summary').click();await canvas.focus();};
 const press=async keys=>{await canvas.focus();for(const key of keys)await p.keyboard.press(key);};
 const frets=(d,bar)=>d.measures[bar].events.map(e=>e.rest?null:e.notes[0].fret);
 await open(initial.title);
 await dialog.getByRole('button',{name:'4분음표',exact:true}).click();await hit(0,0);
 const before=await counts(),compileBefore=await compiled();
 await p.keyboard.type('2323',{delay:65});let doc=await save(initial.id);
 assert.deepEqual(frets(doc,0),[2,3,2,3]);assert.deepEqual(await counts().then(a=>a.slice(1)),before.slice(1));assert.equal(await compiled()-compileBefore,4);
 await hit(1,0);await dialog.getByRole('button',{name:'8분음표',exact:true}).click();await p.keyboard.type('23232323',{delay:55});doc=await save(initial.id);
 assert.deepEqual(frets(doc,1),[2,3,2,3,2,3,2,3]);assert.deepEqual(doc.measures[1].events.map(e=>[e.onset,e.duration]),Array.from({length:8},(_,i)=>[i*240,'8']));
 await hit(2,0);await dialog.getByRole('button',{name:'4분음표',exact:true}).click();await canvas.press('F2');await p.keyboard.type('10121523',{delay:70});doc=await save(initial.id);assert.deepEqual(frets(doc,2),[10,12,15,23]);
 // No-op first digit must not coalesce over an unrelated earlier undo entry.
 await hit(3,0);await canvas.press('F2');await canvas.press('1');await hit(3,0);const beforeTwelve=await save(initial.id);await canvas.focus();await canvas.press('F2');await p.keyboard.type('12',{delay:60});await canvas.press('Control+z');assert.deepEqual(await save(initial.id),beforeTwelve);await canvas.press('Control+Shift+z');assert.equal(frets(await save(initial.id),3)[0],12);
 // Turn auto advance off; wait expiry must not move the cursor later.
 await auto(false);await hit(3,1);await canvas.press('F2');await p.keyboard.type('2323',{delay:55});doc=await save(initial.id);assert.equal(frets(doc,3)[1],3);assert.equal(frets(doc,3)[2],null);
 await canvas.focus();await canvas.press('F2');await p.keyboard.type('15',{delay:60});assert.equal(frets(await save(initial.id),3)[1],15);await auto(true);await canvas.press('F2');
 await hit(3,2);await canvas.press('R');await canvas.press('7');doc=await save(initial.id);assert.equal(doc.measures[3].events[2].rest,true);assert.equal(frets(doc,3)[3],7);
 await hit(2,1);const deleteBefore=await save(initial.id);await canvas.focus();await canvas.press('Delete');const deleted=await save(initial.id);assert.equal(deleted.measures[2].events[1].rest,true);
 for(let i=0;i<3;i++){await canvas.press('Control+z');assert.deepEqual(await save(initial.id),deleteBefore);await canvas.press('Control+Shift+z');assert.deepEqual(await save(initial.id),deleted);}await canvas.press('Control+z');
 await hit(4,0,4);const arrowsBefore=await counts(),arrowsCompile=await compiled();await press(['ArrowUp','ArrowDown','ArrowRight','ArrowLeft','ArrowRight']);assert.deepEqual(await counts(),arrowsBefore);assert.equal(await compiled(),arrowsCompile);await canvas.press('6');doc=await save(initial.id);assert.equal(doc.measures[4].events[1].notes[0].string,4);assert.equal(doc.measures[4].events[1].notes[0].fret,6);
 // Rapid 30-note entry across measures: actual rendering and compiler counts.
 await hit(4,2,3);await dialog.getByRole('button',{name:'16분음표',exact:true}).click();
 const perfBefore=await counts(),cp=await compiled();await canvas.evaluate(el=>{el.inputMeasurements=[];});
 const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');const metricsBefore=await cdp.send('Performance.getMetrics');
 await p.keyboard.type('575757575757575757575757575757',{delay:20});
 const perfAfter=await counts(),compileDelta=await compiled()-cp;
 assert.deepEqual(perfAfter.slice(0,4),perfBefore.slice(0,4));assert.equal(compileDelta,30);assert.equal(perfAfter.reduce((s,n,i)=>s+n-perfBefore[i],0),30);
 const metricsAfter=await cdp.send('Performance.getMetrics'),inputFrames=await canvas.evaluate(el=>el.inputMeasurements??[]);
 const perf=Object.fromEntries(metricsAfter.metrics.filter(m=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].includes(m.name)).map(m=>[m.name,m.value-(metricsBefore.metrics.find(x=>x.name===m.name)?.value??0)]));
 doc=await save(initial.id);
 // Compare TAB, written octave-transposed staff, and the actual playback source.
 const audit=await p.evaluate(async d=>{const {compileScoreDocument}=await import('/src/etudes/scoreDocument.js');const {scoreTimeline}=await import('/src/etudes/scorePlayback.js');const r=compileScoreDocument(d);return {errors:r.errors,issues:r.issues,notes:r.score.measures.flat().filter(e=>!e.rest).flatMap(e=>(e.tones??[e]).map(n=>({id:e.id,string:n.string,fret:n.fret,midi:n.midi,pitch:n.pitch}))),timeline:scoreTimeline(r.score).events};},doc);
 assert.deepEqual(audit.errors,[]);assert.deepEqual(audit.issues,[]);
 for(const n of audit.notes){assert.equal(n.midi,doc.tuning[n.string-1]+n.fret);assert.ok(audit.timeline.some(e=>e.id===n.id&&e.string===n.string&&e.midi===n.midi));const [name,octave]=n.pitch.key.split('/');const pc={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[name[0]]+(name.includes('#')?1:name.length>1?-1:0);assert.equal((Number(octave)+1)*12+pc,n.midi+12);}
 await dialog.getByRole('button',{name:'악보 음정·리듬 듣기',exact:true}).click();await dialog.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 await dialog.getByRole('button',{name:'닫기',exact:true}).click();await open(initial.title);assert.deepEqual(await save(initial.id),doc);
 // Contextual inspector, without generating any music on blank clicks.
 if(!mobile){await dialog.locator('.etudePaperHeading').click();assert.equal(await dialog.locator('.etudePropertiesPanel>h3').textContent(),'곡 정보');
  const point=await canvas.locator('svg').first().evaluate(el=>{const p=el.createSVGPoint();p.x=500;p.y=Number(el.getAttribute('height'))-8;const q=p.matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y};});await p.mouse.click(point.x,point.y);assert.equal(await dialog.locator('.etudePropertiesPanel>h3').textContent(),'마디 속성');await hit(0,0);assert.equal(await dialog.locator('.etudePropertiesPanel>h3').textContent(),'음표 속성');
  assert.equal(await dialog.locator('[aria-label="입력 도구"]').count(),0);assert.equal(await dialog.locator('.etudeDurationButtons').count(),1);
 }
 await hit(0,0);await p.screenshot({path:`${out}/${mobile?'mobile':'desktop'}.png`,fullPage:false});assert.deepEqual(await save(initial.id),doc);
 await dialog.getByRole('button',{name:'닫기',exact:true}).click();const long=await seed('Long 64',64);await open(long.title);
 const longCounts=await counts();await hit(63,0,3);const cBefore=await compiled();await canvas.press('7');assert.equal(await compiled()-cBefore,1);let changed=await counts();assert.deepEqual(changed.slice(0,63),longCounts.slice(0,63));assert.equal(changed[63]-longCounts[63],1);
 await dialog.getByLabel('편집 악보 확대').selectOption('150');await hit(63,1,2);if(mobile)await dialog.getByRole('button',{name:'5',exact:true}).click();else await canvas.press('5');const longSaved=await save(long.id);assert.equal(longSaved.measures[63].events[0].notes[0].fret,7);assert.equal(longSaved.measures[63].events[1].notes[0].fret,5);
 assert.deepEqual(await p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,initial.id),doc);
 await dialog.getByRole('button',{name:'닫기',exact:true}).click();await open(long.title);assert.deepEqual(await save(long.id),longSaved);
 assert.deepEqual(errors,[]);reports.push({mobile,quarter2323:true,eighthBlankInput:true,twoDigitFrets:[10,12,15,23],twoDigitUndoNoopFirstDigit:true,autoAdvanceOnOff:true,rest:true,deleteUndoRedo:true,arrowSelectionNoCompileOrEngrave:true,thirtyNotes:{compileDelta,drawDelta:30,inputFrames,perf},sync:true,saveReload:true,long64LastBarOnly:true,errors});await p.close();
}}finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify(reports,null,2));}
console.log(JSON.stringify(reports,null,2));
