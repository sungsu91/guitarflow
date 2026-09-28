import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {builtinPacks} from '../src/rhythm-trainer/packs.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.RHYTHM_BROWSER||'chromium',base=process.env.RHYTHM_URL||'http://127.0.0.1:4193';
const deterministic=process.env.RHYTHM_DETERMINISTIC!=='0';
const out=process.env.RHYTHM_OUTPUT||`artifacts/rhythm-sync-20260928/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const report=[];
async function checkRow(page,label){
 const items=await page.locator('.rt-quick').evaluate(e=>[...e.children].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,x:r.x,right:r.right,center:r.y+r.height/2,width:r.width};}));
 const buttons=items.filter(i=>/핵심|백킹|설정|반복/.test(i.text));
 assert.equal(buttons.length,3,label);assert.ok(buttons.every(i=>Math.abs(i.center-buttons[0].center)<2),`${label}: ${JSON.stringify(items)}`);
 assert.ok(items.every(i=>i.x>=-1&&i.right<=page.viewportSize().width+1),`${label} overflow: ${JSON.stringify(items)}`);
 for(let i=1;i<items.length;i++)assert.ok(items[i].x>=items[i-1].right-1,`${label} overlap`);
}
async function frame(page,tick){await page.evaluate(async tick=>{window.rhythmEngine.onFrame(tick,true,true);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},tick);}
async function cursorAtNote(page,scope){
 const result=await page.locator(scope).evaluate(root=>{const line=root.querySelector('.rt-cursor'),glow=root.querySelector('.rt-playing-glow');return {line:line&&Number(line.getAttribute('x1')),note:glow&&Number(glow.getAttribute('cx')),active:root.querySelectorAll('[data-active="true"]').length};});
 assert.ok(result.line!==null&&result.note!==null,JSON.stringify(result));assert.ok(Math.abs(result.line-result.note)<1e-6,JSON.stringify(result));assert.equal(result.active,1);
}
try{
 for(const width of (process.env.RHYTHM_WIDTHS||'360,390,430,844,1440').split(',').map(Number)){
  const mobile=width<1024,landscape=width===844,context=await browser.newContext({viewport:{width,height:landscape?390:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  // Playwright's Windows WebKit port has no Web Audio implementation. Supply
  // only its graph/decode surface for deterministic visual tests; never use this
  // shim for live-audio or production verification.
  if(deterministic&&engine==='webkit')await context.addInitScript(()=>{
   if(window.AudioContext||window.webkitAudioContext)return;
   const param=()=>({value:1,setValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
   const node=()=>({connect(){},disconnect(){},gain:param()});
   window.AudioContext=class {
    constructor(){this.currentTime=0;this.state='running';this.sampleRate=48000;this.destination=node();}
    async resume(){} createGain(){return node();}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,getChannelData:i=>data[i]};}
    async decodeAudioData(){const buffer=this.createBuffer(1,4800,48000);buffer.getChannelData(0)[0]=1;return buffer;}
   };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(base+'/#rhythm-trainer');await page.locator('.launchSplash').waitFor({state:'detached'});
  if(deterministic)await page.evaluate(async()=>{
   const {RhythmTransport}=await import('/src/rhythm-trainer/transport.js');
   // Drive the production React callbacks deterministically. Audio scheduling is
   // exercised separately by rhythm-audible-sync.test.mjs at the same onsets.
   RhythmTransport.prototype.start=function(){window.rhythmEngine=this;this.onFrame(this.tick,true,false);};
  });
  const all=builtinPacks(),packs=width===390&&deterministic?all:all.filter((p,i)=>[0,3,6,7,11,12,27,38,45,60,72,84].includes(i));
  for(const pack of packs){
   await page.locator(`[data-pack="${pack.id}"]`).click();await page.locator('.rt-workspace[data-screen="setup"]').waitFor();
   await checkRow(page,`${width} ${pack.id} setup`);
   await page.getByRole('button',{name:'1마디부터 재생',exact:true}).click();await page.locator('.rt-workspace[data-screen="play"]').waitFor();
   await page.getByRole('button',{name:'일시정지',exact:true}).waitFor();await checkRow(page,`${width} ${pack.id} play`);
   if(deterministic&&['pack-basic-one-three','pack-sixteenths-foundation','pack-dotted-eighth-foundation'].includes(pack.id)){
    const events=await page.evaluate(()=>window.rhythmEngine.events.map(e=>({at:e.at,measure:e.measure})));
    for(const event of events){if(landscape&&event.measure>=4)continue;await frame(page,event.at);await cursorAtNote(page,'.rt-score-scroll');}
   }
   await page.getByRole('button',{name:'일시정지',exact:true}).click();
   await page.getByRole('button',{name:'뒤로',exact:true}).click();await page.locator('.rt-workspace[data-screen="setup"]').waitFor();
   if(['pack-basic-one-three','pack-quarter-foundation'].includes(pack.id))await page.screenshot({path:`${out}/setup-${width}-${pack.learningStep}.png`});
   await page.getByRole('button',{name:'뒤로',exact:true}).click();await page.locator('.rt-workspace[data-screen="library"]').waitFor();
  }
  await page.locator('[data-pack="pack-basic-offbeat-entry"]').click();await page.getByRole('button',{name:'가이드실',exact:true}).click();
  await page.getByRole('spinbutton',{name:'가이드 BPM'}).fill('30');await page.getByRole('button',{name:'▶ 패턴 반복 듣기',exact:true}).click();await page.getByRole('button',{name:'Ⅱ 듣기 멈춤',exact:true}).waitFor();
  if(deterministic){
   const events=await page.evaluate(()=>window.rhythmEngine.events.map(e=>({at:e.at,group:e.measure,index:e.index})));
   for(const event of events){await frame(page,event.at);await cursorAtNote(page,'.rt-guide');const article=page.locator('.rt-guide-score article').nth(event.group);assert.equal(await article.locator('[role="columnheader"].is-current').count(),1);}
   await frame(page,18);await page.screenshot({path:`${out}/guide-${width}.png`});
   // A mixed-duration beat: the sustained eighth spans e, but the next note
   // and '&' must start together, followed by a sixteenth on a.
   await page.getByRole('button',{name:'Ⅱ 듣기 멈춤',exact:true}).click();await page.locator('.rt-guide-select select').selectOption('sixteenth');
   await page.locator('.rt-guide-select nav button').filter({hasText:'8분 + 16분 + 16분'}).first().click();
   await page.getByRole('button',{name:'▶ 패턴 반복 듣기',exact:true}).click();await page.getByRole('button',{name:'Ⅱ 듣기 멈춤',exact:true}).waitFor();
   for(const [tick,label] of [[0,'1'],[3,'e'],[6,'&'],[9,'a']]){await frame(page,tick);assert.equal(await page.locator('.rt-guide [role="columnheader"].is-current').innerText(),label);if(tick!==3)await cursorAtNote(page,'.rt-guide');}
  }else{await page.locator('.rt-guide .rt-cursor').waitFor({state:'attached'});assert.equal(await page.locator('.rt-guide .rt-measure').first().isVisible(),true);await page.screenshot({path:`${out}/guide-${width}.png`});}
  await page.getByRole('button',{name:'Ⅱ 듣기 멈춤',exact:true}).click();await page.getByRole('button',{name:'가이드실 닫기'}).click();
  assert.deepEqual(errors,[]);report.push({engine,width,packs:packs.length,setupAndPlay:true,guide:true,deterministic});console.log(JSON.stringify(report.at(-1)));await context.close();
 }
 await writeFile(`${out}/verification.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
