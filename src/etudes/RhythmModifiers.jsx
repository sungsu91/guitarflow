import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef} from 'react';
import {LockKeyhole} from 'lucide-react';
export default function RhythmModifiers({dottedMode,tupletMode,onDotted,onTriplet,onSextuplet,tupletCount=3,tripletControl,controlCount=3}){
  useLanguage();
 const timer=useRef(null),gesture=useRef(null),suppress=useRef(false);
 const cancel=()=>{clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const abort=()=>{cancel();if(gesture.current)suppress.current=true;gesture.current=null;};
 const finish=()=>{cancel();gesture.current=null;};
 return <span className="rhythmModifiers" role="group" aria-label={translateUi("etudes.dottedNotesAndTriplets")}>
  <button type="button" className="dottedModifier" aria-label={translateUi("etudes.dottedNote")} title={translateUi("etudes.dottedNoteHoldToLock")} aria-pressed={dottedMode!=='off'} data-dotted-mode={dottedMode}
   onPointerDown={e=>{if(e.button!==0)return;cancel();suppress.current=false;gesture.current={x:e.clientX,y:e.clientY};timer.current=setTimeout(()=>{suppress.current=true;onDotted(true);},550);}}
   onPointerMove={e=>{const g=gesture.current;if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>8)abort();}}
   onPointerUp={finish} onPointerCancel={abort} onPointerLeave={abort} onContextMenu={e=>e.preventDefault()}
   onClick={()=>{cancel();if(suppress.current){suppress.current=false;return;}onDotted(false);}}><svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true"><circle cx="12" cy="14" r="2.3" fill="currentColor"/></svg>{dottedMode==='locked'&&<LockKeyhole className="dottedLock" size={10} aria-label={translateUi("etudes.locked")}/>}</button>
  {tripletControl&&controlCount===3?tripletControl:<button type="button" aria-label={translateUi("etudes.triplet")} aria-pressed={tupletMode==='active'&&tupletCount===3} onClick={onTriplet}>3</button>}
  {onSextuplet&&(tripletControl&&controlCount===6?tripletControl:<button type="button" aria-label={translateUi("etudes.sextuplet")} aria-pressed={tupletMode==='active'&&tupletCount===6} onClick={onSextuplet}>6</button>)}
 </span>;
}
