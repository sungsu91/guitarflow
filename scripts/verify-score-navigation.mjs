import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/score-navigation',{recursive:true});const results=[];
try{for(const [width,height] of [[390,844],[360,800],[430,932],[1440,1000]].filter(([w])=>!process.env.WIDTH||w===Number(process.env.WIDTH))){
 const mobile=width<500,p=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true});
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();d.measures=Array.from({length:6},()=>m.blankMeasure());for(let bar=0;bar<6;bar++)for(let event=0;event<4;event++)d=c.enterFret(d,{bar,event,string:6},bar+2);d.viewSettings.measuresPerRow=2;d.bpm=240;d.title='코다와 엔딩 확인';d.measures[1].marker='segno';d.measures[2].marker='toCoda';d.measures[4].command='dsAlCoda';d.measures[5].marker='coda';return d;});
 const load=async d=>{await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'navigation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await p.waitForFunction(n=>document.querySelectorAll('.etudeEditorMeasure').length===n,d.measures.length);};
 await load(fixture);
 const select=async bar=>{await p.locator(`.etudeEditorMeasure[data-bar-index="${bar}"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="6"]`).click();};
 await select(1);await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();
 const panel=p.getByRole('region',{name:'반복 도구',exact:true});await panel.waitFor();
 assert.equal(await panel.getByRole('button',{name:'세뇨',exact:true}).getAttribute('aria-pressed'),'true');
 await panel.getByRole('button',{name:'세뇨',exact:true}).click();await editor.getByRole('button',{name:'실행 취소',exact:true}).first().click();assert.equal(await panel.getByRole('button',{name:'세뇨',exact:true}).getAttribute('aria-pressed'),'true');
 const bounds=await panel.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
 await p.screenshot({path:`artifacts/score-navigation/${width}-panel.png`});
 await panel.getByRole('button',{name:'도구 닫기'}).click();await select(4);await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();assert.equal(await panel.getByLabel('반복 이동 명령').inputValue(),'dsAlCoda');
 await panel.getByLabel('반복 이동 명령').selectOption('ds');await panel.getByLabel('반복 이동 명령').selectOption('dsAlCoda');await panel.getByRole('button',{name:'도구 닫기'}).click();
 for(const label of ['TAB','오선보','오선보+TAB']){await editor.getByRole('button',{name:label,exact:true}).click();assert.equal(await p.locator('[data-navigation-bar]').count(),4);assert.equal(await editor.getByText(/이 마디를 표시하지 못했습니다/).count(),0);}
 await editor.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();const modal=p.getByRole('dialog',{name:'악보 저장 정보'});await modal.getByRole('button',{name:'저장하기'}).click();await modal.waitFor({state:'detached'});
 await editor.getByRole('button',{name:mobile?'악보 편집 뒤로':'닫기',exact:true}).click();await editor.waitFor({state:'detached'});await p.reload();await p.getByRole('button',{name:`${fixture.title} 열기`,exact:true}).click();await p.locator('.etudeNotation svg').waitFor();
 const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.deepEqual(stored.measures,fixture.measures);
 assert.equal(await p.locator('.etudeNotation [data-navigation-bar]').count(),4);await p.locator('.etudeNotation').screenshot({path:`artifacts/score-navigation/${width}-coda-score.png`});
 if(width===390){await p.getByRole('button',{name:'악보 음정·리듬 듣기',exact:true}).click();const bars=[];for(let n=0;n<92;n++){const bar=await p.evaluate(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar??null);bars.push(bar);await p.waitForTimeout(100);}await writeFile('artifacts/score-navigation/playback.json',JSON.stringify(bars));assert.deepEqual(bars.filter((b,i)=>b!==null&&b!==bars[i-1]).map(Number),[0,1,2,3,4,1,2,5]);}
 await p.getByRole('button',{name:'악보 편집',exact:true}).click();
 const endings=structuredClone(fixture);for(const m of endings.measures){delete m.marker;delete m.command;}endings.measures[0].repeatStart=true;endings.measures[2].repeatEnd=true;endings.measures[2].ending=1;endings.measures[3].ending=2;
 await load(endings);await select(2);await p.getByRole('button',{name:'반복 도구 열기',exact:true}).click();assert.equal(await panel.getByRole('button',{name:'1번 엔딩',exact:true}).getAttribute('aria-pressed'),'true');await panel.getByRole('button',{name:'1번 엔딩',exact:true}).click();await panel.getByRole('button',{name:'1번 엔딩',exact:true}).click();await panel.getByRole('button',{name:'도구 닫기'}).click();
 await select(2);await p.screenshot({path:`artifacts/score-navigation/${width}-endings.png`});assert.equal(await p.locator('[data-ending="1"]').count(),1);assert.equal(await p.locator('[data-ending="2"]').count(),1);
 await select(3);await p.locator('.mobileInputExtras').getByRole('button',{name:'마디 삭제',exact:true}).click();assert.equal(await p.locator('.etudeEditorMeasure').count(),5);assert.equal(await p.locator('[data-ending="2"]').count(),0);
 await editor.getByRole('button',{name:'실행 취소',exact:true}).first().click();assert.equal(await p.locator('.etudeEditorMeasure').count(),6);assert.equal(await p.locator('[data-ending="2"]').count(),1);
 await editor.getByRole('button',{name:'다시 실행',exact:true}).first().click();assert.equal(await p.locator('.etudeEditorMeasure').count(),5);
 const single=structuredClone(fixture);single.measures=[single.measures[0]];await load(single);assert(await p.locator('.mobileInputExtras').getByRole('button',{name:'마디 삭제',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);results.push({width,height,navigation:true,endings:true,deletionUndoRedo:true,saved:true});await p.close();
}}finally{await browser.close();await writeFile('artifacts/score-navigation/results.json',JSON.stringify(results,null,2));}
console.log(results);
