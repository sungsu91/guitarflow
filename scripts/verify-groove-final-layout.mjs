import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,channel:'msedge'});
const report=[];
try{for(const [width,height] of [[360,800],[375,812],[390,844],[393,852],[430,932]]){
const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5176/#metronome');await p.getByRole('button',{name:'3 그루브',exact:true}).click();await p.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();
const d=p.getByRole('dialog',{name:'그루브팩',exact:true});assert.ok(await d.getByRole('button',{name:'불러오기',exact:true}).isDisabled());
await d.getByRole('button',{name:'블루스 셔플',exact:true}).click();
const layout=await d.evaluate(e=>{const r=e.getBoundingClientRect(),rows=[...e.querySelectorAll('.groovePackRow')];return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:e.scrollWidth>e.clientWidth,rowHeights:rows.map(x=>x.getBoundingClientRect().height),font:getComputedStyle(e.querySelector('.groovePackCopy strong')).fontSize,background:getComputedStyle(e).backgroundColor,categories:[...e.querySelectorAll('.groovePackCategories button')].map(x=>({text:x.textContent,y:x.getBoundingClientRect().y}))};});
assert.ok(layout.x>=0&&layout.x+layout.width<=width&&layout.y>=0&&layout.y+layout.height<=height);assert.equal(layout.overflow,false);assert.ok(layout.rowHeights.every(h=>h===39));assert.equal(new Set(layout.categories.map(c=>c.y)).size,1);assert.equal(await d.locator('.groovePackCopy small,.groovePackCheck').count(),0);
const footer=d.locator('.groovePackLoad'),before=await footer.boundingBox();await d.locator('.groovePackResults').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await footer.boundingBox(),before);
await d.locator('.groovePackResults').evaluate(e=>e.scrollTop=0);
await p.screenshot({path:`output/groove-final-${width}.png`});
if(width===390){await p.locator('.app.metronomeMode').evaluate(e=>e.classList.remove('theme-light'));assert.equal(await d.locator('.groovePackRow').first().evaluate(e=>e.getBoundingClientRect().height),39);await p.screenshot({path:'output/groove-final-other-theme.png'});}
assert.deepEqual(errors,[]);report.push(layout);await p.close();console.log('PASS final layout',width,height);
}
writeFileSync('output/groove-final-layout.json',JSON.stringify(report,null,2));
}finally{await b.close();}
