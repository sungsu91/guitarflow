import ko from "../i18n/locales/ko.js";
import {useEffect, useRef, useState} from 'react';
import {loadGrooveBackingSource} from './grooveBackingSource.js';
import {resumeSharedAudioContext, connectMediaElementToBus, disconnectMediaElementFromBus} from '../audio/audioBus.js';
import {claimBackingPlayback} from './playbackOwnership.js';

export function useBackingGroovePreview(volume) {
  const session=useRef({token:0,audio:null,url:'',graph:null});
  const [active,setActive]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  function cancel(){const s=session.current;s.token++;s.lease?.release();s.audio?.pause();disconnectMediaElementFromBus(s.audio);if(s.url)URL.revokeObjectURL(s.url);s.audio=null;s.url='';s.graph=null;}
  function stop(){cancel();setActive('');setLoading(false);}
  useEffect(()=>()=>cancel(),[]);
  useEffect(()=>{session.current.graph?.setLevel(volume,{immediate:true});},[volume]);
  async function play(id){
    if(active===id){stop();return;}
    cancel();setActive(id);setLoading(true);setError('');const s=session.current,token=s.token;
    s.lease=claimBackingPlayback(stop);
    try {
      await resumeSharedAudioContext();
      const source=await loadGrooveBackingSource(id);if(token!==s.token)return;
      if(!source)throw Error('Missing pack');
      s.url=URL.createObjectURL(source.blob);s.audio=new Audio(s.url);s.audio.loop=true;
      s.graph=connectMediaElementToBus(s.audio,{level:volume});s.graph?.setGrooveEnabled(true);if(!s.graph)s.audio.volume=volume;
      const audio=s.audio;
      await audio.play();if(token===s.token)setLoading(false);else audio.pause();
    }catch{if(token===s.token){stop();setError(ko["backingLoop.couldnTStartThePreview"]);}}
  }
  return {active,loading,error,play,stop};
}
