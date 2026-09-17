import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/score-spacing',{recursive:true});const results=[];
try{for(const width of [390,360,430,1440]){
 const p=await browser.newPage({viewport:{width,height:width===1440?1000:width===430?932:width===390?844:800},isMobile:width<500,hasTouch:width<500}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const fixture=await p.evaluate(async()=>{
  const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();d.measures=Array.from({length:4},()=>m.blankMeasure());
  for(let bar=0;bar<4;bar++)for(let event=0;event<8;event++){d=c.enterFretWithDuration(d,{bar,event,string:6},[9,7,5,2][bar],'8');d=c.enterFret(d,{bar,event,string:5},[7,5,3,4][bar]);}
  d.viewSettings.measuresPerRow=4;d.title='파워코드 간격 확인';return d;
 });
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'spacing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await p.waitForFunction(()=>document.querySelectorAll('.etudeEditorMeasure').length===4);
 await p.waitForTimeout(250);
 const editorGeometry=await p.locator('.etudeEditorMeasure').evaluateAll(bars=>bars.map(bar=>{
  const host=bar.querySelector('[data-draw-count]'),svg=host.shadowRoot.querySelector('svg'),matrix=svg.getScreenCTM();
  return {width:bar.getBoundingClientRect().width,svgWidth:svg.viewBox.baseVal.width,scale:matrix.a,
   xs:[...host.shadowRoot.querySelectorAll('.etudeEditorHit[data-mode="tab"][data-string="1"]')].map(el=>(Number(el.dataset.cursorX)+12)*matrix.a+matrix.e)};
 }));
 for(const bar of editorGeometry){assert.equal(bar.xs.length,8);for(let i=2;i<8;i++)assert(Math.abs(bar.xs[i]-bar.xs[i-1]-(bar.xs[1]-bar.xs[0]))<.01);assert(Math.abs(bar.scale-editorGeometry[0].scale)<.001);assert(Math.abs(bar.xs[1]-bar.xs[0]-(editorGeometry[0].xs[1]-editorGeometry[0].xs[0]))<.02);}
 assert(editorGeometry[0].width>editorGeometry[1].width);
 await p.screenshot({path:`artifacts/score-spacing/${width}-editor.png`});
 if(width===390){
  for(const view of ['TAB','오선보','오선보+TAB'])await p.getByRole('button',{name:view,exact:true}).click();
  await p.locator('.etudeEditorMeasure[data-bar-index="3"] .etudeNoteHandle[data-event="4"][data-mode="tab"][data-string="6"]').click();
  assert((await p.locator('.mobileScoreWorkspace output').first().innerText()).includes('4마디 · 3박 · 6번줄'));
  for(let bar=0;bar<4;bar++)for(const mode of ['tab','staff']){
   await p.locator(`.etudeEditorMeasure[data-bar-index="${bar}"] .etudeNoteHandle[data-event="0"][data-mode="${mode}"][data-string="6"]`).click();
   assert((await p.locator('.mobileScoreWorkspace output').first().innerText()).includes(`${bar+1}마디 · 1박 · 6번줄`));
   const cursor=await p.locator(`.etudeEditorMeasure[data-bar-index="${bar}"]`).evaluate((e,mode)=>{
    const root=e.querySelector('[data-draw-count]').shadowRoot,hit=root.querySelector(`.etudeNoteHandle[data-event="0"][data-mode="${mode}"][data-string="6"]`),marker=root.querySelector('.etudeInputCursor');
    return {hit:Number(hit.dataset.cursorX)+12,cursor:Number(marker.getAttribute('x'))+Number(marker.getAttribute('width'))/2};
   },mode);assert(Math.abs(cursor.hit-cursor.cursor)<.001);
  }
  const popup=p.waitForEvent('popup');
  await p.evaluate(async()=>{const {printEditorScore}=await import('/src/etudes/printScore.js');printEditorScore(document.querySelector('.etudeEditorCanvas'),'간격 인쇄 확인');});
  const print=await popup;await print.locator('section svg').first().waitFor();
  const boxes=await print.locator('section>div').evaluateAll(cells=>cells.map(cell=>({x:cell.getBoundingClientRect().x,y:cell.getBoundingClientRect().y,width:cell.getBoundingClientRect().width})));
  assert.equal(boxes.length,4);assert(boxes.every(box=>Math.abs(box.y-boxes[0].y)<.01));assert(boxes[1].x>=boxes[0].x+boxes[0].width-.01);await print.close();
 }

 const checks=await p.evaluate(async({fixture,mobile})=>{
  const {compileScoreDocument}=await import('/src/etudes/scoreDocument.js'),{drawScore,scoreSpacing}=await import('/src/etudes/Score.jsx'),{measureLayout}=await import('/src/etudes/measureLayout.js');
  const {scoreTimeline}=await import('/src/etudes/scorePlayback.js');
  const score=compileScoreDocument(fixture).score,before=JSON.stringify(score.document),holder=document.createElement('div'),beforeAudio=JSON.stringify(scoreTimeline(score));
  const metrics=drawScore(holder,score,{mobile});
  const plan=scoreSpacing(score,{placements:measureLayout(score.document.measures,4),view:'both',width:mobile?600:980});
  const tabPlan=scoreSpacing(score,{placements:measureLayout(score.document.measures,4),view:'tab',width:mobile?400:980});
  return {unchanged:before===JSON.stringify(score.document),audioUnchanged:beforeAudio===JSON.stringify(scoreTimeline(score)),metrics,plan,tabPlan};
 },{fixture,mobile:width<500});
 assert(checks.unchanged);assert(checks.audioUnchanged);
 assert(checks.plan.measures[0].inset>checks.plan.measures[1].inset);assert(checks.plan.measures[3].inset>checks.plan.measures[2].inset);
 assert.equal(checks.plan.measures[1].inset,checks.plan.measures[2].inset);assert(checks.tabPlan.measures.every(bar=>bar.inset===checks.tabPlan.measures[0].inset));
for(const bar of checks.metrics)for(const n of bar){assert(n.noteX+20<n.end);assert(Math.abs(n.noteCenterX-n.tabCenterX)<.001,JSON.stringify(n));}assert(checks.metrics[0][0].accidentals.length>0);assert.equal(checks.metrics[3][0].accidentals.length,2);
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true});await editor.getByRole('button',{name:width<500?'악보 저장':'이 브라우저에 저장',exact:true}).click();
 const modal=p.getByRole('dialog',{name:'악보 저장 정보'});await modal.getByLabel('악보 제목').fill(fixture.title);await modal.getByRole('button',{name:'저장하기'}).click();await modal.waitFor({state:'detached'});
 await editor.getByRole('button',{name:width<500?'악보 편집 뒤로':'닫기',exact:true}).click();await editor.waitFor({state:'detached'});await p.reload();await p.getByRole('button',{name:`${fixture.title} 열기`,exact:true}).click();await p.locator('.savedScoreHeading').waitFor();await p.locator('.etudeNotation svg').waitFor();
 const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.deepEqual(saved.measures,fixture.measures);
 const savedGeometry=await p.locator('.etudeNotation svg').evaluate(svg=>({width:svg.viewBox.baseVal.width,bars:[...svg.querySelectorAll('[data-playback-bar]')].map(bar=>JSON.parse(bar.dataset.points))}));
 assert(Math.abs(savedGeometry.width-checks.plan.width)<.001);
 for(const bar of savedGeometry.bars)for(let i=2;i<8;i++)assert(Math.abs(bar[i].x-bar[i-1].x-(bar[1].x-bar[0].x))<.001);
 await p.screenshot({path:`artifacts/score-spacing/${width}-saved.png`});await p.locator('.scoreLibraryPractice .etudeSheet').screenshot({path:`artifacts/score-spacing/${width}-score.png`});
 await p.getByRole('button',{name:'악보 음정·리듬 듣기',exact:true}).click();await p.locator('.savedScorePlayhead').waitFor({state:'attached'});const a=Number(await p.locator('.savedScorePlayhead').getAttribute('x1'));await p.waitForTimeout(200);assert(Number(await p.locator('.savedScorePlayhead').getAttribute('x1'))>a);await p.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 assert.deepEqual(errors,[]);results.push({width,editorGeometry,savedGeometry,dataPreserved:true,accidentalsPreserved:true,playhead:true});await p.close();
 }}finally{await browser.close();await writeFile('artifacts/score-spacing/results.json',JSON.stringify(results,null,2));}
console.log(results.map(({width,dataPreserved,accidentalsPreserved,playhead})=>({width,dataPreserved,accidentalsPreserved,playhead})));

