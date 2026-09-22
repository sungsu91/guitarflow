import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [390,1440]){
 const p=await b.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/');await p.evaluate(async width=>{const {mount}=await import('/scripts/rhythm-progress-fixture.jsx');mount(width);},width);
 await p.locator('.savedScorePlayhead').waitFor({state:'attached'});
 const result=await p.evaluate(async()=>{const out=[];for(const tick of [1920,2040,2159,2160,2280,2399,2400,960]){
 rhythmTest.setTick(tick);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const touches=[...document.querySelectorAll('[data-rhythm-touch]')].filter(n=>n.querySelector('.rhythmFingeringTouch'));
 out.push({tick,notes:touches.map(n=>({bar:n.dataset.scoreBar,event:n.dataset.scoreEvent,text:n.querySelector('text')?.textContent,underline:n.querySelector('.rhythmFingeringTouch').getAttribute('x1'),clear:Number(n.querySelector('.rhythmFingeringTouch').getAttribute('y1'))>=n.querySelector('text').getBBox().y+n.querySelector('text').getBBox().height+1})),x:document.querySelector('.savedScorePlayhead').getAttribute('x1')});}return out;});
 for(const s of result.slice(0,3)){assert.equal(s.notes[0].text,'5');assert.equal(s.notes[0].event,'0');assert.ok(s.notes[0].clear);assert.equal(s.notes[0].underline,result[0].notes[0].underline);}
 for(const s of result.slice(3,6)){assert.equal(s.notes[0].text,'7');assert.equal(s.notes[0].event,'1');assert.equal(s.notes.length,1);assert.ok(s.notes[0].clear);}
 assert.notEqual(result[0].x,result[1].x);assert.equal(result[6].notes[0].event,'2');assert.equal(result[7].notes.length,0);
 await p.evaluate(()=>{rhythmTest.setTick(2160);});await p.waitForTimeout(60);await p.screenshot({path:`output/hammer-touch-${width}.png`});
 await p.getByRole('button',{name:'따라가기',exact:true}).click();assert.equal(await p.locator('.rhythmFingeringTouch').count(),0);
 assert.deepEqual(errors,[]);console.log(width,'5 held, exact onset jump to 7, pull-off jump, continuous playhead, unobscured digits, rest/off passed');await p.close();
}}finally{await b.close();}
