import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Plus,X,Delete,Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {useRef,useLayoutEffect} from 'react';
export default function MobileScoreInput({desktop=false,openTool,onTool,onCloseTool,techniques,beamSelection,onBeamApply,cursor,event,meter,beamRangeMode,onBeamRange,onKey,onBar,onAddBar,onPick,onBatch,feedback,playback}) {
 const panel=useRef(null);useLayoutEffect(()=>{const node=panel.current;if(desktop)return;const observer=new ResizeObserver(()=>node.closest('dialog').style.setProperty('--mobile-input-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[desktop]);
 const arrows={ArrowUp,ArrowDown,ArrowLeft,ArrowRight};
 const key=(k,label)=>{const Icon=arrows[k];return <button type="button" className={k==='Delete'?'is-delete':undefined} aria-label={label} onClick={()=>onKey(k)}>{Icon?<Icon size={21} strokeWidth={1.8}/>:k==='Delete'?<><Trash2 size={18}/><span>삭제</span></>:label}</button>;};
 const hasPanel=['note','picking','beam'].includes(openTool),covered=!desktop&&hasPanel;
 // Panels remain nonmodal; reserve scroll room only where a panel overlaps paper.
 useLayoutEffect(()=>{
  if(desktop)return;const workspace=panel.current.closest('dialog'),canvas=workspace.querySelector('.etudeEditorCanvas');if(!canvas)return;
  const popover=panel.current.querySelector('.mobileDockPopover,.mobileScoreSmallSheet.is-anchored');
  if(!popover){canvas.style.removeProperty('--tool-overlap');return;}
  const reveal=()=>{const bounds=canvas.getBoundingClientRect(),bottom=Math.min(bounds.bottom,popover.getBoundingClientRect().top-8),overlap=Math.max(0,bounds.bottom-bottom);canvas.style.setProperty('--tool-overlap',`${overlap}px`);
   const host=canvas.querySelector(`[data-bar-index="${cursor.bar}"] [data-draw-count]`),selected=host?.shadowRoot?.querySelector('.etudeStaffCursor,.is-cursor');if(!selected)return;
   const rect=selected.getBoundingClientRect();if(rect.bottom>bottom-8)canvas.scrollTop+=rect.bottom-bottom+8;else if(rect.top<bounds.top+8)canvas.scrollTop+=rect.top-bounds.top-8;
  };
  const frame=requestAnimationFrame(reveal),observer=new ResizeObserver(reveal);observer.observe(popover);return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[desktop,openTool,cursor]);

 return <section ref={panel} className={desktop?"desktopScoreInput":"mobileScoreInput"} aria-label="통합 악보 입력">
  {(!desktop||!hasPanel)&&<>
  <div className="mobileCursorPad" inert={covered?true:undefined}>
   <button type="button" onClick={()=>onBar(-1)} aria-label="이전 마디"><ChevronLeft size={20}/><span>마디</span></button>{key('ArrowUp','위 기타 줄')}<button type="button" onClick={()=>onBar(1)} aria-label="다음 마디"><span>마디</span><ChevronRight size={20}/></button>
   {key('ArrowLeft','이전 입력 위치')}<output>{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박{event.tuplet?` · ${Math.round(event.onset%(1920/meter[1])/(1920/meter[1])*3)+1}/3`:''} · {cursor.string}번줄</output>{key('ArrowRight','다음 입력 위치')}
   {key('r','쉼표')}{key('ArrowDown','아래 기타 줄')}{key('Delete','삭제')}
  </div>
  <div inert={covered?true:undefined} className="mobileFretPad" aria-label="프렛 숫자 입력">{['1','2','3','4','5','6','7','8','9','0','X','⌫'].map(k=><button type="button" key={k} aria-label={k==='⌫'?'프렛 삭제':k==='X'?'뮤트음':`프렛 ${k}`} onClick={()=>onKey(k==='⌫'?'Delete':k)}>{k==='⌫'?<Delete size={22}/>:k}</button>)}</div>
  </>}
  {desktop&&hasPanel&&<output className="desktopCursorStatus">{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박 · {cursor.string}번줄</output>}
  <div className="mobileToolDock">
   {openTool==='note'&&techniques}
   {(openTool==='picking'||openTool==='beam')&&<section className="mobileDockPopover" aria-label={openTool==='picking'?'피킹 도구':'빔 도구'} id={`mobile-tool-${openTool}`}>
    <header><strong>{openTool==='picking'?'피킹':'빔'}</strong><button type="button" aria-label="도구 닫기" onClick={onCloseTool}><X size={22}/></button></header>
    {openTool==='picking'?<div className="mobilePickingColumns"><div className="mobilePickRow"><span>일괄</span>{[['down','Π'],['up','V'],['alternate-down','Π V']].map(([value,label])=><button type="button" key={value} aria-label={value==='down'?'모두 다운':value==='up'?'모두 업':'다운 업 교대'} onClick={()=>onBatch(value)}><span className="pickSymbol">{value==='alternate-down'?<><EditorMusicIcon kind="down"/><EditorMusicIcon kind="up"/></>:<EditorMusicIcon kind={value}/>}</span><span>{value==='down'?'다운':value==='up'?'업':'교대'}</span></button>)}</div>
  <div className="mobilePickRow"><span>직접</span>{[['down','Π'],['up','V'],[null,'지움']].map(([value,label])=><button type="button" key={label} aria-label={`직접 피킹 ${value==='down'?'다운':value==='up'?'업':'지움'}`} aria-pressed={Boolean(value&&event.pickStroke===value)} onClick={()=>onPick(value)}>{value?<EditorMusicIcon kind={value}/>:<X size={22}/>}<span>{value==='down'?'다운':value==='up'?'업':'지움'}</span></button>)}</div></div>:<div className="mobileBeamPopoverBody">
     <button type="button" aria-label="빔 범위 선택" aria-pressed={beamRangeMode} onClick={onBeamRange}>범위 선택</button>
     {beamRangeMode&&<span className="mobileTechniqueHint">{beamSelection&&!beamSelection.pending?`${Math.abs(beamSelection.end-beamSelection.start)+1}개 음 선택됨`:beamSelection?.pending?'마지막 음을 선택하세요':'첫 음 → 마지막 음 선택'}</span>}
     {beamSelection&&!beamSelection.pending&&beamSelection.start!==beamSelection.end&&<div className="mobileBeamRangeActions">{[['join','연결'],['break','분리']].map(([action,label])=><button type="button" key={action} aria-label={`선택 범위 빔 ${label}`} onClick={()=>onBeamApply(action)}>{label}</button>)}</div>}
    </div>}
   </section>}
   <div className="mobileInputExtras"><button type="button" onClick={onAddBar}><Plus size={18}/><span>마디 추가</span></button>{[['picking','피킹'],['note','주법'],['beam','빔']].map(([kind,label])=><button type="button" key={kind} data-mobile-tool-toggle={kind} aria-label={`${label} 도구 ${openTool===kind?'닫기':'열기'}`} aria-expanded={openTool===kind} aria-pressed={openTool===kind} aria-controls={openTool===kind?`mobile-tool-${kind}`:undefined} onClick={()=>onTool(kind)}><span>{label}</span>{openTool===kind?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>)}</div>
  </div>
  <div className="mobileEditorFeedback">{feedback}</div>
  {playback}
 </section>;
}
