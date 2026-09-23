import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useState} from 'react';
import './chordDisplayMenu.css';
export default function ChordDisplayMenu({onDiagram,onName}){
  useLanguage();
 const [open,setOpen]=useState(false);
 return <div className="scoreChordDisplayMenu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();e.currentTarget.querySelector('button').focus();}}}>
  <button type="button" className="scoreChordButton" aria-label={translateUi("etudes.chordDiagrams")} title={translateUi("etudes.chordDiagrams")} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Translation id="editor.chordsCompact" /></button>
  {open&&<div className="scoreChordDisplayChoices" role="menu" aria-label={translateUi("etudes.chordDisplay")}>
   <button type="button" role="menuitem" onClick={()=>{setOpen(false);onDiagram();}}><Translation id="etudes.chordDiagrams" /></button>
   <button type="button" role="menuitem" onClick={()=>{setOpen(false);onName();}}><Translation id="etudes.chordNames" /></button>
  </div>}
 </div>;
}
