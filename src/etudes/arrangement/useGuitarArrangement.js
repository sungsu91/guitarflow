import {useEffect,useRef,useState} from 'react';
import {midiName} from '../scoreTuning.js';
export function arrangementChangeText(change){
 const where=`${change.bar}마디`;
 if(change.action==='octave')return `${where} · ${midiName(change.from)} → ${midiName(change.to)} (기타 음역)`;
 if(change.action==='shorten')return `${where} · 반주 지속음을 ${(change.from-change.to)/480}박 줄임`;
 return `${where} · ${Number.isInteger(change.midi)?midiName(change.midi):'반주음'} ${change.reason==='melody-merge'?'멜로디와 병합':'생략'}${change.role==='bass'?' · 베이스 확인 필요':''}`;
}
export default function useGuitarArrangement(document,onApply,onClose,layout){
 const [options,setOptions]=useState({mode:'voicing',template:'bass-3-12-3',melodyVoice:'auto',maxSpan:4,maxFingers:4,maxFret:20,maxShift:7,allowOctaves:true});
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const job=useRef(null),dialog=useRef(null);
 const stop=()=>{job.current?.terminate();job.current=null;};
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[layout]);
 useEffect(()=>stop,[]);
 useEffect(()=>{stop();setBusy(false);setResult(null);},[document]);
 const change=(key,value)=>{stop();setBusy(false);setOptions(o=>({...o,[key]:value}));setResult(null);setError('');};
 const preview=()=>{
  stop();setBusy(true);setResult(null);setError('');
  const worker=new Worker(new URL('./arrangement.worker.js',import.meta.url),{type:'module'});job.current=worker;
  worker.onmessage=({data})=>{if(job.current!==worker)return;setBusy(false);if(data.error)setError(data.error);else setResult(data.result);stop();};
  worker.onerror=e=>{e.preventDefault();setBusy(false);setError('편곡 계산을 완료하지 못했습니다. 원본은 그대로 보존되어 있습니다.');stop();};
  worker.postMessage({document,options});
 };
 const voices=[...new Set(document.measures.flatMap(m=>m.events.map(e=>e.voice).filter(Boolean)))];
 return {dialog,options,change,result,busy,error,voices,preview,close:()=>{stop();onClose();},apply:()=>{if(result&&!busy)onApply(result.document);},restore:document.guitarArrangement?.sourceDocument?()=>{stop();onApply(structuredClone(document.guitarArrangement.sourceDocument));}:null,changes:result?.report.audit.map(arrangementChangeText)??[]};
}
