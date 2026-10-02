import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {extractGrooveBar} from '../src/metronome/groove.js';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.GROOVE_TEST_URL||'http://127.0.0.1:5173';
await fs.mkdir('work/groove-load-seek',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const [width,height,touch] of [[1440,1000,false],[390,844,true],[1032,1376,true]]){
 const p=await browser.newPage({viewport:{width,height},...(touch?{hasTouch:true,isMobile:true,userAgent:width>700?'iPad Safari':'Android Mobile'}:{})});p.setDefaultTimeout(45000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  const single={id:'seed-one',title:'Loaded bar',scope:'bar',timeSignature:'4/4',subdivision:'sixteenth',pattern:{barCount:1,rows:[{tone:'kick',volume:.75,muted:false,steps:Array.from({length:72},(_,i)=>i===0||i===3),velocities:Array(72).fill(100)}]}};
  const sequence={id:'seed-sequence',title:'Seek sequence',scope:'arrangement',timeSignature:'4/4',subdivision:'sixteenth',pattern:{barCount:4,rows:[{tone:'kick',volume:.75,muted:false,steps:Array.from({length:288},(_,i)=>i%72===0),velocities:Array.from({length:288},(_,i)=>[100,70,45,25][Math.floor(i/72)])}]}};
  localStorage.setItem('rifflab.metronome.groove-packs.v1',JSON.stringify([single,sequence]));
  window.testAudioStarts=[];
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...args){this.testOutput=args[0];return connect.apply(this,args);};
  const set=AudioParam.prototype.setValueAtTime;AudioParam.prototype.setValueAtTime=function(...args){(this.testValues??=[]).push(args);return set.apply(this,args);};
  const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(time,...args){window.testAudioStarts.push({time,now:this.context.currentTime,level:this.testOutput?.gain?.testValues?.[0]?.[0]});return start.call(this,time,...args);};
 });
 await p.goto(`${base}/#metronome`);await p.locator('.metronomeModeButton').nth(2).click();
 const cards=p.locator('.grooveBarCard');const add=p.locator('.grooveAddBar');
 const seek=async target=>{
  // Clear at the actual click, after pointer actionability waits and before
  // React handles the seek; earlier lookahead events are cancelled by it.
  await cards.nth(target).evaluate(el=>el.addEventListener('click',()=>{window.testAudioStarts=[];},{once:true,capture:true}));
  await cards.nth(target).click();
 };
 for(let i=0;i<3;i++)await add.click();
 const grid=()=>p.locator('.grooveTrack').evaluateAll(es=>es.map(e=>[...e.querySelectorAll('.grooveBeat button')].map(x=>({on:x.getAttribute('aria-pressed'),strength:x.getAttribute('data-strength')}))));
 const before=[];
 for(let i=0;i<4;i++){await cards.nth(i).click();await p.locator('.grooveTrack').first().locator('.grooveBeat button').nth(i*2+1).click();before.push(await grid());}
 const save=async(name,scope)=>{
  await p.locator('.grooveSaveButton').click();await p.getByRole('combobox',{name:'저장 범위',exact:true}).selectOption(scope);
  const selects=p.locator('.groovePackDialog form select');if(await selects.count()>1)await selects.nth(1).selectOption('new');
  if(name==='Before')await p.screenshot({path:`work/groove-load-seek/${width}-save.png`,fullPage:true});
  await p.locator('.groovePackDialog form input').fill(name);await p.locator('.groovePackDialog button[type=submit]').click();
 };
 const load=async(name,scope)=>{
  await p.locator('.groovePacksTrigger').click();await p.locator('#groove-tab-saved').click();
  await p.getByRole('button',{name:scope==='bar'?'마디 팩':'마디 구성',exact:true}).click();
  await p.locator('.groovePackPick').filter({hasText:name}).click();
  if(name==='Loaded bar')await p.screenshot({path:`work/groove-load-seek/${width}-library.png`,fullPage:true});
  await p.locator('.groovePackLoad>button').click();
 };
 await save('Before','arrangement');
 await cards.nth(2).click();await load('Loaded bar','bar');assert.equal(await cards.count(),4);assert.equal(await cards.nth(2).getAttribute('aria-pressed'),'true');
 const after=[];for(let i=0;i<4;i++){await cards.nth(i).click();after.push(await grid());if(i!==2)assert.deepEqual(after[i],before[i]);}
 assert.equal(after[2].length,1);assert.equal(after[2][0][3].on,'true');assert.equal(after[2][0][3].strength,'strong');
 await cards.nth(2).click();await save('Single saved','bar');await save('After','arrangement');
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1')));
 assert.equal(saved.find(x=>x.title==='Single saved').pattern.barCount,1);assert.equal(saved.find(x=>x.title==='Single saved').pattern.rows[0].steps[3],true);
 assert.equal(saved.find(x=>x.title==='After').pattern.barCount,4);assert.equal(extractGrooveBar(saved.find(x=>x.title==='Before').pattern,2).rows[0].steps[5],true);
 for(let i=0;i<3;i++)await p.locator('.grooveReduceBar').click();await load('After','arrangement');assert.equal(await cards.count(),4);
 for(let i=0;i<4;i++){await cards.nth(i).click();assert.deepEqual(await grid(),after[i]);}
 await load('Seek sequence','arrangement');
 for(let i=0;i<16;i++)await p.locator('.standaloneMetronomePanel .metronomeHeroBpmJumpButton--up:visible').click();
 await cards.nth(1).click();await p.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();
 await p.waitForFunction(()=>document.querySelectorAll('.grooveBarCard')[1]?.getAttribute('aria-current')==='step');
 await p.waitForTimeout(200);
 for(const target of [3,3,0,2]){
  await seek(target);
  await p.waitForFunction(target=>document.querySelectorAll('.grooveBarCard')[target]?.getAttribute('aria-current')==='step',target);
  await p.waitForTimeout(120);
  const audio=await p.evaluate(()=>window.testAudioStarts);assert.ok(audio.length>0);assert.ok(audio[0].time-audio[0].now<.15,JSON.stringify(audio));assert.ok(Math.abs(audio[0].level-1.4*.75*[1,.7,.45,.25][target])<1e-6,JSON.stringify({target,audio}));
  assert.equal(await cards.nth(target).getAttribute('aria-pressed'),'true');assert.ok((await p.locator('.grooveHorizontalScroll').getAttribute('aria-label')).endsWith(`마디 ${target+1}`));
 }
 await cards.nth(3).click();await p.waitForFunction(()=>document.querySelectorAll('.grooveBarCard')[0]?.getAttribute('aria-current')==='step',null,{timeout:3000});
 if(!touch){
  await p.waitForTimeout(5000);
  for(let i=0;i<16;i++)await p.locator('.standaloneMetronomePanel .metronomeHeroBpmJumpButton--down:visible').click();
  await seek(2);await p.waitForTimeout(120);
  const audio=await p.evaluate(()=>window.testAudioStarts);
  assert.ok(audio.length>0,'Slowing the tempo must not delay a seek');
  assert.ok(audio[0].time-audio[0].now<.15);assert.ok(Math.abs(audio[0].level-1.4*.75*.45)<1e-6);
 }
 await p.screenshot({path:`work/groove-load-seek/${width}-playing.png`,fullPage:true});
 await p.locator('.standaloneMetronomePanel .metronomeHeroPlayButton:visible').click();assert.equal(await p.locator('.grooveBarCard.is-playing').count(),0);await cards.nth(2).click();assert.equal(await cards.nth(2).getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,status:'passed',checks:['bar-only import','separate save scopes','arrangement restoration','audio seek and retrigger','last-to-first wrap']}));await p.close();
}}finally{await browser.close();}
