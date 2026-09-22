import {useEffect,useRef} from 'react';
import {getSharedAudioContext,resumeSharedAudioContext,getAudioBusInput,AUDIO_BUS_IDS} from '../audio/audioBus.js';
import {scheduleDrum,prepareDrumSamples} from '../audio/scoreDrums.js';
export default function useDrumAudition(enabled,volume,onError){
 const current=useRef({enabled,volume,onError}),alive=useRef(true),output=useRef(null),hat=useRef(null);current.current={enabled,volume,onError};
 useEffect(()=>{if(enabled){const audio=getSharedAudioContext();if(audio)void prepareDrumSamples(audio).catch(error=>current.current.onError?.(error.message));}},[enabled]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;const node=output.current;output.current=null;if(node){node.gain.setTargetAtTime(0,node.context.currentTime,.01);setTimeout(()=>node.disconnect(),1200);}};},[]);
 useEffect(()=>{const node=output.current;if(node)node.gain.setTargetAtTime(enabled?volume*.8:0,node.context.currentTime,.01);},[enabled,volume]);
 return async (midi,drumArticulation)=>{if(!current.current.enabled||!current.current.volume)return;try{const audio=await resumeSharedAudioContext();if(!alive.current||!audio||!current.current.enabled)return;await prepareDrumSamples(audio);if(!alive.current||!current.current.enabled)return;if(!output.current){output.current=audio.createGain();output.current.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT,audio));}output.current.gain.setValueAtTime(current.current.volume*.8,audio.currentTime);if([42,44,46].includes(midi))hat.current?.release(audio.currentTime+.003);const source=scheduleDrum(audio,{midi,drumArticulation},audio.currentTime+.003,output.current,.46);if([42,44,46].includes(midi))hat.current=source;}catch(error){current.current.onError?.(error.message);}};
}
