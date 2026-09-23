import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 for(const mobile of [true,false]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  await page.locator('.etudeNotation svg').waitFor();
  if(mobile){
   await page.getByLabel('연습 유형',{exact:true}).selectOption({label:'아르페지오'});
   for(let i=0;i<14;i++)await page.getByRole('button',{name:'다음 연습곡',exact:true}).click();
   await page.getByRole('button',{name:'한 줄 4마디',exact:true}).click();
   await page.waitForTimeout(300);
   const before=await page.locator('.etudeNotation svg').getAttribute('viewBox');
   const result=await page.evaluate(async()=>{
    const viewport=document.querySelector('.etudeScoreViewport'),sheet=viewport.querySelector('.etudeSheet');
    const {drawScore}=await import('/src/etudes/Score.jsx');const {ETUDES}=await import('/src/etudes/catalog.js');
    const base=ETUDES.find(e=>e.type==='스케일');
    const dense={...base,document:undefined,measures:Array.from({length:4},()=>Array.from({length:16},(_,i)=>({...base.measures[0][0],duration:'16',onset:i*120,rest:false}))),chordShapes:undefined,harmony:undefined};
    const host=document.createElement('div');document.body.append(host);const start=performance.now();
    drawScore(host,dense,{mobile:true,responsive:true,view:'tab',measuresPerRow:4,editorWidth:358});
    const width=Number(host.querySelector('svg').getAttribute('width')),elapsed=performance.now()-start;host.remove();
    viewport.scrollTo({left:viewport.scrollWidth,top:viewport.scrollHeight});
    return {width,elapsed,scrollWidth:viewport.scrollWidth,background:getComputedStyle(viewport).backgroundColor,sheetBackground:getComputedStyle(sheet).backgroundColor,tail:getComputedStyle(sheet,'::after').height};
   });
   assert.ok(result.width<=4096,'64 sixteenths fit width budget');assert.ok(result.scrollWidth<=4128);assert.equal(result.background,'rgb(255, 255, 255)');assert.equal(result.sheetBackground,'rgba(0, 0, 0, 0)');assert.ok(parseFloat(result.tail)<=720);
   await page.waitForTimeout(1200);assert.equal(await page.locator('.etudeNotation svg').getAttribute('viewBox'),before,'scrolling must not trigger growing engraving');
   await page.screenshot({path:'artifacts/mobile-score-bounds.png'});console.log('mobile',result);
  }else{assert.notEqual(await page.locator('.etudeSheet').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');console.log('desktop background preserved');}
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
