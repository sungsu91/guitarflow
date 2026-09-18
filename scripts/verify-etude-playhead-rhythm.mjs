import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
await mkdir('artifacts/etude-playhead',{recursive:true});
await writeFile('artifacts/etude-playhead/fixture.html',`<!doctype html><html><body><div id="root"></div><script type="module">
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Score from '/src/etudes/Score.jsx';import ScorePlayback from '/src/etudes/ScorePlayback.jsx';import {ETUDES} from '/src/etudes/catalog.js';
const h=React.createElement,base=ETUDES[0],n=base.measures[0][0];
const fixture={...base,document:undefined,id:'test-only-playhead',bpm:240,meter:[4,4],measures:[[
 {...n,onset:0,duration:'4',dotted:true}, {...n,onset:720,duration:'8',rest:true},
 ...[0,1,2].map(i=>({...n,onset:960+i*160,duration:'8',tuplet:{groupId:'fixture-triplet',actualNotes:3,normalNotes:2}})),
 {...n,onset:1440,duration:'4',tones:[n,base.measures[0][1]]}], [{...n,onset:0,duration:'1',rest:true}]],repeatMarks:[{repeatStart:true},{repeatEnd:true}]};
function App(){const [score,setScore]=useState(fixture),[position,setPosition]=useState(null),[target,setTarget]=useState(null),[view,setView]=useState('both');window.fixture={position,setView,edit:()=>setScore(s=>({...s,measures:[[...s.measures[0].map((e,i)=>i===0?{...e,dotted:false}:i===1?{...e,onset:480,duration:'4'}:e)],s.measures[1]]}))};return h('main',{style:{width:900,'--theme-accent':'#795536'}},h('div',{ref:setTarget}),h(ScorePlayback,{toolbar:true,toolbarTarget:target,score,bpm:240,onPosition:setPosition}),h(Score,{etude:score,bpm:240,view,playPosition:position}));}createRoot(document.getElementById('root')).render(h(App));
</script></body></html>`);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.goto('http://127.0.0.1:5173/artifacts/etude-playhead/fixture.html');await page.getByRole('button',{name:'악보 듣기',exact:true}).click();
await page.waitForFunction(()=>window.fixture.position?.event===1&&window.fixture.position?.visit===0);await page.getByRole('button',{name:'일시정지',exact:true}).click();
const rest=await page.evaluate(()=>({position:{bar:fixture.position.bar,event:fixture.position.event,tick:fixture.position.getBarTick()},points:JSON.parse(document.querySelector('[data-playback-bar="0"]').dataset.points),x:Number(document.querySelector('.savedScorePlayhead').getAttribute('x1'))}));assert.equal(rest.position.event,1);assert.ok(rest.position.tick>=720&&rest.position.tick<960);
const {playheadX}=await import('../src/etudes/scorePlayhead.js');assert.ok(Math.abs(rest.x-playheadX(rest.points,rest.position.tick))<.01);
await page.getByRole('button',{name:'이어서 재생',exact:true}).click();await page.waitForFunction(()=>window.fixture.position?.event===3&&window.fixture.position?.visit===0);await page.getByRole('button',{name:'일시정지',exact:true}).click();const triplet=await page.evaluate(()=>fixture.position.getBarTick());assert.ok(triplet>=1120&&triplet<1280);
await page.getByRole('button',{name:'이어서 재생',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.visit==='2');await page.getByRole('button',{name:'일시정지',exact:true}).click();assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-bar'),'0');
for(const view of ['staff','tab','both']){await page.evaluate(v=>fixture.setView(v),view);await page.waitForFunction(v=>document.querySelector('.etudeNotation svg')?.dataset.notationView===v,view);assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-visit'),'2');}
await page.getByRole('button',{name:'악보 재생 정지',exact:true}).click();await page.evaluate(()=>fixture.edit());await page.getByRole('button',{name:'악보 듣기',exact:true}).click();await page.waitForFunction(()=>window.fixture.position?.event===1);await page.getByRole('button',{name:'일시정지',exact:true}).click();const edited=await page.evaluate(()=>JSON.parse(document.querySelector('[data-playback-bar="0"]').dataset.points)[1].tick);assert.equal(edited,480);
assert.deepEqual(errors,[]);const result={rest:rest.position,tripletTick:triplet,repeatVisit:2,viewSwitchPreservesVisit:true,editedRestOnset:edited,errors};await writeFile('artifacts/etude-playhead/rhythm-results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}

