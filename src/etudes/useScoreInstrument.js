import {useEffect,useSyncExternalStore} from 'react';
import {getSharedAudioContext} from '../audio/audioBus.js';
import {prepareScoreInstrument} from '../audio/scoreInstrument.js';
const key='fretiva.score.instrument';
let instrument='clean-guitar';try{if(localStorage.getItem(key)==='piano')instrument='piano';}catch{}
const listeners=new Set(),subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function setScoreInstrument(value){instrument=value==='piano'?'piano':'clean-guitar';try{localStorage.setItem(key,instrument);}catch{}listeners.forEach(fn=>fn());}
export default function useScoreInstrument(){
 const selected=useSyncExternalStore(subscribe,()=>instrument,()=> 'clean-guitar');
 useEffect(()=>{
  if(selected!=='piano')return;
  // Decode while the instrument is selected; do not resume audio or play a note.
  // The shared promise deduplicates editor preview and transport preparation.
  const audio=getSharedAudioContext();
  if(audio)void prepareScoreInstrument(audio,selected).catch(()=>{});
 },[selected]);
 return [selected,setScoreInstrument];
}
