import ko from "../i18n/locales/ko.js";
import {useEffect, useRef, useState} from 'react';
import {loadGrooveBackingSource} from './grooveBackingSource.js';
import {resumeSharedAudioContext, getAudioBusInput, AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {createGrooveBufferPlayback} from './grooveBufferPlayback.js';
import {claimBackingPlayback} from './playbackOwnership.js';

export function useBackingGroovePreview(volume) {
  const session=useRef({token:0,audio:null,graph:null});
  const [active,setActive]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  function cancel(){const s=session.current;s.token++;s.lease?.release();s.audio?.dispose();s.audio=null;s.graph=null;}
  function stop(){cancel();setActive('');setLoading(false);}
  useEffect(()=>()=>cancel(),[]);
  useEffect(()=>{session.current.graph?.setLevel(volume,{immediate:true});},[volume]);
  async function play(id){
    if(active===id){stop();return;}
    cancel();setActive(id);setLoading(true);setError('');const s=session.current,token=s.token;
    s.lease=claimBackingPlayback(stop);
    try {
      const context=await resumeSharedAudioContext();if(token!==s.token)return;
      if(!context)throw Error('Web Audio unavailable');
      const source=await loadGrooveBackingSource(id);if(token!==s.token)return;
      if(!source)throw Error('Missing pack');
      const buffer=await context.decodeAudioData(await source.blob.arrayBuffer());if(token!==s.token)return;
      s.audio=createGrooveBufferPlayback({context,buffer,output:getAudioBusInput(AUDIO_BUS_IDS.GROOVE,context),level:volume});
      s.audio.loop=true;s.graph=s.audio.graph;
      const audio=s.audio;
      await audio.play();if(token===s.token)setLoading(false);else audio.pause();
    }catch{if(token===s.token){stop();setError(ko["backingLoop.couldnTStartThePreview"]);}}
  }
  return {active,loading,error,play,stop};
}
