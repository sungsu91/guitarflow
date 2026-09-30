import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1920,height:1080}});
const doc=JSON.parse(await readFile(process.argv[2]||'artifacts/pdf-tab-100/final/0-document.json')),folder=process.env.PDF_TAB_UI_OUTPUT||'artifacts/pdf-tab-100/ui',errors=[];await mkdir(folder,{recursive:true});p.on('pageerror',e=>errors.push(e.message));
try{
 await p.addInitScript(d=>{localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{document:d,status:'draft'}}}));localStorage.setItem('fretiva.score.sound','false');},doc);
 await p.goto(`${process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5175'}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 await p.getByRole('button',{name:'내 저장 악보',exact:true}).click();await p.locator('.etudePickerCard').filter({hasText:doc.title}).click();await p.locator('.etudePickerDialog footer button').click();
 const play=p.locator('.etudePracticeStart');assert.equal(await play.isEnabled(),true);assert.equal(await p.locator('.etudeRemoteScoreSound').getAttribute('aria-pressed'),'true');await play.click();await p.getByRole('button',{name:'일시정지',exact:true}).waitFor();await p.waitForTimeout(1100);await p.screenshot({path:`${folder}/practice-playing.png`});
 await play.click();assert.equal(await play.getAttribute('aria-label'),'연습 재개');await p.locator('.etudePracticeStop').click();assert.equal(await play.getAttribute('aria-label'),'연습 시작');assert.deepEqual(errors,[]);
 await writeFile(`${folder}/practice.json`,JSON.stringify({unresolvedDraft:true,startEnabled:true,defaultSoundOn:true,startedPausedStopped:true,errors},null,2));
 console.log('Unresolved saved PDF draft starts, pauses and stops in practice view.');
}catch(e){await p.screenshot({path:`${folder}/practice-error.png`});throw e;}finally{await b.close();}
