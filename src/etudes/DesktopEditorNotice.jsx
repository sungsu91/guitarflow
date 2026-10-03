import {useEffect,useState} from 'react';
import {X} from 'lucide-react';
import './desktopEditorNotice.css';

export default function DesktopEditorNotice({notice}){
 const [phase,setPhase]=useState('hidden'),[paused,setPaused]=useState(false);
 useEffect(()=>{setPhase(notice?'shown':'hidden');setPaused(false);},[notice]);
 useEffect(()=>{
  if(!notice||paused)return;
  const hide=setTimeout(()=>setPhase('leaving'),4600);
  const remove=setTimeout(()=>setPhase('hidden'),4850);
  return()=>{clearTimeout(hide);clearTimeout(remove);};
 },[notice,paused]);
 if(!notice||phase==='hidden')return null;
 const label=typeof notice==='string'?notice:notice.label;
 const [title,...details]=label.split(' · ');
 return <div className={`desktopEditorNotice is-${phase}`} role="status" aria-live="polite" aria-atomic="true" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
  <div><strong>{title}</strong>{details.length>0&&<p>{details.join(' · ')}</p>}</div>
  <button type="button" aria-label="알림 닫기" onClick={()=>setPhase('hidden')}><X size={16} aria-hidden="true"/></button>
 </div>;
}
