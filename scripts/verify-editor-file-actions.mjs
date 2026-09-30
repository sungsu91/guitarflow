import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createBlankDocument} from '../src/etudes/scoreModel.js';

const first={...createBlankDocument(),title:'플라워댄스',bpm:60};
const second={...createBlankDocument(),title:'연습 초안',bpm:84};
const records={[first.id]:{document:first,status:'saved'},[second.id]:{document:second,status:'draft'}};
const out='work/editor-file-actions';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
let page;
try{
 page=await browser.newPage({viewport:{width:1920,height:1080}});page.setDefaultTimeout(15000);
 const errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.addInitScript(records=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records}));},records);
 await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'제작',exact:true}).click();await page.locator('[data-score-input]').waitFor();
 const open=async title=>{await page.locator('.etudeHeaderActions').getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:title}).click();};
 const title=()=>page.locator('.etudePaperHeading h3').innerText();
 const change=async()=>{await page.getByRole('button',{name:'마디 추가',exact:true}).click();};
 const save=async()=>{await page.locator('.scoreSaveDialog button[type=submit]').click();await page.locator('.scoreSaveDialog').waitFor({state:'hidden'});};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records);
 await page.locator('.etudeHeaderActions').getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();
 assert.equal(await page.locator('.scoreOpenItem').count(),2);
 await page.getByRole('searchbox',{name:'악보 검색'}).fill('없는 곡');assert.match(await page.locator('.scoreOpenEmpty').innerText(),/검색 결과/);
 await page.getByRole('searchbox',{name:'악보 검색'}).fill('플라워');assert.equal(await page.locator('.scoreOpenItem').count(),1);
 await page.getByRole('searchbox',{name:'악보 검색'}).fill('');
 await page.screenshot({path:`${out}/library.png`});await page.keyboard.press('Escape');assert(await page.locator('[data-score-input]').isVisible());
 await open(first.title);assert.equal(await title(),first.title);assert.match(await page.locator('.etudeHeaderActions [role=status]').innerText(),/변경 없음/);
 assert.equal(await page.locator('.etudeEditorBrand').count(),0);assert.equal(await page.locator('.etudeEditor--desktop input[type=file]').count(),0);
 assert.equal(await page.getByRole('button',{name:'파일 내려받기',exact:true}).count(),0);
 const nav=await page.locator('.etudeDocumentMenus').boundingBox(),actions=await page.locator('.etudeHeaderActions').boundingBox();assert(Math.abs(nav.y+nav.height/2-actions.y-actions.height/2)<2);
 await page.screenshot({path:`${out}/desktop-1920.png`});
 // Cancel keeps edits, discard reopens from storage, and saving keeps each score's identity.
 await change();await open(second.title);await page.getByRole('button',{name:'계속 편집',exact:true}).click();assert.equal(await title(),first.title);
 await open(first.title);await page.getByRole('button',{name:'저장하지 않고 불러오기',exact:true}).click();assert.equal(await page.locator('[data-bar-index]').count(),first.measures.length);
 await change();await open(second.title);await page.getByRole('button',{name:'저장 후 불러오기',exact:true}).click();await save();assert.equal(await title(),second.title);assert.equal((await stored())[first.id].document.measures.length,2);assert.equal((await stored())[second.id].document.measures.length,1);
 await change();await open(second.title);await page.getByRole('button',{name:'저장 후 불러오기',exact:true}).click();await save();assert.equal(await page.locator('[data-bar-index]').count(),2);assert.match(await page.locator('.etudeHeaderActions [role=status]').innerText(),/변경 없음/);
 await page.locator('.etudeHeaderActions').getByRole('button',{name:'PDF 저장',exact:true}).click();
 const preview=page.locator('.print-preview-overlay');await preview.locator('.score-print-page').first().waitFor();
 await preview.getByRole('button',{name:'PDF 저장',exact:true}).click();const pending=page.waitForEvent('download');await preview.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();const pdf=await pending;assert.match(pdf.suggestedFilename(),/\.pdf$/);await pdf.saveAs(`${out}/editor-export.pdf`);assert.equal((await readFile(`${out}/editor-export.pdf`)).subarray(0,5).toString(),'%PDF-');assert(downloads.every(n=>n.endsWith('.pdf')));
 await preview.getByRole('button',{name:'닫기',exact:true}).click();await preview.waitFor({state:'hidden'});
 await page.setViewportSize({width:1024,height:900});await page.screenshot({path:`${out}/desktop-1024.png`});
 const bounds=await page.locator('.etudeHeaderActions button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));assert(bounds.every(Boolean));assert.deepEqual(errors,[]);
 await page.close();
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(15000);
 await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:'제작',exact:true}).click();await page.locator('[data-score-input]').waitFor();
 assert.equal(await page.locator('.desktopEditorTopBar').count(),0);assert(await page.locator('.mobileScoreHeader').isVisible());await page.screenshot({path:`${out}/mobile-390.png`});
 console.log('PASS: saved-score search, empty results, Escape, desktop header, cancel/discard/save switching including same score, PDF download, narrow desktop and separate mobile UI');
}catch(error){await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}finally{await browser.close();}
