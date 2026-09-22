import {useEffect,useState} from 'react';
import PracticeBeatDots from './PracticeBeatDots.jsx';
import './practiceTransport.css';
export default function PracticeTransport({fixedInstrument=null,bpm,onBpm,meter,beat,playing,paused,disabled,onStart,onStop,onPause,onResume,click,onClickSound,sound,onSound,instrument,onInstrument,error}){
 const [draft,setDraft]=useState(String(bpm));useEffect(()=>setDraft(String(bpm)),[bpm]);
 const commit=()=>{const next=draft.trim()&&Number.isFinite(Number(draft))?Math.max(30,Math.min(240,Math.round(Number(draft)))):bpm;setDraft(String(next));onBpm(next);};
 return <section className="scorePracticeTransport" aria-label="악보 연습 도구">
 <PracticeBeatDots meter={meter} beat={beat}/><div className="scorePracticeMain"><label>연습 BPM<input aria-label="연습 BPM" type="number" min="30" max="240" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>
 <button type="button" disabled={disabled} onClick={playing?onPause:paused?onResume:onStart}>{playing?'일시정지':paused?'연습 재개':'연습 시작'}</button><button type="button" disabled={!playing&&!paused} onClick={onStop}>연습 정지</button>
 <button type="button" aria-pressed={click} onClick={onClickSound}>메트로놈 클릭 {click?'켜짐':'음소거'}</button></div>
 <div className="scorePracticeSound" role="group" aria-label="악보 소리"><button type="button" aria-pressed={sound} onClick={onSound}>악보 소리 {sound?'켜짐':'꺼짐'}</button></div>{error&&<p role="alert">{error}</p>}</section>;
}
