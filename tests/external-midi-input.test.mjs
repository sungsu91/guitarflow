import test from 'node:test';
import assert from 'node:assert/strict';
import {createMidiInput} from '../src/input/midiInput.js';
import {createMidiStepInput} from '../src/etudes/midiStepInput.js';
import {midiMatchesShooterTarget} from '../src/shooter/midiJudgment.js';

function fixture(permission='granted') {
 const win=new EventTarget();win.isSecureContext=true;
 const doc=new EventTarget();doc.visibilityState='visible';
 const access=new EventTarget();let requests=0;
 class Port extends EventTarget {
  constructor(id){super();this.id=id;this.name=id;this.state='connected';this.connection='closed';}
  async open(){this.connection='open';access.dispatchEvent(new Event('statechange'));return this;}
  async close(){this.connection='closed';access.dispatchEvent(new Event('statechange'));}
  send(data){const e=new Event('midimessage');e.data=data;this.dispatchEvent(e);}
 }
 const a=new Port('guitar'),b=new Port('keys');access.inputs=new Map([[a.id,a],[b.id,b]]);
 const nav={permissions:{query:async()=>({state:permission})},requestMIDIAccess:async()=>{requests++;return access;}};
 const input=createMidiInput({navigator:nav,window:win,document:doc});
 return {input,a,b,access,doc,win,requests:()=>requests};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('single MIDI connection preserves device/channel and delivers new Note On immediately',async()=>{
 const {input,a,requests}=fixture();const events=[];
 const stop=input.consume({active:()=>true,message:e=>events.push(e)});
 await Promise.all([input.connect(),input.connect()]);assert.equal(requests(),1);
 a.send([0x95,64,99]);assert.equal(events.length,1);assert.deepEqual([events[0].deviceId,events[0].channel,events[0].note],['guitar',6,64]);
 a.send([0x95,64,99]);a.send([0xe5,0,127]);a.send([0xb5,64,127]);assert.equal(events.length,1);
 a.send([0x96,64,80]);assert.equal(events.length,2); // another MIDI channel, not another inferred string
 a.send([0x85,64,0]);a.send([0x95,64,88]);assert.equal(events.filter(e=>e.type==='noteon').length,3);
 a.send([0x95,64,0]);a.send([0x95,64,88]);assert.equal(events.filter(e=>e.type==='noteon').length,4);
 stop();
});

test('exclusive routing cancels score chord timers when switching to game',async()=>{
 const {input,a}=fixture();let screen='score',timer;const score=[],game=[];
 const engine=createMidiStepInput(notes=>score.push(notes),{schedule:fn=>(timer=fn,1),cancel:()=>{timer=null;},enabled:()=>screen==='score'});
 const stopGame=input.consume({active:()=>screen==='game',message:e=>game.push(e)});
 const stopScore=input.consume({active:()=>screen==='score',message:e=>engine.message(e.data),reset:()=>engine.reset()});
 await input.connect();a.send([0x90,60,100]);assert.equal(score.length,0);assert(timer);
 screen='game';input.reset();assert.equal(timer,null);a.send([0x90,64,100]);assert.equal(game.length,1);assert.equal(score.length,0);
 screen='score';input.reset();a.send([0x90,60,100]);a.send([0x90,64,100]);timer();assert.deepEqual(score,[[60,64]]);assert.equal(game.length,1);
 stopScore();stopGame();
});

test('device removal, replacement, hidden document and screen cleanup clear held states',async()=>{
 const {input,a,b,access,doc}=fixture();const events=[];let resets=0;
 const stop=input.consume({active:()=>true,message:e=>events.push(e),reset:()=>resets++});
 await input.connect();a.send([0x90,60,100]);a.state='disconnected';access.dispatchEvent(new Event('statechange'));await tick();assert.equal(input.getSnapshot().connected,false);
 a.send([0x90,62,100]);assert.equal(events.length,1);
 a.state='connected';access.dispatchEvent(new Event('statechange'));await tick();a.send([0x90,60,100]);assert.equal(events.length,2);
 input.select(b.id);await tick();a.send([0x90,61,100]);b.send([0x90,60,100]);assert.equal(events.length,3);
 doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));b.send([0x90,62,100]);assert.equal(events.length,3);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));b.send([0x90,60,100]);assert.equal(events.length,4);
 stop();b.send([0x90,63,100]);assert.equal(events.length,4);assert(resets>3);
});

test('MIDI probing never prompts without authorization and unsupported MIDI remains isolated',async()=>{
 const prompt=fixture('prompt');await prompt.input.connect(false);assert.equal(prompt.requests(),0);
 await prompt.input.connect(true);assert.equal(prompt.requests(),1);
 const denied=fixture('denied');await denied.input.connect();assert.equal(denied.requests(),0);assert.match(denied.input.getSnapshot().status,/권한 거부/);
 const unsupported=createMidiInput({navigator:{},window:{isSecureContext:true}});await unsupported.connect();assert.equal(unsupported.supported(),false);
});

test('game matches MIDI note/octave and enharmonics, never Note Off or pitch bend',()=>{
 const e={type:'noteon',note:61,channel:3,deviceId:'guitar'};
 assert(midiMatchesShooterTarget(e,{pitch:'Db4'}));assert(midiMatchesShooterTarget(e,{pitch:'C#4'}));
 assert(!midiMatchesShooterTarget(e,{pitch:'Db3'}));assert(!midiMatchesShooterTarget({...e,type:'noteoff'},{pitch:'Db4'}));
});
