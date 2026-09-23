import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
export default function PracticeBeatDots({meter=[4,4],beat=-1,showMeter=true,beatAccents={},onToggleAccent}){
  useLanguage();
 return <div className="etudeBeatRow" aria-label={meter.join('/')+' · '+(beat<0?translateUi("app.stopApp"):(beat+1)+translateUi("app.beat"))} data-meter={meter.join('/')} data-beat={beat}>{Array.from({length:meter[0]},(_,i)=>{
 const state=beatAccents[i]??(i===0),strong=state===true,muted=state==='mute',label=muted?translateUi("app.silent"):strong?translateUi("app.accent"):translateUi("etudes.unaccented");
 const className='etudeBeat '+(beat===i?'is-on ':'')+(strong?'is-downbeat ':'')+(muted?'is-muted':'');
 const dot=<i aria-hidden="true">{muted&&<svg className="etudeBeatMuteCheck" viewBox="0 0 16 16"><path d="m4 8 3 3 5-6"/></svg>}</i>;
 return onToggleAccent?<button type="button" key={i} className={className} aria-label={(i+1)+translateUi("etudes.beatPracticeBeatDots")+label} title={(strong?translateUi("etudes.unaccented"):muted?translateUi("app.accent"):translateUi("app.silent"))+translateUi("etudes.switch")} onClick={()=>onToggleAccent(i)}>{dot}{i+1}</button>:<span key={i} className={className} aria-label={(i+1)+translateUi("etudes.beatPracticeBeatDots")+label}>{dot}{i+1}</span>;
 })}{showMeter&&<small>{meter.join('/')}</small>}</div>;
}
