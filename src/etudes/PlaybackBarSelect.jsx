import {useRef,useState} from 'react';

// A native select's changing :checked option invalidates the surrounding score
// styles in Chromium. Keep the selected option stable during playback and only
// enter selection mode when the musician interacts with this control.
export default function PlaybackBarSelect({bar=0,count,barLabel,onChange,...props}){
 const [editing,setEditing]=useState(false),[choice,setChoice]=useState(bar);
 const pointer=useRef(false);
 const current=Math.min(Math.max(0,bar),Math.max(0,count-1));
 const begin=()=>{setChoice(current);setEditing(true);};
 return <select {...props} value={editing?choice:''}
  onPointerDown={()=>{pointer.current=true;begin();}}
  onFocus={begin}
  onBlur={()=>{pointer.current=false;setEditing(false);}}
  onKeyDown={event=>{pointer.current=false;if(event.key==='Escape')event.currentTarget.blur();}}
  onChange={event=>{const value=Number(event.target.value);setChoice(value);onChange(value);if(pointer.current)event.currentTarget.blur();}}>
  <option value="" disabled hidden>{current+1}{barLabel}</option>
  {Array.from({length:count},(_,i)=><option key={i} value={i}>{i+1}{barLabel}</option>)}
 </select>;
}
