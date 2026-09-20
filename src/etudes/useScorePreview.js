import {useEffect,useRef} from 'react';
import {resumeSharedAudioContext} from '../audio/audioBus.js';
import {createScoreVoiceOutput,prepareScoreInstrument} from '../audio/scoreInstrument.js';
import {soundingMidi} from './scoreTuning.js';
export default function useScorePreview(instrument,onError){
 const state=useRef({request:0,output:null});
 useEffect(()=>()=>{state.current.request++;state.current.output?.dispose();state.current.output=null;},[instrument]);
 const stop=()=>{state.current.request++;state.current.output?.releaseAll();};
 const play=async(document,cursor)=>{
  const event=document.measures[cursor.bar]?.events[cursor.event];if(!event||event.rest)return;
  const current=state.current,request=++current.request;
  try{
   // Called directly from the key/touch event, allowing iOS to unlock audio.
   const audio=await resumeSharedAudioContext();if(!audio)throw Error('이 브라우저에서 오디오를 시작할 수 없습니다.');
   const buffer=await prepareScoreInstrument(audio,instrument);if(request!==current.request)return;
   current.output??=createScoreVoiceOutput(audio);current.output.releaseAll();
   const phrases=event.notes.map(n=>({string:n.string,fret:n.fret,midi:soundingMidi(document,n),dead:Boolean(n.dead??event.dead),palmMute:Boolean(event.palmMute),pickStroke:event.pickStroke,start:0,duration:.45,segments:[]}));
   current.output.schedule(phrases,audio.currentTime+.012,instrument,buffer);
  }catch(e){if(request===current.request)onError?.(e.message);}
 };
 return {play,stop};
}
