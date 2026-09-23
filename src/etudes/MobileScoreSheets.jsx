import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {X} from 'lucide-react';
import {useEffect,useRef} from 'react';
import './mobileScoreSheets.css';


// Mobile-only presentation; document changes use the editor's shared history.
export default function MobileScoreSheets({anchored=false,kind,draft,event,events,eventIndex,view,tabRhythm,onView,onRhythm,onPatch,onBeam,onTuplet,techniques,onClose}){
  useLanguage();
 const ref=useRef(null);
 useEffect(()=>{if(anchored)return;const outside=e=>{if(!ref.current?.contains(e.target))onClose(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[onClose,anchored]);
 return <section ref={ref} id={anchored?"mobile-tool-note":undefined} className={`mobileScoreSmallSheet is-${kind}${anchored?' is-anchored':''}`} aria-label={kind==='settings'?translateUi("etudes.scoreSettings"):translateUi("etudes.techniqueTools")}>
  <header><strong>{kind==='settings'?translateUi("etudes.scoreSettings"):translateUi("app.technique")}</strong><button type="button" aria-label={translateUi("etudes.closeSettingsSheet")} onClick={()=>onClose(true)}><X size={22}/></button></header>
  <div className="mobileScoreSmallSheetBody">
   <>
    {techniques?<><div className="mobileTechniqueTools">{techniques}</div></>:<p className="mobileTechniqueHint"><Translation id="etudes.selectANoteToApplyATechnique" /></p>}

   </>
  </div>
 </section>;
}
