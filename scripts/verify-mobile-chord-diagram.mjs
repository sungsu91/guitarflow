import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const url=process.env.RIFFLAB_URL??'http://127.0.0.1:5173/#etudes';
try{
 for(const [width,height] of [[390,844],[320,667],[430,932]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'악보 만들기',exact:true}).click();
  await page.getByRole('button',{name:'코드표',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'코드표 만들기',exact:true});await modal.waitFor();
  const open=page.getByRole('button',{name:'1번줄 개방현·뮤트 전환',exact:true});
  for(const value of ['○','×','']){await open.tap();assert.equal(await open.textContent(),value);}
  const cell=(string,fret)=>page.getByRole('button',{name:`${string}번줄 ${fret}프렛`,exact:true});
  await cell(2,1).tap();assert.equal(await cell(2,1).getAttribute('aria-pressed'),'true');
  await cell(2,1).tap();assert.equal(await cell(2,1).getAttribute('aria-pressed'),'false');
  await cell(5,3).tap();await cell(4,2).tap();await cell(2,1).tap();
  assert.equal(await modal.locator('.chordCandidates button[aria-pressed=true]').textContent(),'C');
  await modal.locator('.chordCandidates').getByRole('button',{name:'C',exact:true}).tap();
  await cell(2,1).tap();
  assert.equal(await modal.locator('.chordCandidates button[aria-pressed=true]').textContent(),'Cmaj7');
  assert.match(await modal.locator('.chordCandidateHelp').textContent(),/개방현/);
  await page.getByRole('button',{name:'코드표 운지 초기화',exact:true}).click();
  // A real touch swipe scrolls the board and must not accidentally place a note.
  const session=await page.context().newCDPSession(page),rect=await page.locator('.chordFretScroll').boundingBox();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width-20,y:rect.y+100}]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+rect.width-20-i*20,y:rect.y+100}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.locator('.chordFixedBeam').count(),0);
  await page.waitForFunction(()=>document.querySelector('.chordFretScroll').scrollLeft>40);
  assert.equal(await page.getByRole('slider',{name:'표시 프렛 수'}).inputValue(),'5');
  assert.equal(await modal.locator('.chordFingerDot').count(),0);
  await page.waitForTimeout(700); // Let native swipe momentum settle before loading a preset.
  await page.getByLabel('코드표 불러오기').selectOption({label:'C'});
  await page.waitForFunction(()=>document.querySelector('.chordFretScroll').scrollLeft<1);
  assert.equal(await modal.locator('.chordCandidates button[aria-pressed=true]').textContent(),'C');
  assert.equal(await page.locator('.chordBeatStrip').count(),0);
  assert.equal(await page.getByRole('checkbox',{name:'선택 운지 자동 기입',exact:false}).isChecked(),false);
  assert.ok(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.screenshot({path:`artifacts/chord-dialog-${width}.png`});
  await page.getByRole('button',{name:'악보에 붙이기',exact:true}).click();
  assert.equal(await page.locator('.etudeChordRange').count(),0);
  assert.ok((await page.locator('.etudeChordDiagram').boundingBox()).width<150);
  assert.equal(await page.locator('.etudeChordDiagram').count(),1);
  await page.screenshot({path:`artifacts/chord-applied-${width}.png`});
  await page.getByRole('button',{name:'코드표',exact:true}).click();
  assert.equal(await page.locator('.chordBeatStrip').count(),0);
  await page.getByRole('button',{name:'코드표 운지 초기화',exact:true}).click();
  await cell(3,2).tap();
  const gripBeforeBarre=await modal.locator('.chordGripSummary strong').textContent();
  await cell(1,1).scrollIntoViewIfNeeded();const first=await cell(1,1).boundingBox();
  await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();
  await page.waitForTimeout(550);await page.mouse.up();
  await cell(6,1).click();
  assert.match(await modal.locator('.chordBarreHint').last().textContent(),/바레 1프렛 · 6→1번 줄/);
  assert.equal(await modal.locator('.chordFingerDot').count(),1);
  assert.equal(await cell(3,2).getAttribute('aria-pressed'),'true');
  assert.equal(await modal.locator('.chordGripSummary strong').textContent(),gripBeforeBarre);
  await page.screenshot({path:`artifacts/chord-barre-mint-${width}.png`});
  await page.getByRole('button',{name:'직접 입력',exact:true}).click();await page.getByLabel('코드명 직접 입력').fill('Custom');
  await page.getByRole('button',{name:'변경 적용',exact:true}).click();await page.locator('.etudeChordBarre').waitFor({state:'attached'});
  await page.getByRole('button',{name:'코드표',exact:true}).click();await page.getByRole('button',{name:'코드표 삭제',exact:true}).click();
  assert.equal(await page.locator('.etudeChordDiagram').count(),0);
  assert.deepEqual(errors,[]);console.log(`${width}px: gestures, naming, range, attachment, edit and delete passed`);await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(url);await page.getByRole('button',{name:'악보 만들기',exact:true}).click();await page.locator('.desktopNotationViews').waitFor();
 assert.equal(await page.locator('.desktopNotationViews>button[aria-pressed]').count(),3);assert.equal(await page.locator('.scoreChordButton').count(),0);console.log('Desktop toolbar preserved');await page.close();
}finally{await browser.close();}


