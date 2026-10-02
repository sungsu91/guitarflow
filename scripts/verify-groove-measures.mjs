import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {extractGrooveBar} from '../src/metronome/groove.js';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const base=process.env.GROOVE_TEST_URL||'http://127.0.0.1:5173';
const results=[];
try {
for(const [width,theme] of [[1440,'light'],[390,'light'],[320,'light'],[768,'light'],[1440,'dark']]) {
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<700,hasTouch:width<1024});
 const page=await context.newPage();page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(theme=>{localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('language','ko');},theme);
 await page.goto(`${base}/#metronome`);
 await page.locator('.grooveModeSelector button').nth(2).click();
 if(theme==='dark')await page.locator('.desktopSidebarThemeOptions button').nth(1).click();
 const editor=page.locator('.grooveEditor');const cards=editor.locator('.grooveBarCard');
 const chooseLength=async count=>{
   let current=(await cards.count())||1;
   while(current<count){await editor.locator('.grooveAddBar').click();current++;}
   while(current>count){await editor.locator('.grooveReduceBar').click();current--;}
 };
 const step=editor.locator('.grooveTrack').nth(0).locator('.grooveBeat button').nth(1);
 await chooseLength(4);assert.equal(await cards.count(),4);
 await cards.nth(1).click();assert.equal(await step.getAttribute('aria-pressed'),'false');
 await step.click();assert.equal(await step.getAttribute('aria-pressed'),'true');
 await cards.nth(0).click();assert.equal(await step.getAttribute('aria-pressed'),'false');
 await cards.nth(2).click();await editor.locator('.grooveCopyBar').click();assert.equal(await step.getAttribute('aria-pressed'),'true');
 await chooseLength(1);await chooseLength(4);await cards.nth(1).click();assert.equal(await step.getAttribute('aria-pressed'),'true');
 await chooseLength(3);assert.equal(await cards.count(),3);await editor.locator('.grooveAddBar').click();assert.equal(await cards.count(),4);assert.equal(await cards.nth(3).getAttribute('aria-pressed'),'true');
 assert.equal(await step.getAttribute('aria-pressed'),'false');
 await editor.locator('.grooveSaveButton').click();await page.getByRole('combobox',{name:'저장 범위',exact:true}).selectOption('arrangement');await page.locator('.groovePackDialog form input').fill('Four-bar verification');await page.locator('.groovePackDialog button[type=submit]').click();
 const pack=await page.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1'))[0]);
 assert.equal(pack.pattern.barCount,4);assert.equal(extractGrooveBar(pack.pattern,1).rows[0].steps[1],true);assert.equal(extractGrooveBar(pack.pattern,0).rows[0].steps[1],false);
 if(theme==='light') {
   for(let i=0;i<16;i++)await page.locator('.standaloneMetronomePanel .metronomeHeroBpmJumpButton--up:visible').click();
   await page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();
   const played=new Set();
   for(let i=0;i<24;i++){
     const view=await editor.evaluate(el=>{
       const cards=[...el.querySelectorAll('.grooveBarCard')];
       const active=cards.findIndex(e=>e.classList.contains('is-playing'));
       return {active,selected:cards.findIndex(e=>e.getAttribute('aria-pressed')==='true'),current:cards.findIndex(e=>e.getAttribute('aria-current')==='step'),grid:el.querySelector('.grooveHorizontalScroll').getAttribute('aria-label'),note:el.querySelector('.grooveTrack .grooveBeat button:nth-child(2)').getAttribute('aria-pressed')};
     });
     if(view.active>=0){
       played.add(view.active);
       assert.equal(view.selected,view.active);assert.equal(view.current,view.active);
       assert.ok(view.grid.endsWith(`마디 ${view.active+1}`));
       assert.equal(view.note,String(Boolean(extractGrooveBar(pack.pattern,view.active).rows[0].steps[1])));
     }
     await page.waitForTimeout(250);
   }
   assert.deepEqual([...played].sort(),[0,1,2,3]);
   await page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();
   assert.equal(await editor.locator('.grooveBarCard.is-playing').count(),0);
   await cards.nth(0).click();assert.equal(await cards.nth(0).getAttribute('aria-pressed'),'true');
   await page.reload();await page.locator('.grooveModeSelector button').nth(2).click();await page.locator('.groovePacksTrigger').click();
   await page.locator('#groove-tab-saved').click();await page.getByRole('button',{name:'마디 구성',exact:true}).click();await page.locator('.groovePackPick').filter({hasText:'Four-bar verification'}).click();await page.locator('.groovePackLoad>button').click();
   assert.equal(await cards.count(),4);await cards.nth(1).click();assert.equal(await step.getAttribute('aria-pressed'),'true');
 }
 await editor.scrollIntoViewIfNeeded();
 const layout=await editor.evaluate(el=>{
   const rect=el.getBoundingClientRect();
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,editorRight:rect.right,cards:[...el.querySelectorAll('.grooveBarCard')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,y:r.y};})};
 });
 assert.ok(layout.scroll<=width+1,JSON.stringify(layout));assert.ok(layout.cards.every(c=>c.left>=0 && c.right<=width+1 && c.width>90),JSON.stringify(layout));
 await page.screenshot({path:`work/groove-measures/${width}-${theme}.png`,fullPage:true});
 assert.deepEqual(errors,[]);
 results.push({width,theme,status:'passed',layout});console.log(width,theme,'passed');await context.close();
}
await fs.writeFile('work/groove-measures/verification.json',JSON.stringify(results,null,2));
} finally {await browser.close();}
