import ko from "../i18n/locales/ko.js";
import {useEffect, useRef, useState} from 'react';
import {scheduleGrooveStep, createGrooveVoiceState} from './groove.js';
import {TIME_SIGNATURE_OPTIONS} from './options.js';
import {getMetronomeSubdivisionOption} from './subdivision.js';
import {createAudioTransportCursor,collectAudioTransportSteps,METRONOME_LOOKAHEAD_SECONDS,AUDIO_TRANSPORT_SCHEDULER_INTERVAL_MS} from '../audio/transportClock.js';
import {claimBackingPlayback} from '../backing-loop/playbackOwnership.js';

// One owner, shared audio clock and transport scheduler, bounded scheduled voices.
export function useGroovePreview(prepare, bpm, onError) {
  const session=useRef({token:0,voices:new Set(),timer:null,id:null,offset:0,running:false});
  const [active,setActive]=useState(null),[loading,setLoading]=useState(false);
  function cancel() {
    const s=session.current;
    s.lease?.release();
    s.token++;clearInterval(s.timer);s.timer=null;s.running=false;
    for(const voice of s.voices) {
      try{voice.source.stop();}catch{/* Already ended. */}
      voice.source.disconnect();voice.gain.disconnect();
    }
    s.voices.clear();
  }
  function stop() {cancel();Object.assign(session.current,{id:null,offset:0});setActive(null);setLoading(false);}
  useEffect(()=>()=>cancel(),[]);
  async function play(pack) {
    const s=session.current;
    if(s.id===pack.id && s.running) {
      s.offset=Math.max(0,s.audio.currentTime-s.origin);
      cancel();setActive(null);setLoading(false);return;
    }
    if(s.id===pack.id && loading) {stop();return;}
    const offset=s.id===pack.id?s.offset:0;
    cancel();Object.assign(s,{id:pack.id,offset});setActive(pack.id);setLoading(true);
    s.lease=claimBackingPlayback(stop);
    const token=s.token;
    try {
      const {audio,buffers,output,volume}=await prepare();
      if(token!==s.token)return;
      if(pack.pattern.rows.some(row=>row.tone!=='tick'&&row.steps.some(Boolean)&&!buffers[row.tone]))throw new Error('Missing sample');
      const beats=TIME_SIGNATURE_OPTIONS.find(v=>v.id===pack.timeSignature)?.beats??4;
      const divisions=getMetronomeSubdivisionOption(pack.subdivision).clicksPerBeat;
      const seconds=60/Math.max(20,Number(bpm)||80)/divisions;
      // Modulo keeps origin nonnegative even after a long paused audition.
      const position=offset%(beats*divisions*seconds);
      const origin=audio.currentTime+.04-position;
      Object.assign(s,{audio,origin,running:true,offset:position});
      let cursor=createAudioTransportCursor({originTime:origin,positionSeconds:position,stepSeconds:seconds});
      const voiceState=createGrooveVoiceState();
      function schedule() {
        if(token!==s.token)return;
        const batch=collectAudioTransportSteps(cursor,{currentTime:audio.currentTime,horizonSeconds:METRONOME_LOOKAHEAD_SECONDS});cursor=batch.cursor;
        for(const {index,time} of batch.steps) scheduleGrooveStep({audio,buffers,output,volume,voiceState,pattern:pack.pattern,index:index%(beats*divisions),time,track:(source,gain)=>{
          const voice={source,gain};s.voices.add(voice);
          source.onended=()=>{s.voices.delete(voice);source.disconnect();gain.disconnect();};
        }});
      }
      schedule();s.timer=setInterval(schedule,AUDIO_TRANSPORT_SCHEDULER_INTERVAL_MS);setLoading(false);
    }catch {
      if(token!==s.token)return;
      stop();onError(ko["metronome.couldnTLoadPreviewAudioTryAgain"]);
    }
  }
  return {active,loading,play,stop};
}
