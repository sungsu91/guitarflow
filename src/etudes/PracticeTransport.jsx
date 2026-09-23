import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useState} from 'react';
import PracticeBeatDots from './PracticeBeatDots.jsx';
import './practiceTransport.css';
export default function PracticeTransport({fixedInstrument=null,bpm,onBpm,meter,beat,playing,paused,disabled,onStart,onStop,onPause,onResume,click,onClickSound,sound,onSound,instrument,onInstrument,error}){
  useLanguage();
 const [draft,setDraft]=useState(String(bpm));useEffect(()=>setDraft(String(bpm)),[bpm]);
 const commit=()=>{const next=draft.trim()&&Number.isFinite(Number(draft))?Math.max(30,Math.min(240,Math.round(Number(draft)))):bpm;setDraft(String(next));onBpm(next);};
 return <section className="scorePracticeTransport" aria-label={translateUi("etudes.scorePracticeTools")}>
 <PracticeBeatDots meter={meter} beat={beat}/><div className="scorePracticeMain"><label><Translation id="etudes.practiceBpm" /><input aria-label={translateUi("etudes.practiceBpm")} type="number" min="30" max="240" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>
 <button type="button" disabled={disabled} onClick={playing?onPause:paused?onResume:onStart}>{playing?translateUi("app.pause"):paused?translateUi("etudes.resumePractice"):translateUi("app.startPractice")}</button><button type="button" disabled={!playing&&!paused} onClick={onStop}><Translation id="app.stopPractice" /></button>
 <button type="button" aria-pressed={click} onClick={onClickSound}><Translation id="etudes.metronomeClick" />{click?translateUi("etudes.onPracticeFloatingTools"):translateUi("audioStudio.muteAudioStudio")}</button></div>
 <div className="scorePracticeSound" role="group" aria-label={translateUi("etudes.scoreSound")}><button type="button" aria-pressed={sound} onClick={onSound}><Translation id="etudes.scoreSoundPracticeTransport" />{sound?translateUi("etudes.onPracticeFloatingTools"):translateUi("etudes.offPracticeTransport")}</button></div>{error&&<p role="alert">{localizeUi(error)}</p>}</section>;
}
