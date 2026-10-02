import ko from "../i18n/locales/ko.js";
import {getGrooveMasteringInput} from '../audio/grooveMastering.js';
import { METRONOME_TONE_OPTIONS } from './options.js';
const labels = {crash:ko["metronome.crash"],pedalHihat:ko["metronome.pedalHiHat"],rideBell:ko["metronome.rideBell"],electronicSnare:ko["metronome.electricSnare"],tomHigh:ko["metronome.highTom"],tomMid:ko["metronome.midTom"],tomLow:ko["metronome.lowTom"],hihat:ko["etudes.hiHat"], snare:ko["metronome.snare"], kick:ko["metronome.kick"], clap:ko["metronome.clap"], tick:ko["metronome.click"],ride:ko["metronome.ride"],brushSnare:ko["metronome.brush"],rim:ko["metronome.rim"],stick:ko["metronome.stick"],shaker:ko["metronome.shaker"],openHihat:ko["metronome.openHiHat"],tambourine:ko["metronome.tambourine"],cowbell:ko["metronome.cowbell"],congaSlap:ko["metronome.conga"],cabasa:ko["metronome.cabasa"],agogo:ko["metronome.agogo"],triangle:ko["metronome.triangle"]};
export const GROOVE_TONES = METRONOME_TONE_OPTIONS.map(({id, label}) => [id, labels[id] ?? label]);
// The transport and both editor views share this snapshot without re-rendering App.
export function createGrooveStore(initial) {
  let snapshot=initial;
  const listeners=new Set();
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    set(next){if(Object.is(snapshot,next))return;snapshot=next;listeners.forEach(listener=>listener());},
  };
}
export const GROOVE_STRENGTHS = [[100,ko["metronome.strong"]],[70,ko["metronome.medium"]],[45,ko["metronome.soft"]],[25,ko["metronome.ghost"]]];
// Groove-only mix: kick/snare lead; repeated bright percussion sits behind them.
// Calibrated from the source samples' 20ms RMS, spectral energy and decay;
// quiet cabasa/clap samples are not attenuated like the high-energy cymbals.
// Keep row volumes and velocities intact, including deliberately quiet ghost notes.
export const GROOVE_SAMPLE_GAIN = {
  crash:1, pedalHihat:1, rideBell:1, electronicSnare:1, tomHigh:1, tomMid:1, tomLow:1, kick:1.4, snare:1.25, brushSnare:1.05, rim:.5, clap:.95,
  hihat:.4, openHihat:.45, ride:.95, shaker:.6, tambourine:.55,
  cabasa:1.6, cowbell:.6, agogo:.45, triangle:.5,
  tick:.65, stick:1, congaSlap:.75, woodblock:1, clave:.45, snap:1, fingerTap:1.6,
};
// Reserve the full supported meter per bar so meter/subdivision changes never
// reinterpret the next bar's notes as part of the first bar.
export const GROOVE_BAR_STEPS = 72;
export const MAX_GROOVE_BARS = 4;
export function getGrooveBarCount(pattern) {
  return Math.max(1,Math.min(MAX_GROOVE_BARS,Math.floor(Number(pattern?.barCount)||1)));
}
export function getGrooveStepIndex(pattern, index, stepsPerBar) {
  const bar=Math.floor(index/stepsPerBar)%getGrooveBarCount(pattern);
  return bar*GROOVE_BAR_STEPS+index%stepsPerBar;
}
export function createGrooveRow(tone='hihat', barCount=1) {
  const length=GROOVE_BAR_STEPS*getGrooveBarCount({barCount});
  return {tone,steps:Array(length).fill(false),velocities:Array(length).fill(70),volume:.75,muted:false};
}
export function getGrooveBarRows(pattern, bar) {
  // Legacy packs share rows across bars. New edits give each row one owner.
  return (pattern.rows||[]).filter(row=>row.bar==null || row.bar===bar);
}
function grooveCapacity(pattern) {
  return Math.min(MAX_GROOVE_BARS,Math.max(getGrooveBarCount(pattern),...(pattern.rows||[]).map(row=>Math.ceil(row.steps.length/GROOVE_BAR_STEPS))));
}
function placeGrooveBarRows(rows, bar, capacity) {
  const offset=bar*GROOVE_BAR_STEPS;
  return rows.map(row=>({...row,bar,
    steps:Array.from({length:capacity*GROOVE_BAR_STEPS},(_,i)=>i>=offset&&i<offset+GROOVE_BAR_STEPS&&Boolean(row.steps[i-offset])),
    velocities:Array.from({length:capacity*GROOVE_BAR_STEPS},(_,i)=>i>=offset&&i<offset+GROOVE_BAR_STEPS?(row.velocities?.[i-offset]??70):70),
  }));
}
export function replaceGrooveBar(pattern, bar, replacement) {
  const current=normalizeGroovePattern(pattern);
  const target=Math.max(0,Math.min(getGrooveBarCount(current)-1,bar));
  const capacity=grooveCapacity(current);
  const incoming=extractGrooveBar(replacement,0);
  const rows=Array.from({length:capacity},(_,index)=>{
    if(index===target)return placeGrooveBarRows(incoming.rows,index,capacity);
    return getGrooveBarRows(current,index).map(row=>row.bar===index?row:placeGrooveBarRows([{
      ...row,steps:row.steps.slice(index*GROOVE_BAR_STEPS,(index+1)*GROOVE_BAR_STEPS),
      velocities:row.velocities.slice(index*GROOVE_BAR_STEPS,(index+1)*GROOVE_BAR_STEPS),
    }],index,capacity)[0]);
  }).flat();
  return {...current,name:'custom',rows};
}
export function resizeGroovePattern(pattern, count) {
  const barCount=getGrooveBarCount({barCount:count});
  if(pattern.rows.some(row=>row.bar!=null)) {
    const capacity=grooveCapacity(pattern);
    const nextCapacity=Math.max(capacity,barCount);
    const rows=pattern.rows.map(row=>({...row,
      steps:Array.from({length:nextCapacity*GROOVE_BAR_STEPS},(_,i)=>Boolean(row.steps[i])),
      velocities:Array.from({length:nextCapacity*GROOVE_BAR_STEPS},(_,i)=>row.velocities?.[i]??70),
    }));
    const source=extractGrooveBar(pattern,getGrooveBarCount(pattern)-1);
    for(let bar=capacity;bar<barCount;bar++)rows.push(...placeGrooveBarRows(source.rows,bar,nextCapacity));
    return {...pattern,name:'custom',barCount,rows};
  }
  return {...pattern,name:'custom',barCount,rows:pattern.rows.map(row=>{
    // Shortening the loop retains hidden bars for a later expansion.
    const length=Math.max(row.steps.length,barCount*GROOVE_BAR_STEPS);
    const source=(getGrooveBarCount(pattern)-1)*GROOVE_BAR_STEPS;
    return {...row,
      steps:Array.from({length},(_,i)=>i<row.steps.length?Boolean(row.steps[i]):Boolean(row.steps[source+i%GROOVE_BAR_STEPS])),
      velocities:Array.from({length},(_,i)=>i<row.steps.length?(row.velocities?.[i]??70):(row.velocities?.[source+i%GROOVE_BAR_STEPS]??70)),
    };
  })};
}
export function copyGrooveBar(pattern, from, to) {
  if(from<0 || to<0 || from>=getGrooveBarCount(pattern) || to>=getGrooveBarCount(pattern) || from===to)return pattern;
  const barPackIds=[...(pattern.barPackIds||[])];barPackIds[to]=barPackIds[from]??null;
  return {...replaceGrooveBar(pattern,to,extractGrooveBar(pattern,from)),barPackIds};
}
export function clearGrooveBar(pattern, bar) {
  return {...pattern,name:'custom',rows:pattern.rows.map(row=>({...row,
    steps:row.steps.map((step,i)=>Math.floor(i/GROOVE_BAR_STEPS)===bar?false:step),
  }))};
}
export function extractGrooveBar(pattern, bar) {
  const normalized=normalizeGroovePattern(pattern);
  const target=Math.max(0,Math.min(getGrooveBarCount(normalized)-1,bar));
  const offset=target*GROOVE_BAR_STEPS;
  return {name:normalized.name,barCount:1,rows:getGrooveBarRows(normalized,target).map(({bar:owner,...row})=>({...row,
    steps:row.steps.slice(offset,offset+GROOVE_BAR_STEPS),
    velocities:row.velocities.slice(offset,offset+GROOVE_BAR_STEPS),
  }))};
}
export function applyGrooveBarPack(pattern, pack, bar) {
  const target=Math.max(0,Math.min(getGrooveBarCount(pattern)-1,bar));
  const current=replaceGrooveBar(pattern,target,pack.pattern);
  const barPackIds=[...(current.barPackIds||[])];
  barPackIds[target]=pack.builtin?null:pack.id;
  return {...current,barPackIds};
}
export function applyGrooveQuick(row, mode, index, beats, divisions, strength=70, bar=0) {
  const steps=[...row.steps];
  const velocities=Array.from({length:row.steps.length},(_,i)=>row.velocities?.[i]??70);
  const offset=bar*GROOVE_BAR_STEPS;
  const enabled=!(steps[index] && velocities[index]===Number(strength));
  for(let i=0;i<Math.min(GROOVE_BAR_STEPS,beats*divisions);i++) {
    if(mode==='bulk' || (mode==='partial' && i%divisions===(index-offset)%divisions)) {
      steps[offset+i]=enabled;
      velocities[offset+i]=Number(strength);
    }
  }
  return {...row,steps,velocities};
}
export function normalizeGroovePattern(pattern, previous) {
  const barCount=getGrooveBarCount(pattern);
  const capacity=Math.min(MAX_GROOVE_BARS,Math.max(barCount,...(pattern?.rows||[]).map(row=>Math.ceil((row.steps?.length||0)/GROOVE_BAR_STEPS))));
  const length=capacity*GROOVE_BAR_STEPS;
  const rows=(pattern?.rows || []).map((row,index)=>row===previous?.rows[index] && row.steps.length===length?row:({...createGrooveRow(row.tone,capacity),...row,
    steps:Array.from({length},(_,i)=>Boolean(row.steps?.[i])),
    velocities:Array.from({length},(_,i)=>Math.max(1,Math.min(100,Number(row.velocities?.[i])||70))),
    volume:Number.isFinite(row.volume)?Math.max(0,Math.min(1,row.volume)):.75,muted:Boolean(row.muted)}));
  return {...pattern,barCount,rows:rows.length?rows:[createGrooveRow('hihat',barCount)]};
}
export function createGroovePattern(name = '8beat') {
  const hits = name === 'empty' ? [[], [], []] : [name === '16beat' ? Array.from({length:16}, (_, i) => i) : [0,2,4,6,8,10,12,14], [4,12], [0,8]];
  return {name,rows:['hihat','snare','kick'].map((tone,r)=>({...createGrooveRow(tone),steps:Array.from({length:72},(_,i)=>hits[r].includes(i))}))};
}
export function createGrooveVoiceState() {return {openHats:new Set()};}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function scheduleGrooveStep({audio, output, buffers, pattern, index, time, volume, track, voiceState}) {
  output=getGrooveMasteringInput(audio,output);
  const rows=getGrooveBarRows(pattern,Math.floor(index/GROOVE_BAR_STEPS));
  const closedHat=rows.some(row=>row.tone==='hihat' && !row.muted && (row.volume ?? .75)>0 && row.steps[index]);
  if(closedHat && voiceState) {
    for(const voice of voiceState.openHats) {
      if(voice.time>time || voice.end<=time)continue;
      voice.gain.gain.cancelScheduledValues(time);
      voice.gain.gain.setValueAtTime(voice.level,time);
      voice.gain.gain.linearRampToValueAtTime(0,time+.012);
      try{voice.source.stop(time+.013);}catch{/* Already ended. */}
      voice.end=time+.013;
    }
  }
  rows.forEach(row => {
    if (!row.steps[index] || row.muted || row.volume===0 || (row.tone==='openHihat' && closedHat)) return;
    const velocity=clamp(Number(row.velocities?.[index])||70,1,100)/100;
    // Unity mix output: retain musical balance and user volume; the shared
    // audio bus limits peaks. Empty/muted rows must never lower other voices.
    const level=clamp(volume ?? 1,0,1)*clamp(row.volume ?? .75,0,1)*velocity*(GROOVE_SAMPLE_GAIN[row.tone]??.7);
    const gain=audio.createGain();
    let source,duration;
    if(row.tone==='tick') {
      source=audio.createOscillator();source.frequency.setValueAtTime(1200,time);duration=.05;
    } else {
      if(!buffers[row.tone]){gain.disconnect();return;}
      source=audio.createBufferSource();source.buffer=buffers[row.tone];
      duration=Math.min(source.buffer.duration || .5,row.tone==='ride'?1.8:row.tone==='openHihat'?.35:1);
    }
    gain.gain.setValueAtTime(level,time);
    const fade=Math.min(.025,duration/3);
    gain.gain.setValueAtTime(level,time+duration-fade);
    gain.gain.linearRampToValueAtTime(0,time+duration);
    source.connect(gain);gain.connect(output);
    track(source,gain,time);
    const voice={source,gain,time,end:time+duration,level};
    if(row.tone==='openHihat' && voiceState) {
      voiceState.openHats.add(voice);
      const prior=source.onended;
      source.onended=()=>{voiceState.openHats.delete(voice);prior?.();};
    }
    source.start(time);source.stop(time+duration+.001);
  });
}

