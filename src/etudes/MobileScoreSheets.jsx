import {X} from 'lucide-react';
import {useEffect,useRef} from 'react';
import './mobileScoreSheets.css';


// Mobile-only presentation; document changes use the editor's shared history.
export default function MobileScoreSheets({anchored=false,kind,draft,event,events,eventIndex,view,tabRhythm,onView,onRhythm,onPatch,onBeam,onTuplet,techniques,onClose}){
 const ref=useRef(null);
 useEffect(()=>{if(anchored)return;const outside=e=>{if(!ref.current?.contains(e.target))onClose(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[onClose,anchored]);
 return <section ref={ref} id={anchored?"mobile-tool-note":undefined} className={`mobileScoreSmallSheet is-${kind}${anchored?' is-anchored':''}`} aria-label={kind==='settings'?'악보 설정':'주법 도구'}>
  <header><strong>{kind==='settings'?'악보 설정':'주법'}</strong><button type="button" aria-label="설정 시트 닫기" onClick={()=>onClose(true)}><X size={22}/></button></header>
  <div className="mobileScoreSmallSheetBody">
   <>
    {techniques?<><div className="mobileTechniqueTools">{techniques}</div></>:<p className="mobileTechniqueHint">주법을 적용할 음을 선택하세요.</p>}

   </>
  </div>
 </section>;
}
