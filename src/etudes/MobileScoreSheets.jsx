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
   {kind==='settings'?<>
    <label className="mobileScoreTitleField">곡 제목<input aria-label="곡 제목" value={draft.title} onChange={e=>onPatch({title:e.target.value})}/></label>
    <div className="mobileScoreSettingFields">
     <label>박자표<select aria-label="박자표" value={draft.meter.join('/')} onChange={e=>onPatch({meter:e.target.value.split('/').map(Number)})}>{[...new Set(['2/4','3/4','4/4','6/8',draft.meter.join('/')])].map(v=><option key={v}>{v}</option>)}</select></label>
     <label>조표<select aria-label="조표" value={draft.keySignature} onChange={e=>onPatch({keySignature:e.target.value})}>{[...new Set(['C','G','D','A','E','B','F','Bb','Eb','Am','Em','Dm','Gm',draft.keySignature])].map(v=><option key={v}>{v}</option>)}</select></label>
     <label>기본 BPM<input aria-label="기본 BPM" type="number" inputMode="numeric" min="30" max="240" value={draft.bpm} onChange={e=>onPatch({bpm:Math.max(30,Math.min(240,Number(e.target.value)||30))})}/></label>
    </div>
    <div className="mobileScoreViewButtons" role="group" aria-label="보표 보기">{[['both','오선보+TAB'],['staff','오선보만'],['tab','TAB만']].map(([value,label])=><button type="button" key={value} aria-pressed={view===value} onClick={()=>onView(value)}>{label}</button>)}</div>
    <label className="mobileScoreRhythmOption"><input type="checkbox" checked={tabRhythm} disabled={view==='staff'} onChange={e=>onRhythm(e.target.checked)}/>TAB 리듬 표시</label>
   </>:<>
    {techniques?<><div className="mobileTechniqueTools">{techniques}</div></>:<p className="mobileTechniqueHint">주법을 적용할 음을 선택하세요.</p>}

   </>}
  </div>
 </section>;
}
