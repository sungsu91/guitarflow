import test from 'node:test';
import assert from 'node:assert/strict';
import {audibleContextTime,RhythmTransport} from '../src/rhythm-trainer/transport.js';
import {GUIDE_METERS,guidePatterns,compileGuide,GuideTransport} from '../src/rhythm-trainer/guideModel.js';
import {builtinPacks} from '../src/rhythm-trainer/packs.js';
import {timeline,positionAt,createPattern} from '../src/rhythm-trainer/model.js';
import {beatPositions,measureProgressX,scoreCursorX,guideCursorX,subdivisionRegion} from '../src/rhythm-trainer/notationLayout.js';
import {secondsPerTick,timeSignature} from '../src/rhythm-trainer/meter.js';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
globalThis.cancelAnimationFrame=()=>{};

test('guide counts stay equally spaced when held subdivisions move',()=>{
 const variants=[[6,3,3],[3,6,3],[3,3,6]].map(ticks=>ticks.map(ticks=>({ticks,rest:false})));
 for(const beat of variants){
  const counts=[0,3,6,9].map(tick=>guideCursorX(beat,tick,3));
  for(let i=1;i<counts.length;i++)close(counts[i]-counts[i-1],37);
  const xs=beatPositions(beat,0,1,true,3);
  let onset=0;
  beat.forEach((note,i)=>{close(xs[i],counts[onset/3]);onset+=note.ticks;});
  assert.deepEqual(beatPositions(beat,1,2,true,3),xs.map(x=>x+180));
 }
 const middle=beatPositions(variants[1],0,1,true,3);
 close(middle[2]-middle[1],2*(middle[1]-middle[0]));
});

test('every guide onset reaches its engraved note; holds and subdivision highlights follow its duration',()=>{
 const patterns=GUIDE_METERS.flatMap(meter=>guidePatterns(meter).map(pattern=>({meter,pattern})))
  .concat(builtinPacks().map(p=>({meter:timeSignature(p),pattern:{groups:p.core}})));
 for(const {meter,pattern} of patterns){
  const compiled=compileGuide(pattern,meter);
  for(const group of compiled.groups){
   const xs=beatPositions(group.notes,0,1,true,group.step);
   let previousX=-Infinity;
   for(const [index,cell] of group.cells.entries()){
    const tick=cell.at-group.at,x=guideCursorX(group.notes,tick,group.step);
    const event=group.events.find(e=>cell.at+1e-9>=e.at&&cell.at<e.at+e.ticks-1e-9);
    const pos={tick,event:{...event,at:event.at-group.at}};
    close(scoreCursorX([group.notes],1,pos,true,group.step),x);
    if(Math.abs(event.at-cell.at)<1e-7)close(xs[event.index],x);
    else {assert.ok(x>xs[event.index]);assert.ok(x<(xs[event.index+1]??173));}
    const region=subdivisionRegion(group.notes,0,1,pos,true,group.step);
    assert.equal(region.index,index);assert.ok(region.x<=x&&region.x+region.width>=x);
    assert.ok(x>previousX);previousX=x;
   }
   // Held final notes reach the staff end only after their complete duration.
   close(guideCursorX(group.notes,group.ticks,group.step),173);
   assert.ok(guideCursorX(group.notes,group.ticks-group.step/2,group.step)<173);
  }
 }
});

test('practice cursor reaches each optical note/rest center for all packs, including repeats',()=>{
 for(const p of builtinPacks())for(const event of timeline(p)){
  const position=positionAt(p,event.at),measure=p.measures[event.measure];
  close(scoreCursorX(measure,p.meter,position),beatPositions(measure[event.beat],event.beat,p.meter)[event.index]);
  assert.equal(position.event.index,event.index);
  assert.equal(position.event.continuation,event.continuation);
 }
});

test('valid output timestamps take precedence; fallback subtracts reported device latency',()=>{
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:9.7,performanceTime:1000}),baseLatency:.01,outputLatency:.2},1020),9.72);
 close(audibleContextTime({currentTime:10,baseLatency:.01,outputLatency:.2},1020),9.79);
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:0,performanceTime:0}),baseLatency:.01,outputLatency:.2},1020),9.79);
 close(audibleContextTime({currentTime:10},1020),10);
 close(audibleContextTime({currentTime:.1,outputLatency:.2},1020),0);
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:9.9,performanceTime:1000})},2000),10);
});

test('practice and guide display an onset when its scheduled sound reaches output, at slow and fast tempos',()=>{
 for(const bpm of [30,96,240])for(const guide of [false,true]){
  const ctx={currentTime:0,baseLatency:.01,outputLatency:.12};
  const engine=guide?new GuideTransport(ctx,{},()=>{}):new RhythmTransport(ctx,{},()=>{});
  const pattern={...createPattern(),bpm,countIn:false,click:false,loop:true};
  if(guide)engine.configureGuide(compileGuide(guidePatterns('4/4').find(p=>p.id==='sixteenth-eighth-sixteenth'),'4/4'),bpm,'wood');
  else engine.configure(pattern);
  engine.anchorTime=1;engine.anchorTick=0;engine.next=0;
  const sounds=[];engine.sound=at=>sounds.push(at);engine.beatSound=()=>{};
  const seconds=secondsPerTick(engine.pattern);
  for(const event of engine.events){
   ctx.currentTime=engine.anchorTime+event.at*seconds-.01;engine.schedule();
   if(!event.rest&&!event.continuation)assert.ok(sounds.some(at=>Math.abs(at-(engine.anchorTime+event.at*seconds))<1e-8));
   ctx.currentTime=engine.anchorTime+event.at*seconds+.13;
   close(engine.audiblePosition(),event.at);
  }
 }
});

