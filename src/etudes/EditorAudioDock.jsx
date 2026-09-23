import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef,useState} from 'react';
import {Play,Square,Volume2,VolumeX,Check} from 'lucide-react';
export default function EditorAudioDock({drumAudio,fixedInstrument=null,compact=false,sound,onSound,playing,disabled,onPlay,bpm,onBpm,audible,onAudible,status,error}){
  useLanguage();
 const [value,setValue]=useState(String(bpm??60)),[editing,setEditing]=useState(false);
 const cancelBlur=useRef(false);
 useEffect(()=>setValue(String(bpm??60)),[bpm]);
 const commit=()=>{if(cancelBlur.current){cancelBlur.current=false;return;}const next=Math.max(30,Math.min(240,Math.round(Number(value)||bpm||60)));setValue(String(next));setEditing(false);onBpm?.(next);};
 return <section className={`editorAudioDock ${compact?'is-one-row':''}`} aria-label={translateUi("etudes.soundAndPlayback")}>
  {!compact&&fixedInstrument!=='piano'&&<div className="editorTimbre"><label className="editorSoundToggle"><input type="checkbox" checked={sound} onChange={onSound}/><Translation id="etudes.scoreSound" /></label></div>}
  <div className="editorTransport"><button className="editorPlay" type="button" disabled={disabled} aria-label={playing?translateUi("etudes.stopScorePlayback"):translateUi("etudes.playScore")} aria-pressed={playing} onClick={onPlay}>{playing?<Square size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}{playing?translateUi("app.stopApp"):translateUi("audioStudio.play")}</button>
   <label className="editorTempo"><input aria-label={translateUi("etudes.scorePlaybackBpm")} inputMode="numeric" type="number" min="30" max="240" value={value} onFocus={e=>{setEditing(true);e.currentTarget.scrollIntoView({block:'nearest'});}} onChange={e=>setValue(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.stopPropagation();cancelBlur.current=true;setValue(String(bpm));setEditing(false);e.currentTarget.blur();}}}/>{editing?<button type="button" aria-label={translateUi("etudes.confirmBpm")} onMouseDown={e=>e.preventDefault()} onClick={e=>{const input=e.currentTarget.parentElement.querySelector('input');if(document.activeElement===input)input.blur();else commit();}}><Check size={20}/></button>:<span><Translation id="originalUi.bpm" /></span>}</label>
   {drumAudio?<><button type="button" className="editorMute" aria-label={drumAudio.muted?translateUi("etudes.unmuteDrumEditor"):translateUi("etudes.muteDrumEditor")} aria-pressed={drumAudio.muted} onClick={()=>drumAudio.onMuted(!drumAudio.muted)}>{drumAudio.muted?<VolumeX size={22}/>:<Volume2 size={22}/>}</button><div className="editorDrumInline"><label><input type="checkbox" checked={audible} onChange={onAudible}/><Translation id="menu.metronome" /></label><label><input type="checkbox" checked={sound} onChange={onSound}/><Translation id="app.drums" /></label></div></>:<button type="button" className="editorMute" aria-label={audible?translateUi("etudes.turnClickOff"):translateUi("etudes.turnClickOn")} aria-pressed={audible} onClick={onAudible}>{audible?<Volume2 size={22}/>:<VolumeX size={22}/>}</button>}
  {compact&&!drumAudio&&fixedInstrument!=='piano'&&<label className="editorSoundToggle"><input type="checkbox" checked={sound} onChange={onSound}/><span><Translation id="etudes.scoreSound" /></span></label>}
  </div><span className="editorAudioStatus" role="status">{localizeUi(status)}<Translation id="etudes.click" />{audible?translateUi("etudes.on"):translateUi("etudes.off")}</span>{error&&<p role="alert">{localizeUi(error)}</p>}
 </section>;
}

