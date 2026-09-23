import {useState} from 'react';
import './chordDisplayMenu.css';
export default function ChordDisplayMenu({onDiagram,onName}){
 const [open,setOpen]=useState(false);
 return <div className="scoreChordDisplayMenu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();e.currentTarget.querySelector('button').focus();}}}>
  <button type="button" className="scoreChordButton" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>코드표</button>
  {open&&<div className="scoreChordDisplayChoices" role="menu" aria-label="코드 표시 방식">
   <button type="button" role="menuitem" onClick={()=>{setOpen(false);onDiagram();}}>코드표</button>
   <button type="button" role="menuitem" onClick={()=>{setOpen(false);onName();}}>코드명</button>
  </div>}
 </div>;
}