test('startup waits for output; pause and tempo edits preserve heard position instead of jumping ahead',()=>{
 let draw;globalThis.requestAnimationFrame=fn=>{draw=fn;return 1;};
 const ctx={currentTime:10,baseLatency:.01,outputLatency:.2},frames=[];
 const engine=new RhythmTransport(ctx,{},(...args)=>frames.push(args));
 engine.configure({...createPattern(),bpm:60,countIn:false,click:false});engine.sound=()=>{};
 engine.start(false);assert.equal(frames.at(-1)[2],false);
 ctx.currentTime=10.1;draw();assert.equal(frames.at(-1)[2],false);
 ctx.currentTime=11.255;draw();assert.equal(frames.at(-1)[2],true);close(frames.at(-1)[0],12);
 engine.pause();close(engine.tick,12);close(frames.at(-1)[0],12);
 engine.configure({...engine.pattern,bpm:120});close(engine.tick,12);
 engine.start(false);close(engine.anchorTick,12);engine.stop();
});

test('beat sweep reaches every beat anchor continuously, independent of internal attacks',()=>{
 const bars=[[[{ticks:12}],[{ticks:6},{ticks:6}],[{ticks:3},{ticks:6},{ticks:3}],[{ticks:12}]],[[{ticks:12,rest:true}],[{ticks:6,tie:true},{ticks:6}],[{ticks:12}],[{ticks:12,rest:true}]]];
 for(const aligned of [false,true])for(const bar of bars){
  const anchors=bar.map((beat,i)=>beatPositions(beat,i,4,aligned)[0]);
  anchors.push(aligned?715.5:351);
  for(let i=0;i<4;i++){
   close(measureProgressX(bar,{tick:i*12},aligned),anchors[i]);
   for(const f of [.1,.25,.5,.75,.99])close(measureProgressX(bar,{tick:(i+f)*12},aligned),anchors[i]+(anchors[i+1]-anchors[i])*f);
   if(i)assert.ok(Math.abs(measureProgressX(bar,{tick:i*12-1e-6},aligned)-anchors[i])<.0001);
  }
  const changed=structuredClone(bar);changed[1]=[{ticks:9},{ticks:3}];
  for(let tick=0;tick<=48;tick+=.25)close(measureProgressX(bar,{tick},aligned),measureProgressX(changed,{tick},aligned));
 }
});

test('all pack beats and guide rows reach their engraved starts, including long scores',()=>{
 const bars=builtinPacks('en').flatMap(p=>p.measures);
 for(const meter of GUIDE_METERS)for(const pattern of guidePatterns(meter)){
  const compiled=compileGuide(pattern,meter);
  bars.push(compiled.groups.map(g=>g.notes));
  for(let i=0;i<compiled.groups.length;i+=2)bars.push(compiled.groups.slice(i,i+2).map(g=>g.notes));
 }
 for(const aligned of [false,true])for(const bar of bars){
  let at=0;const total=bar.flat().reduce((sum,n)=>sum+n.ticks,0);
  for(let i=0;i<bar.length;i++){
   for(const measure of [0,1,127])close(measureProgressX(bar,{measure,tick:measure*total+at},aligned),beatPositions(bar[i],i,bar.length,aligned)[0]);
   at+=bar[i].reduce((sum,n)=>sum+n.ticks,0);
  }
 }
});

test('sweep resets on every bar and spoken count through repeats and loop boundaries',()=>{
 for(const bpm of [60,180])for(const repeated of [false,true]){
  const p={...createPattern(4),measures:Array.from({length:3},()=>Array.from({length:4},()=>[{ticks:12,rest:false}])),measureRepeats:[repeated,false,false],bpm,click:true,loop:true,countIn:false};
  const ctx={currentTime:0},engine=new RhythmTransport(ctx,{},()=>{}),counts=[];
  engine.configure(p);engine.anchorTime=0;engine.anchorTick=0;engine.next=0;engine.sound=()=>{};engine.beatSound=(at,index)=>counts.push({at,index});
  const duration=engine.total*secondsPerTick(p);
  for(let time=0;time<duration*2-.1;time+=.01){ctx.currentTime=time;engine.schedule();}
  for(const {at,index} of counts){
   const tick=at/secondsPerTick(p),pos=positionAt(p,tick);
   const start=beatPositions(p.measures[pos.measure][index],index,4)[0];
   close(measureProgressX(p.measures[pos.measure],pos),start);
   const next=positionAt(p,tick+1);
   assert.ok(measureProgressX(p.measures[next.measure],next)>start);
  }
  assert.equal(positionAt(p,48).measure,repeated?0:1);
  assert.ok(counts.length>=engine.total/12*2);
 }
});
