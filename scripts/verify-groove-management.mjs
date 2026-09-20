import assert from 'node:assert/strict';
import {createGroovePattern} from '../src/metronome/groove.js';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,channel:'msedge'});
try {
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.previewSources=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(t,...args){window.previewSources.push({time:t,source:this});return start.call(this,t,...args)};});
await p.goto('http://127.0.0.1:5176/#metronome');await p.getByRole('button',{name:'3 그루브',exact:true}).click();
await p.evaluate(pattern=>localStorage.setItem('rifflab.metronome.groove-packs.v1',JSON.stringify(['첫 팩','둘째 팩'].map((title,i)=>({id:String(i),title,pattern,timeSignature:'4/4',subdivision:'sixteenth'})))),createGroovePattern());
await p.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();const d=p.getByRole('dialog',{name:'그루브팩',exact:true});
await d.getByRole('button',{name:'16비트 미리 듣기',exact:true}).click();await p.waitForFunction(()=>window.previewSources.length>=20);assert.equal(await d.locator('.groovePackPick[aria-pressed=true] strong').innerText(),'8비트');
await d.getByRole('button',{name:'16비트 미리 듣기 정지',exact:true}).click();assert.equal(await d.getByRole('button',{name:'16비트 미리 듣기',exact:true}).count(),1);
await d.getByRole('button',{name:'8비트 미리 듣기',exact:true}).click();await p.waitForTimeout(3600);assert.equal(await d.getByRole('button',{name:'8비트 미리 듣기',exact:true}).count(),1);
await d.getByRole('tab',{name:'내 저장 팩',exact:true}).click();await d.getByRole('button',{name:'팩 관리',exact:true}).click();await d.getByRole('button',{name:'첫 팩 위로 이동',exact:true}).click();assert.match(await d.locator('.groovePackPick').first().innerText(),/첫 팩/);
await d.locator('.groovePackRow').first().getByRole('button',{name:'패턴 편집',exact:true}).click();const editor=p.locator('.grooveEditor');await editor.getByRole('button',{name:'1행 2칸',exact:true}).click();await editor.getByRole('button',{name:'저장',exact:true}).click();assert.equal(await p.getByLabel('저장 방식').inputValue(),'update');await p.getByRole('button',{name:'팩 저장',exact:true}).click();
let saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1')));assert.equal(saved.length,2);assert.equal(saved.find(x=>x.id==='0').pattern.rows[0].steps[1],true);
await editor.getByRole('button',{name:'저장',exact:true}).click();await p.getByLabel('저장 방식').selectOption('new');await p.getByLabel('팩 이름',{exact:true}).fill('복사한 팩');await p.getByRole('button',{name:'팩 저장',exact:true}).click();saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1')));assert.equal(saved.length,3);
await p.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();await d.getByRole('tab',{name:'내 저장 팩',exact:true}).click();assert.equal(await d.getByLabel('저장 팩 정렬').inputValue(),'manual');await d.getByRole('button',{name:'팩 관리',exact:true}).click();await p.screenshot({path:'output/groove-management-preview.png'});await d.getByRole('button',{name:'첫 팩 미리 듣기',exact:true}).click();await p.getByRole('button',{name:'그루브팩 창 닫기',exact:true}).click();await p.waitForTimeout(200);assert.deepEqual(errors,[]);console.log('PASS preview audio, stop, auto-completion, no selection changes, editing, overwrite/copy, saved ordering, close cleanup');
}finally{await b.close();}
