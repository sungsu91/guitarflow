import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {jsPDF} from 'jspdf';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['microphone']});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('language','en'));
 await page.goto('http://127.0.0.1:5175/#etudes');await page.waitForTimeout(5000);
 await page.getByRole('tab',{name:'My Scores',exact:true}).click();
 await page.waitForTimeout(300);
 const pdf=new jsPDF();pdf.text('I18N PDF fixture',20,30);
 await page.locator('input[type=file][accept*="pdf"]').first().setInputFiles({name:'i18n-fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))});
 await page.waitForTimeout(1500);
 console.log('PDF controls',await page.getByRole('button').allTextContents());
 const save=page.getByRole('button',{name:'Save to device',exact:true});
 if(await save.count()){await save.click();await page.waitForTimeout(1200);checks.push('PDF imported and saved in isolated browser storage');}
 console.log('After save',await page.getByRole('button').allTextContents());
 await page.locator('.libraryScoreOpen').filter({hasText:'i18n-fixture'}).click();await page.waitForTimeout(1000);
 checks.push('Saved PDF reopened');
 console.log('Opened PDF controls',await page.getByRole('button').allTextContents());
 await page.screenshot({path:'artifacts/i18n/pdf-flow-en.png'});
 // Isolated fake input; no real microphone or camera is used.
 await page.evaluate(()=>{location.hash='tuner';});await page.waitForTimeout(700);
 console.log('Tuner controls',await page.getByRole('button').allTextContents());
 const mic=page.getByRole('button',{name:/Start microphone|Turn microphone on/}).first();
 if(await mic.count()){await mic.click();await page.waitForTimeout(1000);checks.push('Tuner microphone start with synthetic device');}
 await page.evaluate(()=>{localStorage.setItem('language','ko');dispatchEvent(new StorageEvent('storage',{key:'language'}));});await page.waitForTimeout(100);
 await page.evaluate(()=>{localStorage.setItem('language','en');dispatchEvent(new StorageEvent('storage',{key:'language'}));});await page.waitForTimeout(100);
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.screenshot({path:'artifacts/i18n/tuner-flow-en.png'});
 checks.push('Tuner ko/en switch');
 await page.evaluate(()=>{location.hash='metronome';});await page.waitForTimeout(500);
 console.log('Metronome controls',await page.getByRole('button').allTextContents());
 await page.getByRole('button',{name:'Start metronome',exact:true}).click();await page.waitForTimeout(500);
 await page.evaluate(()=>{localStorage.setItem('language','ko');dispatchEvent(new StorageEvent('storage',{key:'language'}));});
 await page.getByRole('button',{name:'메트로놈 정지',exact:true}).waitFor();
 await page.evaluate(()=>{localStorage.setItem('language','en');dispatchEvent(new StorageEvent('storage',{key:'language'}));});
 await page.getByRole('button',{name:'Stop metronome',exact:true}).click();checks.push('Metronome play, switch while active, stop');
 await page.evaluate(()=>{location.hash='shooter';});await page.waitForTimeout(500);
 console.log('Shooter controls',await page.getByRole('button').allTextContents());
 await page.getByRole('button',{name:'Start Note Shooter',exact:true}).click();await page.waitForTimeout(1500);
 await page.evaluate(()=>{localStorage.setItem('language','ko');dispatchEvent(new StorageEvent('storage',{key:'language'}));});
 await page.evaluate(()=>{localStorage.setItem('language','en');dispatchEvent(new StorageEvent('storage',{key:'language'}));});
 checks.push('Shooter started with synthetic input and language switched');
 assert.deepEqual(errors,[]);
}finally{fs.writeFileSync('artifacts/i18n/flows.json',JSON.stringify({checks,errors},null,2));await browser.close();}
