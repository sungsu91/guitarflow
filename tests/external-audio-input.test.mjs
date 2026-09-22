import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireMicInput,buildMicrophoneConstraints,releaseActiveMicInput} from '../src/audio/micInputEngine.js';
import {getAudioInputSelection,selectAudioInput,selectAudioChannel,audioInputError,publishAudioInput,refreshAudioDevices} from '../src/input/audioInputSelection.js';

test('external device constraints keep identity and do not pre-downmix channels',()=>{
 const devices={getSupportedConstraints:()=>({channelCount:true,echoCancellation:true})};
 assert.deepEqual(buildMicrophoneConstraints(devices).audio.channelCount,{ideal:1});
 const selected=buildMicrophoneConstraints(devices,{deviceId:'usb'}).audio;
 assert.deepEqual(selected.deviceId,{exact:'usb'});assert.equal(selected.channelCount,undefined);assert.equal(selected.echoCancellation,false);
});

test('fallback preserves explicit USB selection; unplug and permissions are distinct',async()=>{
 const calls=[];const mediaDevices={getUserMedia:async c=>{calls.push(c);throw new DOMException('unplug','OverconstrainedError');}};
 await assert.rejects(acquireMicInput({consumerId:'shooting-game-detector',mediaDevices,inputSelection:{deviceId:'usb'}}));
 assert.equal(calls.length,2);assert(calls.every(c=>c.audio.deviceId.exact==='usb'));
 assert.equal(getAudioInputSelection().status,'disconnected');assert.equal(audioInputError({name:'NotAllowedError'}),'denied');assert.equal(audioInputError({name:'NotReadableError'}),'error');
});

test('actual capture channel count gates channel routing and release ends the session',async()=>{
 const previous=globalThis.window;const connections=[];let splitterSize=0;
 const node=name=>({connect(...args){connections.push([name,...args]);},disconnect(){},gain:{value:1},frequency:{value:0},Q:{value:0},fftSize:2048,frequencyBinCount:1024,getFloatTimeDomainData:b=>b.fill(.99)});
 class Context {
  state='running';sampleRate=48000;destination={};
  createMediaStreamSource(){return node('source');}createBiquadFilter(){return node('filter');}createGain(){return node('gain');}createAnalyser(){return node('analyser');}
  createChannelSplitter(count){splitterSize=count;return node('splitter');}async close(){this.state='closed';}
 }
 const track=new EventTarget();track.label='USB Guitar';track.readyState='live';track.getSettings=()=>({deviceId:'usb',channelCount:2});track.stop=()=>{track.readyState='ended';};
 const mediaDevices={getUserMedia:async()=>({getAudioTracks:()=>[track],getTracks:()=>[track]})};
 globalThis.window={AudioContext:Context};
 try {
  const session=await acquireMicInput({consumerId:'shooting-game-detector',mediaDevices,inputSelection:{deviceId:'usb',channel:1}});
  assert.equal(splitterSize,2);assert(connections.some(c=>c[0]==='splitter'&&c[2]===1));assert.equal(getAudioInputSelection().channelCount,2);
  assert.equal(session.readLevelFrame().clipping,true);
  track.readyState='ended';track.dispatchEvent(new Event('ended'));assert.equal(getAudioInputSelection().status,'disconnected');assert.equal(session.connected,false);assert.equal(session.readLevelFrame().normalized,0);
  await session.release();assert.equal(session.audioContext.state,'closed');
 } finally {await releaseActiveMicInput();globalThis.window=previous;}
});

test('device enumeration is read-only; selection resets channel',async()=>{
 selectAudioInput('usb');selectAudioChannel(1);publishAudioInput({devices:[],status:'disconnected'});
 const before=getAudioInputSelection().revision;
 const media={enumerateDevices:async()=>[{kind:'audioinput',deviceId:'usb',label:'USB'}]};
 await refreshAudioDevices(media);assert.equal(getAudioInputSelection().revision,before);await refreshAudioDevices(media);assert.equal(getAudioInputSelection().revision,before);
 selectAudioInput('');assert.equal(getAudioInputSelection().channel,null);
});
