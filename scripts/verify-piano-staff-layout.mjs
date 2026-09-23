import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/piano-staff',{recursive:true});
try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('tab',{name:'내 악보',exact:true}).click();await p.getByRole('button',{name:'악보 만들기',exact:true}).click();await p.getByLabel('악기 선택',{exact:true}).selectOption('piano');
 const select=p.locator('select[aria-label="피아노 보표 구성"]:visible');assert.equal(await select.inputValue(),'grand');
 if(!mobile){await p.getByRole('group',{name:'오른손 건반',exact:true}).getByRole('button',{name:'C4',exact:true}).click();await p.getByRole('group',{name:'왼손 건반',exact:true}).getByRole('button',{name:'C3',exact:true}).click();}
 const pitches=()=>p.locator('.etudeEditorPreview .etudeNoteHandle').evaluateAll(es=>es.map(e=>[e.dataset.toneId,e.dataset.midi,e.dataset.hand]));
 const before=await pitches();if(!mobile)assert.equal(before.length,2);
 for(const layout of ['treble','bass','grand']){
  await select.selectOption(layout);await p.locator(`.etudeEditorPreview svg[data-piano-staff-layout="${layout}"]`).first().waitFor();
  assert.deepEqual(await pitches(),before);
  const clefs=await p.locator('.etudeEditorPreview [data-clef]').evaluateAll(es=>[...new Set(es.map(e=>e.dataset.clef))]);assert.deepEqual(clefs.sort(),layout==='grand'?['bass','treble']:[layout]);
  assert.equal(await p.getByText(/이 마디를 표시하지 못했습니다/).count(),0);
 }
 await p.getByRole('button',{name:'실행 취소',exact:true}).filter({visible:true}).click();assert.equal(await select.inputValue(),'bass');
 if(!mobile){await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();const save=p.getByRole('dialog',{name:'악보 저장 정보',exact:true});assert.equal(await save.getByLabel('피아노 보표 구성',{exact:true}).inputValue(),'bass');await save.getByRole('button',{name:'저장하기',exact:true}).click();const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.equal(stored.viewSettings.pianoStaffLayout,'bass');assert.deepEqual(stored.measures.flatMap(m=>m.events.flatMap(e=>e.notes.map(n=>n.midi))).sort(),[48,60]);}
 await p.screenshot({path:`artifacts/piano-staff/${mobile?'mobile':'desktop'}.png`});assert.deepEqual(errors,[]);console.log(mobile?'Mobile staff selection and undo PASS':'Desktop both-hand note preservation, clefs, all layouts and undo PASS');await p.close();
}}finally{await b.close();}
