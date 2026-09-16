import {useEffect,useRef} from 'react';
import {LockKeyhole} from 'lucide-react';
export default function RhythmModifiers({dottedMode,tupletMode,onDotted,onTriplet}){
 const timer=useRef(null),gesture=useRef(null),suppress=useRef(false);
 const cancel=()=>{clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const abort=()=>{cancel();if(gesture.current)suppress.current=true;gesture.current=null;};
 const finish=()=>{cancel();gesture.current=null;};
 return <span className="rhythmModifiers" role="group" aria-label="점음표와 셋잇단음표">
  <button type="button" className="dottedModifier" aria-label="점음표" title="점음표 · 길게 누르면 고정" aria-pressed={dottedMode!=='off'} data-dotted-mode={dottedMode}
   onPointerDown={e=>{if(e.button!==0)return;cancel();suppress.current=false;gesture.current={x:e.clientX,y:e.clientY};timer.current=setTimeout(()=>{suppress.current=true;onDotted(true);},550);}}
   onPointerMove={e=>{const g=gesture.current;if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>8)abort();}}
   onPointerUp={finish} onPointerCancel={abort} onPointerLeave={abort} onContextMenu={e=>e.preventDefault()}
   onClick={()=>{cancel();if(suppress.current){suppress.current=false;return;}onDotted(false);}}><svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true"><circle cx="12" cy="14" r="2.3" fill="currentColor"/></svg>{dottedMode==='locked'&&<LockKeyhole className="dottedLock" size={10} aria-label="고정"/>}</button>
  <button type="button" aria-label="셋잇단음표" aria-pressed={tupletMode==='active'} onClick={onTriplet}>3</button>
 </span>;
}
