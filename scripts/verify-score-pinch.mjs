import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();await page.locator('.etudeNotation svg').waitFor();await page.waitForTimeout(700);
const sizes=()=>page.evaluate(()=>({svg:document.querySelector('.etudeNotation svg').getBoundingClientRect().width,toolbar:document.querySelector('.etudePracticeToolbar').getBoundingClientRect().width,scale:visualViewport.scale}));
const pinch=async (start,end)=>{await page.locator('.etudeScoreViewport').evaluate((el,{start,end})=>{const send=(type,gap)=>{const touches=gap?[0,1].map((id)=>new Touch({identifier:id,target:el,clientX:300+(id?gap/2:-gap/2),clientY:200})):[];el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches}));};send('touchstart',start);send('touchmove',end);send('touchend',0);},{start,end});await page.waitForTimeout(300);};
const a=await sizes();await pinch(100,160);const b=await sizes();assert(b.svg>a.svg*1.5);assert.equal(b.toolbar,a.toolbar);assert.equal(b.scale,1);await pinch(160,100);const c=await sizes();assert(Math.abs(c.svg-a.svg)<3);console.log({before:a,expanded:b,contracted:c});
}finally{await browser.close();}
