import fs from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
await p.addInitScript(()=>{
 localStorage.setItem('rifflabThemeMode','brand');window.tasks=[];window.frames=[];
 new PerformanceObserver(list=>window.tasks.push(...list.getEntries().map(e=>({time:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
 let last=performance.now();function frame(t){window.frames.push({time:t,ms:t-last});last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
});
await p.goto('http://127.0.0.1:5174/#mini-chord');await p.locator('.miniChordLoadPicker button').first().click();await p.getByRole('option').filter({hasText:'첫 번째 드라이브'}).click();
const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:4});await c.send('Performance.enable');
await p.getByRole('button',{name:'미니코드 반주 시작',exact:true}).click();await p.getByRole('button',{name:'미니코드 반주 정지',exact:true}).waitFor();
const phases=[];
for(const visible of [false,true,false,true]) {
 if(visible)await p.locator('.miniChordBar.is-playing').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
 else await p.locator('.miniChordMetronomePanel').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
 const start=await p.evaluate(()=>performance.now());const before=await c.send('Performance.getMetrics');
 await p.waitForTimeout(6000);
 const after=await c.send('Performance.getMetrics');
 const report=await p.evaluate(start=>({tasks:window.tasks.filter(x=>x.time>=start),frames:window.frames.filter(x=>x.time>=start),bar:document.querySelector('.miniChordBar.is-playing')?.dataset.miniChordBarIndex,activeRect:document.querySelector('.miniChordBar.is-playing')?.getBoundingClientRect().toJSON()}),start);
 const metrics={};for(const name of ['TaskDuration','LayoutDuration','RecalcStyleDuration','ScriptDuration'])metrics[name]=after.metrics.find(m=>m.name===name).value-before.metrics.find(m=>m.name===name).value;
 const phase={visible,start,metrics,...report};phases.push(phase);
 console.log(JSON.stringify({visible,metrics,longTasks:report.tasks.length,maxTask:Math.max(0,...report.tasks.map(t=>t.ms)),frames:report.frames.length,maxFrame:Math.max(...report.frames.map(t=>t.ms)),activeRect:report.activeRect}));
}
fs.writeFileSync(`output/mini-scroll-${process.env.MINI_SCROLL_TAG||'before'}.json`,JSON.stringify(phases));
}finally{await b.close();}
