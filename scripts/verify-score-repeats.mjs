import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/score-repeats',{recursive:true});const results=[];
try{for(const [width,height] of [[360,800],[390,844],[430,932],[1440,1000]]){
 const mobile=width<500,p=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();d.measures=[m.blankMeasure(),m.blankMeasure()];for(let bar=0;bar<2;bar++)for(let event=0;event<4;event++)d=c.enterFret(d,{bar,event,string:6},bar+3);d.viewSettings.measuresPerRow=2;d.bpm=240;d.title='도돌이표 확인';return d;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'repeats.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await p.waitForFunction(()=>document.querySelectorAll('.etudeEditorMeasure').length===2);
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true});
 await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();
 const panel=p.getByRole('region',{name:'반복 도구',exact:true});await panel.waitFor();
 assert((await panel.innerText()).includes('1마디'));await panel.getByRole('button',{name:'반복 시작',exact:true}).click();
 assert.equal(await panel.getByRole('button',{name:'반복 시작',exact:true}).getAttribute('aria-pressed'),'true');
 await p.locator('.etudeEditorMeasure[data-bar-index="1"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="6"]').click();
 assert((await panel.innerText()).includes('2마디'));await panel.getByRole('button',{name:'반복 끝',exact:true}).click();
 assert.equal(await panel.getByRole('button',{name:'반복 끝',exact:true}).getAttribute('aria-pressed'),'true');
 await editor.getByRole('button',{name:'실행 취소',exact:true}).first().click();assert.equal(await panel.getByRole('button',{name:'반복 끝',exact:true}).getAttribute('aria-pressed'),'false');
 await editor.getByRole('button',{name:'다시 실행',exact:true}).first().click();assert.equal(await panel.getByRole('button',{name:'반복 끝',exact:true}).getAttribute('aria-pressed'),'true');
 const rect=await panel.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1);
 if(mobile){const row=await p.locator('.mobileInputExtras').evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth,buttons:[...e.children].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}));assert(row.buttons.every(b=>b.w>=80&&b.h>=44));assert(row.scroll>row.width);}
 await p.screenshot({path:`artifacts/score-repeats/${width}-panel.png`});
 for(const label of ['피킹','주법','빔']){await p.getByRole('button',{name:`${label} 도구 열기`,exact:true}).click();assert.equal(await panel.count(),0);await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();await panel.waitFor();}
 await p.getByRole('button',{name:'반복 도구 닫기',exact:true}).click();assert.equal(await panel.count(),0);
 await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();await panel.getByRole('button',{name:'도구 닫기',exact:true}).click();assert.equal(await panel.count(),0);
 const geometry=await p.locator('.etudeEditorMeasure').evaluateAll(bars=>bars.map(b=>{const root=b.querySelector('[data-draw-count]').shadowRoot;return {start:root.querySelector('[data-repeat-start]')?.dataset.repeatStart,end:root.querySelector('[data-repeat-end]')?.dataset.repeatEnd,barlines:root.querySelectorAll('.vf-stavebarline').length};}));
 assert.equal(geometry[0].start,'true');assert.equal(geometry[1].end,'true');
 await p.locator('.etudeEditorMeasure[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="6"]').click();
 if(width===390){
  await p.getByRole('button',{name:'악보 재생',exact:true}).click();
  const visited=[];for(let i=0;i<48;i++){visited.push(await p.locator('.editorAudioStatus').innerText());await p.waitForTimeout(100);}
  const sequence=visited.join('|');await writeFile('artifacts/score-repeats/playback.txt',sequence);assert(sequence.includes('1마디')&&sequence.includes('2마디'));
  // A second first-bar visit after bar 2 proves the cursor follows the repeat jump.
  assert(/2마디[\s\S]*1마디/.test(sequence));
 }
 await editor.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();
 const modal=p.getByRole('dialog',{name:'악보 저장 정보'});await modal.getByRole('button',{name:'저장하기'}).click();await modal.waitFor({state:'detached'});
 await editor.getByRole('button',{name:mobile?'악보 편집 뒤로':'닫기',exact:true}).click();await editor.waitFor({state:'detached'});await p.reload();
 await p.getByRole('button',{name:`${fixture.title} 열기`,exact:true}).click();await p.locator('.etudeNotation svg').waitFor();
 const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 assert.equal(stored.measures[0].repeatStart,true);assert.equal(stored.measures[1].repeatEnd,true);assert.deepEqual(stored.measures.map(m=>m.events),fixture.measures.map(m=>m.events));
 assert.equal(await p.locator('.etudeNotation [data-repeat-start="true"]').count(),1);assert.equal(await p.locator('.etudeNotation [data-repeat-end="true"]').count(),1);
 await p.screenshot({path:`artifacts/score-repeats/${width}-saved.png`});
 if(width===390){
  await p.getByRole('button',{name:'악보 편집',exact:true}).click();await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();
  assert.equal(await panel.getByRole('button',{name:'반복 시작',exact:true}).getAttribute('aria-pressed'),'true');
  await panel.getByRole('button',{name:'선택한 마디의 반복 표시 제거',exact:true}).click();
  assert.equal(await panel.getByRole('button',{name:'반복 시작',exact:true}).getAttribute('aria-pressed'),'false');
  assert((await panel.innerText()).includes('반복 시작 마디가 필요합니다'));
  assert(await p.getByRole('button',{name:'악보 재생',exact:true}).isDisabled());
  await editor.getByRole('button',{name:'실행 취소',exact:true}).first().click();assert.equal(await panel.getByRole('button',{name:'반복 시작',exact:true}).getAttribute('aria-pressed'),'true');
 }
 assert.deepEqual(errors,[]);results.push({width,height,geometry,undoRedo:true,saved:true,notesUnchanged:true});await p.close();
}}finally{await browser.close();await writeFile('artifacts/score-repeats/results.json',JSON.stringify(results,null,2));}
console.log(results);
