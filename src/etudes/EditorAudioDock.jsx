import {useEffect,useRef,useState} from 'react';
import {Play,Square,Volume2,VolumeX,Check} from 'lucide-react';
export default function EditorAudioDock({instrument,onInstrument,playing,disabled,onPlay,bpm,onBpm,audible,onAudible,status,error}){
 const [value,setValue]=useState(String(bpm??60)),[editing,setEditing]=useState(false);
 const cancelBlur=useRef(false);
 useEffect(()=>setValue(String(bpm??60)),[bpm]);
 const commit=()=>{if(cancelBlur.current){cancelBlur.current=false;return;}const next=Math.max(30,Math.min(240,Math.round(Number(value)||bpm||60)));setValue(String(next));setEditing(false);onBpm?.(next);};
 return <section className="editorAudioDock" aria-label="음색과 재생">
  <div className="editorTimbre"><span>음색</span><div role="group" aria-label="음색">{[['clean-guitar','클린 기타'],['piano','피아노']].map(([id,label])=><button type="button" key={id} aria-pressed={instrument===id} onClick={()=>onInstrument(id)}>{label}</button>)}</div></div>
  <div className="editorTransport"><button className="editorPlay" type="button" disabled={disabled} aria-label={playing?'악보 재생 정지':'악보 재생'} aria-pressed={playing} onClick={onPlay}>{playing?<Square size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}{playing?'정지':'재생'}</button>
   <label className="editorTempo"><input aria-label="악보 재생 BPM" inputMode="numeric" type="number" min="30" max="240" value={value} onFocus={e=>{setEditing(true);e.currentTarget.scrollIntoView({block:'nearest'});}} onChange={e=>setValue(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.stopPropagation();cancelBlur.current=true;setValue(String(bpm));setEditing(false);e.currentTarget.blur();}}}/>{editing?<button type="button" aria-label="BPM 확인" onMouseDown={e=>e.preventDefault()} onClick={e=>{const input=e.currentTarget.parentElement.querySelector('input');if(document.activeElement===input)input.blur();else commit();}}><Check size={20}/></button>:<span>BPM</span>}</label>
   <button type="button" className="editorMute" aria-label={audible?'박자 소리 끄기':'박자 소리 켜기'} aria-pressed={audible} onClick={onAudible}>{audible?<Volume2 size={22}/>:<VolumeX size={22}/>}</button>
  </div><span className="editorAudioStatus" role="status">{status} · 박자 소리 {audible?'켬':'끔'}</span>{error&&<p role="alert">{error}</p>}
 </section>;
}
