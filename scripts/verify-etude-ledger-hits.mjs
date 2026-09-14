import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),reports=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/#etudes');
 const baseline=await page.evaluate(async()=>{
  const {createBlankDocument}=await import('/src/etudes/scoreModel.js');
  const {enterFret}=await import('/src/etudes/editorCommands.js');
  const {saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');
  let d=createBlankDocument();d.title='Ledger ownership regression';
  // Below/above staff, shared + displaced chord ledgers, and a real TAB zero.
  for(const [event,string,fret] of [[0,6,0],[1,1,20],[2,1,17],[2,2,21],[3,3,0]])d=enterFret(d,{bar:0,event,string},fret);
  saveLibraryDocument(localStorage,d);return d;
 });
 await page.reload();await page.getByRole('button',{name:'기존 연습곡 · 에튀드',exact:true}).click();await page.locator('.etudeLibrary summary').click();
 await page.locator('.etudeLibrary div').filter({hasText:baseline.title}).getByRole('button',{name:'열기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true}),canvas=dialog.getByRole('group',{name:'악보 키보드 입력'});
 await canvas.locator('.etudeLedgerHit').first().waitFor();
 const count=await canvas.locator('.etudeLedgerHit').count();assert.ok(count>8);
 const results=[];
 for(const zoom of [50,100,150]){
  await dialog.getByLabel('편집 악보 확대').selectOption(String(zoom));
  const drawCounts=await canvas.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>e.dataset.drawCount));
  for(let index=0;index<count;index++){
   const ledger=canvas.locator('.etudeLedgerHit').nth(index);await ledger.scrollIntoViewIfNeeded();
   // Both ends are outside the notehead; intermediate ledger lines also have
   // a different pitch from their owner. Resolve overlapping chord ownership.
   for(const edge of ['left','right']){
    await ledger.scrollIntoViewIfNeeded();
    const point=await ledger.evaluate((el,edge)=>{
     const p=el.ownerSVGElement.createSVGPoint();p.x=Number(el.getAttribute('x'))+(edge==='left'?2:Number(el.getAttribute('width'))-2);p.y=Number(el.getAttribute('y'))+3;
     const q=p.matrixTransform(el.getScreenCTM()),x=Math.round(q.x),y=Math.round(q.y),hit=el.getRootNode().elementFromPoint(x,y);
     return {x,y,event:hit?.dataset.event,string:hit?.dataset.string,midi:hit?.dataset.midi,cy:hit?.dataset.cursorY,ledger:hit?.classList.contains('etudeLedgerHit')};
    },edge);
    assert.ok(point.string&&point.midi,`ledger area must select an existing note: ${JSON.stringify(point)}`);
    if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
    const marker=canvas.locator('.etudeInputCursor');
    assert.equal(Number(await marker.getAttribute('y')),Number(point.cy)+2,`cursor stays on owning note pitch: ${JSON.stringify({mobile,zoom,index,edge,point})}`);
    if(mobile){
     await canvas.press('Tab');
     const tabHead=canvas.locator(`.etudeNoteHandle[data-mode="tab"][data-event="${point.event}"][data-string="${point.string}"]`);
     assert.equal(await marker.getAttribute('y'),await tabHead.getAttribute('data-cursor-y'),'selected owner carries its string into TAB mode');
    }else{
     const label=await dialog.locator('.etudeCurrentNote small').textContent();
     assert.ok(label.includes(`${point.string}번줄`),`owning string selected: ${label}`);
    }
    results.push({zoom,event:point.event,string:point.string,edge,ledger:point.ledger});
   }
  }
  assert.deepEqual(await canvas.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>e.dataset.drawCount)),drawCounts,'selection does not re-engrave');
 }
 // An actual open string is still selected normally in TAB.
 const zero=canvas.locator('.etudeNoteHandle[data-mode="tab"][data-event="3"][data-string="3"]');
 await zero.scrollIntoViewIfNeeded();await zero.click();
 assert.ok((await dialog.locator(mobile?'.etudeInputPalette strong':'.etudeCurrentNote small').textContent()).includes('3번줄'));
 await dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();
 const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,baseline.id);
 assert.deepEqual(saved,baseline,'ledger / TAB selection, zoom and scrolling preserve all music');
 assert.ok(results.some(r=>r.ledger),'intermediate ledgers tested outside notehead handles');
 assert.deepEqual(errors,[]);reports.push({mobile,ledgerCount:count,clicks:results.length,musicUnchanged:true,selectionDoesNotEngrave:true,openStringUnchanged:true,errors});await page.close();
}}finally{await browser.close();}
await mkdir('artifacts/etude-input',{recursive:true});
await writeFile('artifacts/etude-input/ledger-hits.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
