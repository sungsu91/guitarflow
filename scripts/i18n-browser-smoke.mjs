import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
fs.mkdirSync('artifacts/i18n',{recursive:true});
const results=[];
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,isMobile:viewport.width<1000,hasTouch:viewport.width<1000});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/#fretboard');
  await page.waitForTimeout(6000);
  for(const language of ['ko','en']){
   await page.evaluate(async lang=>{const i18n=await import('/src/i18n/core.js');i18n.setLanguage(lang);},language);
   await page.waitForTimeout(500);
   await page.screenshot({path:`artifacts/i18n/fretboard-${viewport.width}-${language}.png`,fullPage:true});
   results.push({width:viewport.width,language,errors:[...errors],text:(await page.locator('body').innerText()).slice(0,6000),overflow:await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}))});
  }
  await page.close();
 }
}finally{await browser.close();fs.writeFileSync('artifacts/i18n/smoke.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
