import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const routes=['fretboard','tuner','metronome','stage1','stage2','stage3','stage4','mini-chord','audio-studio','etudes','shooter','main','rhythm-training','tutorial','design-lab'];
const sizes=[[360,800],[375,812],[390,844],[393,852],[430,932],[1440,900]];
const results=[],controls=[];
fs.mkdirSync('artifacts/i18n',{recursive:true});
const save=()=>fs.writeFileSync('artifacts/i18n/matrix.json',JSON.stringify({controls,results},null,2));
async function setLanguage(page,language){await page.evaluate(language=>{localStorage.setItem('language',language);window.dispatchEvent(new StorageEvent('storage',{key:'language',newValue:language}));},language);await page.waitForTimeout(120);}
async function inspect(page){return page.evaluate(()=>{
 const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight;};
 const overflow=[...document.querySelectorAll('button,label,summary,h1,h2,h3,strong')].filter(visible).filter(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth+3).map(el=>({text:el.textContent.trim().slice(0,100),className:el.className,client:el.clientWidth,scroll:el.scrollWidth}));
 const korean=[...document.querySelectorAll('body *')].filter(visible).filter(el=>el.children.length===0&&/[가-힣]/.test(el.textContent)).map(el=>el.textContent.trim()).filter(Boolean);
 return {lang:document.documentElement.lang,hash:location.hash,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow,korean:[...new Set(korean)],elements:document.querySelectorAll('*').length,scrollY};
});}
try{
 for(const[width,height]of sizes){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('__i18n_test_seeded')){localStorage.setItem('__i18n_test_seeded','1');localStorage.setItem('__i18n_preservation_fixture','사용자 곡 제목 / Save / 저장');}});
  await page.goto('http://127.0.0.1:5175/?lab=1#fretboard');
  await page.waitForTimeout(5000);
  if(width>=1000){await page.locator('.desktopSidebarSettings > summary').click();await page.getByRole('combobox',{name:'언어',exact:true}).selectOption('en');}
  else{await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.getByRole('radio',{name:'English',exact:true}).click();await page.locator('.utilityMenuHeader button').click();}
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.reload();await page.waitForTimeout(5000);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__i18n_preservation_fixture')),'사용자 곡 제목 / Save / 저장');
  controls.push({width,settingsSwitch:true,reloadPersistence:true,existingStoragePreserved:true});
  for(const route of routes){
   await page.evaluate(route=>{location.hash=route;},route);await page.waitForTimeout(route==='etudes'?1000:300);
   const states={};for(const language of ['ko','en','ko']){await setLanguage(page,language);states[language==='ko'&&states.ko?'returnedKo':language]=await inspect(page);}
   results.push({width,height,route,states,errors:[...errors]});
   if([390,1440].includes(width)){await setLanguage(page,'en');await page.screenshot({path:`artifacts/i18n/${route}-${width}-en.png`});}
   save();
  }
  console.log(`Verified ${width}x${height}: ${routes.length} routes, ko → en → ko`);
  await page.close();
 }
}finally{save();await browser.close();}
console.log('Matrix complete:',results.length,'route/viewport combinations');
