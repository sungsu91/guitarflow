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
    set(next){snapshot=next;listeners.forEach(listener=>listener());},
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
export function createGrooveRow(tone='hihat') {
  return {tone,steps:Array(72).fill(false),velocities:Array(72).fill(70),volume:.75,muted:false};
}
export function applyGrooveQuick(row, mode, index, beats, divisions, strength=70) {
  const steps=[...row.steps];
  const velocities=Array.from({length:72},(_,i)=>row.velocities?.[i]??70);
  const enabled=!(steps[index] && velocities[index]===Number(strength));
  for(let i=0;i<Math.min(72,beats*divisions);i++) {
    if(mode==='bulk' || (mode==='partial' && i%divisions===index%divisions)) {
      steps[i]=enabled;
      velocities[i]=Number(strength);
    }
  }
  return {...row,steps,velocities};
}
export function normalizeGroovePattern(pattern, previous) {
  const rows=(pattern?.rows || []).map((row,index)=>row===previous?.rows[index]?row:({...createGrooveRow(row.tone),...row,
    steps:Array.from({length:72},(_,i)=>Boolean(row.steps?.[i])),
    velocities:Array.from({length:72},(_,i)=>Math.max(1,Math.min(100,Number(row.velocities?.[i])||70))),
    volume:Number.isFinite(row.volume)?Math.max(0,Math.min(1,row.volume)):.75,muted:Boolean(row.muted)}));
  return {...pattern,rows:rows.length?rows:[createGrooveRow()]};
}
export function createGroovePattern(name = '8beat') {
  const hits = name === 'empty' ? [[], [], []] : [name === '16beat' ? Array.from({length:16}, (_, i) => i) : [0,2,4,6,8,10,12,14], [4,12], [0,8]];
  return {name,rows:['hihat','snare','kick'].map((tone,r)=>({...createGrooveRow(tone),steps:Array.from({length:72},(_,i)=>hits[r].includes(i))}))};
}
export function createGrooveVoiceState() {return {openHats:new Set()};}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function scheduleGrooveStep({audio, output, buffers, pattern, index, time, volume, track, voiceState}) {
  output=getGrooveMasteringInput(audio,output);
  const rows=pattern.rows;
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

