import {useEffect,useRef} from 'react';
import {getSharedAudioContext,resumeSharedAudioContext} from '../audio/audioBus.js';
import {prepareScoreInstrument,createScoreVoiceOutput} from '../audio/scoreInstrument.js';
export default function usePianoAudition(enabled,onError){
 const alive=useRef(true),output=useRef(null),settings=useRef({enabled,onError});settings.current={enabled,onError};
 useEffect(()=>{if(enabled){const audio=getSharedAudioContext();if(audio)void prepareScoreInstrument(audio,'piano').catch(e=>settings.current.onError?.(e.message));}},[enabled]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;output.current?.dispose();output.current=null;};},[]);
 return async pitches=>{if(!settings.current.enabled)return;try{const audio=await resumeSharedAudioContext();if(!audio)return;const buffer=await prepareScoreInstrument(audio,'piano');if(!alive.current||!settings.current.enabled)return;output.current??=createScoreVoiceOutput(audio);output.current.schedule(pitches.map(midi=>({midi,string:midi,start:0,duration:1})),audio.currentTime,'piano',buffer);}catch(e){settings.current.onError?.(e.message);}};
}
