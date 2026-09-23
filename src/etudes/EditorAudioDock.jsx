import {useEffect,useRef,useState} from 'react';
import {Play,Square,Volume2,VolumeX,Check} from 'lucide-react';
export default function EditorAudioDock({drumAudio,fixedInstrument=null,compact=false,sound,onSound,playing,disabled,onPlay,bpm,onBpm,audible,onAudible,status,error}){
 const [value,setValue]=useState(String(bpm??60)),[editing,setEditing]=useState(false);
 const cancelBlur=useRef(false);
 useEffect(()=>setValue(String(bpm??60)),[bpm]);
 const commit=()=>{if(cancelBlur.current){cancelBlur.current=false;return;}const next=Math.max(30,Math.min(240,Math.round(Number(value)||bpm||60)));setValue(String(next));setEditing(false);onBpm?.(next);};
 return <section className={`editorAudioDock ${compact?'is-one-row':''}`} aria-label="음색과 재생">
  {!compact&&fixedInstrument!=='piano'&&<div className="editorTimbre"><label className="editorSoundToggle"><input type="checkbox" checked={sound} onChange={onSound}/>악보 소리</label></div>}
  <div className="editorTransport"><button className="editorPlay" type="button" disabled={disabled} aria-label={playing?'악보 재생 정지':'악보 재생'} aria-pressed={playing} onClick={onPlay}>{playing?<Square size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}{playing?'정지':'재생'}</button>
   <label className="editorTempo"><input aria-label="악보 재생 BPM" inputMode="numeric" type="number" min="30" max="240" value={value} onFocus={e=>{setEditing(true);e.currentTarget.scrollIntoView({block:'nearest'});}} onChange={e=>setValue(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.stopPropagation();cancelBlur.current=true;setValue(String(bpm));setEditing(false);e.currentTarget.blur();}}}/>{editing?<button type="button" aria-label="BPM 확인" onMouseDown={e=>e.preventDefault()} onClick={e=>{const input=e.currentTarget.parentElement.querySelector('input');if(document.activeElement===input)input.blur();else commit();}}><Check size={20}/></button>:<span>BPM</span>}</label>
   {drumAudio?<><button type="button" className="editorMute" aria-label={drumAudio.muted?'드럼 편집실 음소거 해제':'드럼 편집실 음소거'} aria-pressed={drumAudio.muted} onClick={()=>drumAudio.onMuted(!drumAudio.muted)}>{drumAudio.muted?<VolumeX size={22}/>:<Volume2 size={22}/>}</button><div className="editorDrumInline"><label><input type="checkbox" checked={audible} onChange={onAudible}/>메트로놈</label><label><input type="checkbox" checked={sound} onChange={onSound}/>드럼</label></div></>:<button type="button" className="editorMute" aria-label={audible?'박자 소리 끄기':'박자 소리 켜기'} aria-pressed={audible} onClick={onAudible}>{audible?<Volume2 size={22}/>:<VolumeX size={22}/>}</button>}
  {compact&&!drumAudio&&fixedInstrument!=='piano'&&<label className="editorSoundToggle"><input type="checkbox" checked={sound} onChange={onSound}/><span>악보 소리</span></label>}
  </div><span className="editorAudioStatus" role="status">{status} · 박자 소리 {audible?'켬':'끔'}</span>{error&&<p role="alert">{error}</p>}
 </section>;
}

