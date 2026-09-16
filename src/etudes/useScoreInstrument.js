import {useSyncExternalStore} from 'react';
const key='fretiva.score.instrument';
let instrument='clean-guitar';try{if(localStorage.getItem(key)==='piano')instrument='piano';}catch{}
const listeners=new Set(),subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function setScoreInstrument(value){instrument=value==='piano'?'piano':'clean-guitar';try{localStorage.setItem(key,instrument);}catch{}listeners.forEach(fn=>fn());}
export default function useScoreInstrument(){return [useSyncExternalStore(subscribe,()=>instrument,()=> 'clean-guitar'),setScoreInstrument];}
