import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const origin=process.env.TEST_URL||'http://127.0.0.1:5173';
async function setup(width,midiSupported=true){
 const page=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.addInitScript(({midiSupported})=>{
  window.inputQA={audioCalls:[],midiCalls:0,usb:true,denied:false,streams:[],contexts:[]};
  const qa=window.inputQA;
  const access=new EventTarget(),port=new EventTarget();Object.assign(port,{id:'guitar-midi',name:'Test MIDI Guitar',state:'connected',open:async()=>port,close:async()=>{}});access.inputs=new Map([[port.id,port]]);
  qa.send=data=>{const e=new Event('midimessage');e.data=new Uint8Array(data);port.dispatchEvent(e);};qa.midiState=state=>{port.state=state;access.dispatchEvent(new Event('statechange'));};
  Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:async({name})=>({state:name==='midi'?'prompt':'granted'})}});
  Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:midiSupported?async()=>{qa.midiCalls++;return access;}:undefined});
  navigator.mediaDevices.enumerateDevices=async()=>[{kind:'audioinput',deviceId:'default',label:'Default mic'},...(qa.usb?[{kind:'audioinput',deviceId:'usb',label:'Test USB Audio'}]:[])];
  navigator.mediaDevices.getUserMedia=async constraints=>{
   qa.audioCalls.push(constraints);
   if(qa.denied)throw new DOMException('denied','NotAllowedError');
   const id=constraints.audio?.deviceId?.exact||'';
   if(id==='usb'&&!qa.usb)throw new DOMException('removed','NotFoundError');
   const ctx=new AudioContext();await ctx.resume();qa.contexts.push(ctx);
   const dest=ctx.createMediaStreamDestination(),merger=ctx.createChannelMerger(2),gain=ctx.createGain();gain.gain.value=0;
   const osc=ctx.createOscillator();osc.frequency.value=82.4069;osc.connect(gain);gain.connect(merger,0,0);gain.connect(merger,0,1);merger.connect(dest);osc.start();
   const track=dest.stream.getAudioTracks()[0];track.getSettings=()=>({deviceId:id||'default',sampleRate:ctx.sampleRate,channelCount:id?2:1});
   qa.streams.push(dest.stream);qa.gain=gain;qa.osc=osc;return dest.stream;
  };
  qa.unplug=()=>{qa.usb=false;const track=qa.streams.at(-1).getAudioTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));navigator.mediaDevices.dispatchEvent(new Event('devicechange'));};
  qa.replug=()=>{qa.usb=true;navigator.mediaDevices.dispatchEvent(new Event('devicechange'));};
 },{midiSupported});
 return {page,errors};
}
async function gameSettings(page,width){
 if(width<600)await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
 await page.locator(width<600?'.utilitySoundDetails > summary':'.desktopSidebarSettings > summary').click();
 await page.locator('.deviceConnection > summary').click();
}
try{
 for(const width of [1440,390]){
  const {page:p,errors}=await setup(width);await p.goto(origin+'/#shooter');await p.getByRole('button',{name:'슈팅게임 시작',exact:true}).waitFor();
  await gameSettings(p,width);
  await p.getByLabel('오디오 입력 장치',{exact:true}).selectOption('usb');
  await p.getByLabel('오디오 입력 채널',{exact:true}).waitFor();await p.getByLabel('오디오 입력 채널',{exact:true}).selectOption('1');
  await p.waitForFunction(()=>window.inputQA.audioCalls.length>=3);
  assert.equal((await p.evaluate(()=>inputQA.audioCalls.at(-1))).audio.deviceId.exact,'usb');
  await p.evaluate(()=>{inputQA.gain.gain.value=.35;});
  await p.waitForFunction(()=>document.querySelector('meter')?.value>0);
  await p.getByLabel("오디오 입력 레벨",{exact:true}).scrollIntoViewIfNeeded();
  await p.screenshot({path:`output/external-input-audio-${width}.png`});
  await p.evaluate(()=>inputQA.unplug());await p.getByText(/장치 연결 해제 · 다시 연결/).waitFor();
  await p.evaluate(()=>inputQA.replug());await p.getByLabel('오디오 입력 채널',{exact:true}).waitFor();
  assert.equal(await p.getByLabel('오디오 입력 장치',{exact:true}).inputValue(),'usb');
  await p.getByLabel('게임 입력 방식').selectOption('midi');await p.getByRole('button',{name:'장치 연결',exact:true}).click();await p.getByText('연결됨 · Test MIDI Guitar',{exact:true}).waitFor();
  const audioCalls=await p.evaluate(()=>inputQA.audioCalls.length);assert.equal(await p.evaluate(()=>inputQA.midiCalls),1);
  await p.screenshot({path:`output/external-input-midi-${width}.png`});
  if(width<600)await p.getByRole('button',{name:'메뉴 닫기',exact:true}).last().click();
  else await p.locator('.desktopSidebarSettings > summary').click();
  await p.evaluate(()=>inputQA.send([0x95,64,100]));await p.waitForFunction(()=>document.querySelector('[aria-label="지금 감지한 음"]')?.textContent.includes('E4'));
  await p.evaluate(()=>{inputQA.send([0x85,64,0]);inputQA.send([0x95,40,100]);});await p.waitForFunction(()=>document.querySelector('[aria-label="지금 감지한 음"]')?.textContent.includes('E2'));
  await p.getByRole('button',{name:'슈팅게임 시작',exact:true}).click();
  await p.locator('[data-current-target="true"]').first().waitFor({timeout:20000});
  const label=await p.locator('[data-current-target="true"]').first().getAttribute('aria-label');
  const match=/([A-G])([#b]?)(-?\d)/.exec(label);assert(match,label);
  const note=(Number(match[3])+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1]])+(match[2]==='#'?1:match[2]==='b'?-1:0);
  await p.evaluate(n=>{inputQA.send([0x85,40,0]);inputQA.send([0x95,n,100]);},note);
  await p.waitForFunction(()=>document.querySelector('[aria-label="지금 감지한 음"]')?.textContent.includes('명중'));
  await p.evaluate(n=>{inputQA.send([0x95,n,100]);inputQA.send([0xe5,0,127]);},note);
  assert.equal(await p.evaluate(()=>inputQA.audioCalls.length),audioCalls);
  await p.evaluate(()=>inputQA.midiState('disconnected'));await p.waitForFunction(()=>document.querySelector('[aria-label="지금 감지한 음"]')?.textContent.includes('MIDI 장치'));
  assert.deepEqual(errors,[]);console.log({width,game:'passed',midiPermissionCalls:1});await p.close();
 }
 for(const width of [1440,390]){
  const {page:p,errors}=await setup(width,false);await p.goto(origin+'/#tuner');await p.getByRole('button',{name:/튜닝 프리셋 선택, 현재/}).waitFor();
  await p.getByRole('button',{name:/튜닝 프리셋 선택, 현재/}).click();await p.locator('.deviceConnection > summary').click();
  await p.getByLabel('오디오 입력 장치',{exact:true}).selectOption('usb');await p.getByLabel('오디오 입력 채널',{exact:true}).waitFor();
  await p.waitForTimeout(850);await p.evaluate(()=>{inputQA.gain.gain.value=.2;});
  await p.waitForFunction(()=>document.querySelector('.tunerPitchOrb')?.textContent.includes('E2'));
  const box=await p.locator('.tunerMobileDropdown--tuning').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
  await p.screenshot({path:`output/external-input-tuner-${width}.png`});
  await p.evaluate(()=>{inputQA.denied=true;});await p.getByLabel('오디오 입력 장치',{exact:true}).selectOption('');await p.getByText(/권한 거부 · 사이트 설정/).waitFor();
  await p.evaluate(()=>{inputQA.denied=false;});await p.getByRole('button',{name:'다시 연결',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.deviceConnection')?.textContent.includes('연결됨'));
  assert.equal(await p.getByLabel('오디오 입력 채널',{exact:true}).count(),0);assert.equal(await p.evaluate(()=>inputQA.midiCalls),0);
  assert.deepEqual(errors,[]);console.log({width,tuner:'passed',unsupportedMidi:'audio unaffected'});await p.close();
 }
}finally{await browser.close();}
