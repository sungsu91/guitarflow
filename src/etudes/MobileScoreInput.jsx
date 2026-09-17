import RepeatTools from './RepeatTools.jsx';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Plus,X,Delete,Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {useRef,useLayoutEffect} from 'react';
export default function MobileScoreInput({desktop=false,openTool,onTool,onCloseTool,techniques,beamSelection,onBeamApply,repeatBar,repeatIssue,onRepeat,onNavigation,onDeleteBar,canDeleteBar,cursor,event,meter,beamRangeMode,onBeamRange,onKey,onBar,onAddBar,onPick,onBatch,feedback,playback}) {
 const panel=useRef(null);useLayoutEffect(()=>{const node=panel.current;if(desktop)return;const observer=new ResizeObserver(()=>node.closest('dialog').style.setProperty('--mobile-input-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[desktop]);
 const arrows={ArrowUp,ArrowDown,ArrowLeft,ArrowRight};
 const key=(k,label)=>{const Icon=arrows[k];return <button type="button" className={k==='Delete'?'is-delete':undefined} aria-label={label} onClick={()=>onKey(k)}>{Icon?<Icon size={21} strokeWidth={1.8}/>:k==='Delete'?<><Trash2 size={18}/><span>삭제</span></>:label}</button>;};
 const hasPanel=['note','picking','beam','repeat'].includes(openTool),covered=!desktop&&hasPanel;
 // Mobile tools open over the input pads, between the score and audio dock.
 useLayoutEffect(()=>{
  const workspace=panel.current.closest('dialog'),canvas=workspace.querySelector('.etudeEditorCanvas');if(!canvas)return;
  canvas.style.removeProperty('--tool-overlap');
  const popover=panel.current.querySelector('.mobileDockPopover,.mobileScoreSmallSheet.is-anchored');
  if(!popover)return;
  const dock=panel.current.querySelector('.mobileToolDock'),audio=panel.current.querySelector('.editorAudioDock');
  const fit=()=>{
   const rect=dock.getBoundingClientRect(),button=dock.querySelector(`[data-mobile-tool-toggle="${openTool}"]`).getBoundingClientRect();
   if(!desktop){const top=rect.bottom+10,bottom=audio?.getBoundingClientRect().top??workspace.getBoundingClientRect().bottom;
    dock.style.setProperty('--tool-panel-height',`${Math.max(80,bottom-top-4)}px`);}
   const left=Math.max(0,button.left-rect.left-7),right=Math.min(rect.width,button.right-rect.left+7),width=right-left;
   dock.style.setProperty('--tool-bridge-left',`${left}px`);
   dock.style.setProperty('--tool-bridge-width',`${width}px`);
   const bridge=dock.querySelector('.toolPanelBridge'),a=button.left-rect.left-left,b=button.right-rect.left-left;
   bridge.setAttribute('viewBox',`0 0 ${width} 12`);
   bridge.firstElementChild.setAttribute('d',`M ${a} 0 H ${b} V 3 Q ${b} 11 ${width} 11 V 12 H 0 V 11 Q ${a} 11 ${a} 3 Z`);
   bridge.lastElementChild.setAttribute('d',`M ${a} 0 V 3 Q ${a} 11 0 11 M ${b} 0 V 3 Q ${b} 11 ${width} 11`);
   dock.style.setProperty('--tool-bridge-top',`${button.bottom-rect.top-1}px`);
   dock.style.setProperty('--tool-bridge-height',`${Math.max(1,popover.getBoundingClientRect().top-button.bottom+3)}px`);
   dock.style.setProperty('--tool-origin',`${button.left-rect.left+button.width/2}px`);
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(workspace);observer.observe(panel.current);return()=>observer.disconnect();
 },[desktop,openTool]);

 const inputPads=<>
  {(!desktop||!hasPanel)&&<>
  <div className="mobileCursorPad" inert={covered?true:undefined}>
   <button type="button" onClick={()=>onBar(-1)} aria-label="이전 마디"><ChevronLeft size={20}/><span>마디</span></button>{key('ArrowUp','위 기타 줄')}<button type="button" onClick={()=>onBar(1)} aria-label="다음 마디"><span>마디</span><ChevronRight size={20}/></button>
   {key('ArrowLeft','이전 입력 위치')}<output>{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박{event.tuplet?` · ${Math.round(event.onset%(1920/meter[1])/(1920/meter[1])*3)+1}/3`:''} · {cursor.string}번줄</output>{key('ArrowRight','다음 입력 위치')}
   {key('r','쉼표')}{key('ArrowDown','아래 기타 줄')}{key('Delete','삭제')}
  </div>
  <div inert={covered?true:undefined} className="mobileFretPad" aria-label="프렛 숫자 입력">{['1','2','3','4','5','6','7','8','9','0','X','⌫'].map(k=><button type="button" key={k} aria-label={k==='⌫'?'프렛 삭제':k==='X'?'뮤트음':`프렛 ${k}`} onClick={()=>onKey(k==='⌫'?'Delete':k)}>{k==='⌫'?<Delete size={22}/>:k}</button>)}</div>
  </>}
  {desktop&&hasPanel&&<output className="desktopCursorStatus">{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박 · {cursor.string}번줄</output>}
 </>;
 const toolDock=<div className={`mobileToolDock${hasPanel?' has-connected-panel':''}`}>
   {hasPanel&&<svg className="toolPanelBridge" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M 7 0 H 93 V 3 Q 93 11 100 11 V 12 H 0 V 11 Q 7 11 7 3 Z"/><path className="toolPanelBridgeEdge" d="M 7 0 V 3 Q 7 11 0 11 M 93 0 V 3 Q 93 11 100 11"/></svg>}
   {openTool==='note'&&techniques}
   {(openTool==='picking'||openTool==='beam'||openTool==='repeat')&&<section className="mobileDockPopover" aria-label={`${openTool==='picking'?'피킹':openTool==='repeat'?'반복':'빔'} 도구`} id={`mobile-tool-${openTool}`}>
    <header><strong>{openTool==='picking'?'피킹':openTool==='repeat'?'반복':'빔'}{openTool==='repeat'&&<small className="repeatHeaderTarget"> · {cursor.bar+1}마디</small>}</strong><button type="button" aria-label="도구 닫기" onClick={onCloseTool}><X size={22}/></button></header>
    {openTool==='repeat'?<RepeatTools compact={!desktop} bar={repeatBar} index={cursor.bar} issue={repeatIssue} onRepeat={onRepeat} onNavigation={onNavigation}/>:openTool==='picking'?<div className="mobilePickingColumns"><div className="mobilePickRow"><span>일괄</span>{[['down','Π'],['up','V'],['alternate-down','Π V']].map(([value,label])=><button type="button" key={value} aria-label={value==='down'?'모두 다운':value==='up'?'모두 업':'다운 업 교대'} onClick={()=>onBatch(value)}><span className="pickSymbol">{value==='alternate-down'?<><EditorMusicIcon kind="down"/><EditorMusicIcon kind="up"/></>:<EditorMusicIcon kind={value}/>}</span></button>)}</div>
  <div className="mobilePickRow"><span>직접</span>{[['down','Π'],['up','V'],[null,'지움']].map(([value,label])=><button type="button" key={label} aria-label={`직접 피킹 ${value==='down'?'다운':value==='up'?'업':'지움'}`} aria-pressed={Boolean(value&&event.pickStroke===value)} onClick={()=>onPick(value)}>{value?<EditorMusicIcon kind={value}/>:<X size={22}/>}</button>)}</div></div>:<div className="mobileBeamPopoverBody">
     <button type="button" aria-label="빔 범위 선택" aria-pressed={beamRangeMode} onClick={onBeamRange}>범위 선택</button>
     {beamRangeMode&&<span className="mobileTechniqueHint">{beamSelection&&!beamSelection.pending?`${Math.abs(beamSelection.end-beamSelection.start)+1}개 음 선택됨`:beamSelection?.pending?'마지막 음을 선택하세요':'첫 음 → 마지막 음 선택'}</span>}
     {beamSelection&&!beamSelection.pending&&beamSelection.start!==beamSelection.end&&<div className="mobileBeamRangeActions">{[['join','연결'],['break','분리']].map(([action,label])=><button type="button" key={action} aria-label={`선택 범위 빔 ${label}`} onClick={()=>onBeamApply(action)}>{label}</button>)}</div>}
    </div>}
   </section>}
   <div className="mobileInputExtras"><button type="button" onClick={onAddBar}><Plus size={18}/><span>마디 추가</span></button><button type="button" className="is-delete" disabled={!canDeleteBar} onClick={onDeleteBar}><Trash2 size={18}/><span>마디 삭제</span></button>{[['picking','피킹'],['note','주법'],['beam','빔'],['repeat','반복']].map(([kind,label])=><button type="button" key={kind} data-mobile-tool-toggle={kind} aria-label={`${label} 도구 ${openTool===kind?'닫기':'열기'}`} aria-expanded={openTool===kind} aria-pressed={openTool===kind} aria-controls={openTool===kind?`mobile-tool-${kind}`:undefined} onClick={()=>onTool(kind)}><span>{label}</span>{(desktop?openTool===kind:openTool!==kind)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>)}</div>
  </div>;
 return <section ref={panel} className={desktop?"desktopScoreInput":"mobileScoreInput"} aria-label="통합 악보 입력">
  {desktop?<>{inputPads}{toolDock}</>:<>{toolDock}{inputPads}</>}
  <div className="mobileEditorFeedback">{feedback}</div>
  {playback}
 </section>;
}
