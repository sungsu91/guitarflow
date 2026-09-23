import MobileCursorControls from './MobileCursorControls.jsx';
import {cloneElement} from 'react';
import RepeatTools from './RepeatTools.jsx';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Plus,X,Delete,Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {useRef,useLayoutEffect,useState} from 'react';
export default function MobileScoreInput({drums=false,fretted=true,pitchInput,desktop=false,openTool,onTool,onCloseTool,techniques,repeatBar,repeatIssue,onRepeat,onNavigation,onResetBar,onDeleteBar,canDeleteBar,cursor,event,meter,tabRhythm=true,tabBeamPosition='below',tabShortStems=false,tabPickingPosition='below',onTabBeam,onPickingPosition,onKey,onBar,onCopyLine,onDeleteLine,onCopyBeat,onDeleteBeat,onAddBar,onPick,onBatch,feedback,playback}) {
 const [confirmReset,setConfirmReset]=useState(false);
 const resetButton=useRef(null);
 const closeReset=()=>{setConfirmReset(false);resetButton.current?.focus();};
 useLayoutEffect(()=>{setConfirmReset(false);},[cursor.bar]);
 const panel=useRef(null);useLayoutEffect(()=>{const node=panel.current;if(desktop)return;const observer=new ResizeObserver(()=>node.closest('dialog').style.setProperty('--mobile-input-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[desktop]);
 const arrows={ArrowUp,ArrowDown,ArrowLeft,ArrowRight};
 const key=(k,label)=>{const Icon=arrows[k];return <button type="button" className={k==='Delete'?'is-delete':`cursorKey-${k}`} aria-label={label} onClick={()=>onKey(k)}>{Icon?<Icon size={21} strokeWidth={1.8}/>:k==='Delete'?<><Trash2 size={18}/><span>삭제</span></>:label}</button>;};
 const hasPanel=['note','picking','beam','repeat'].includes(openTool),covered=!desktop&&hasPanel;
 // Mobile tools open over the input pads, between the score and audio dock.
 useLayoutEffect(()=>{
  const workspace=panel.current.closest('dialog'),canvas=workspace.querySelector('.etudeEditorCanvas');if(!canvas)return;
  canvas.style.removeProperty('--tool-overlap');
  const popover=panel.current.querySelector('.mobileDockPopover,.mobileScoreSmallSheet.is-anchored');
  if(!popover)return;
  const dock=panel.current.querySelector('.mobileToolDock'),audio=panel.current.querySelector('.editorAudioDock');
  const fit=()=>{
   const toggle=dock?.querySelector(`[data-mobile-tool-toggle="${openTool}"]`);if(!toggle)return;const rect=dock.getBoundingClientRect(),button=toggle.getBoundingClientRect();
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

 const inputPads=!fretted?pitchInput:<>
  {(!desktop||!hasPanel)&&<>
  <div className="mobileCursorPad" inert={covered?true:undefined}>
   <div className="scoreBarStepper"><button type="button" onClick={()=>onBar(-1)} aria-label="이전 마디"><ChevronLeft size={18}/></button><span aria-hidden="true">마디</span><button type="button" onClick={()=>onBar(1)} aria-label="다음 마디"><ChevronRight size={18}/></button></div>{key('ArrowUp','위 기타 줄')}<div className="scoreLineActions"><button type="button" aria-label="줄 복사" title="현재 운지 묶음을 다음 위치에 복사 · 다음 음표 길이 유지" disabled={event.rest||!event.notes.length} onClick={onCopyLine}>줄 복사</button><button type="button" aria-label="줄 삭제" title="현재 위치의 운지 또는 쉼표 삭제 · 음표 길이 유지" disabled={event.blank&&!event.lowerRest} onClick={onDeleteLine}>줄 삭제</button></div>
   {key('ArrowLeft','이전 입력 위치')}<output>{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박{event.tuplet?` · ${Math.round(event.onset%(1920/meter[1])/(1920/meter[1])*3)+1}/3`:''} · {cursor.string}번줄</output>{key('ArrowRight','다음 입력 위치')}{!desktop&&<div className="scoreBeatActions"><button type="button" onClick={onCopyBeat}>박 복사</button><button type="button" onClick={onDeleteBeat}>박 삭제</button></div>}
   {key('r','쉼표')}{key('ArrowDown','아래 기타 줄')}{desktop?key('Delete','삭제'):<div className="scoreResetActions">{key('Delete','삭제')}<button ref={resetButton} type="button" aria-expanded={confirmReset} onClick={()=>setConfirmReset(v=>!v)}>초기화</button>{confirmReset&&<div className="scoreResetConfirm" role="alertdialog" aria-label="현재 마디 초기화" aria-modal="false" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeReset();}}}><span>현재 마디를 초기화할까요?</span><div><button type="button" onClick={()=>{onResetBar();closeReset();}}>예</button><button type="button" autoFocus onClick={closeReset}>아니요</button></div></div>}</div>}
  </div>
  <div inert={covered?true:undefined} className="mobileFretPad" aria-label="프렛 숫자 입력">{['1','2','3','4','5','6','7','8','9','0','X','⌫'].map(k=><button type="button" key={k} aria-label={k==='⌫'?'프렛 삭제':k==='X'?'뮤트음':`프렛 ${k}`} onClick={()=>onKey(k==='⌫'?'Delete':k)}>{k==='⌫'?<Delete size={22}/>:k}</button>)}</div>
  </>}
  {desktop&&hasPanel&&<output className="desktopCursorStatus">{cursor.bar+1}마디 · {Math.floor(event.onset/(1920/meter[1]))+1}박 · {cursor.string}번줄</output>}
 </>;
 const renderToolDock=(extraActions=null)=><div className={`mobileToolDock${hasPanel?' has-connected-panel':''}`}>
   {hasPanel&&<svg className="toolPanelBridge" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M 7 0 H 93 V 3 Q 93 11 100 11 V 12 H 0 V 11 Q 7 11 7 3 Z"/><path className="toolPanelBridgeEdge" d="M 7 0 V 3 Q 7 11 0 11 M 93 0 V 3 Q 93 11 100 11"/></svg>}
   {openTool==='note'&&techniques}
   {(openTool==='picking'||openTool==='beam'||openTool==='repeat')&&<section className="mobileDockPopover" aria-label={`${openTool==='picking'?'피킹':openTool==='repeat'?'반복':'빔표기'} 도구`} id={`mobile-tool-${openTool}`}>
    <header><strong>{openTool==='picking'?'피킹':openTool==='repeat'?'반복':'빔표기'}{openTool==='repeat'&&<small className="repeatHeaderTarget"> · {cursor.bar+1}마디</small>}</strong><button type="button" aria-label="도구 닫기" onClick={onCloseTool}><X size={22}/></button></header>
    {openTool==='repeat'?<RepeatTools compact={!desktop} bar={repeatBar} index={cursor.bar} issue={repeatIssue} onRepeat={onRepeat} onNavigation={onNavigation}/>:openTool==='picking'?<div className="mobilePickingColumns"><div className="tabDisplayOptions" role="group" aria-label="피킹 표시 위치"><span>위치</span>{[['below','아래'],['above','위']].map(([value,label])=><button type="button" key={value} aria-label={`피킹 ${label} 표시`} aria-pressed={tabPickingPosition===value} onClick={()=>onPickingPosition(value)}>{label}</button>)}</div><div className="mobilePickRow"><span>일괄</span>{[['down','Π'],['up','V'],['alternate-down','Π V']].map(([value,label])=><button type="button" key={value} aria-label={value==='down'?'모두 다운':value==='up'?'모두 업':'다운 업 교대'} onClick={()=>onBatch(value)}><span className="pickSymbol">{value==='alternate-down'?<><EditorMusicIcon kind="down"/><EditorMusicIcon kind="up"/></>:<EditorMusicIcon kind={value}/>}</span></button>)}</div>
  <div className="mobilePickRow"><span>직접</span>{[['down','Π'],['up','V'],[null,'지움']].map(([value,label])=><button type="button" key={label} aria-label={`직접 피킹 ${value==='down'?'다운':value==='up'?'업':'지움'}`} aria-pressed={Boolean(value&&event.pickStroke===value)} onClick={()=>onPick(value)}>{value?<EditorMusicIcon kind={value}/>:<X size={22}/>}</button>)}</div></div>:<div className="mobileBeamPopoverBody">{fretted&&<div className="tabDisplayOptions" role="group" aria-label="TAB 빔 표시"><span>TAB</span>{[['below','아래'],['above','위'],['detached','짧은 기둥'],['hidden','빔 삭제']].map(([value,label])=><button type="button" key={value} aria-label={value==='hidden'?'TAB 빔 삭제':`TAB 빔 ${label} 표시`} aria-pressed={value==='hidden'?!tabRhythm:value==='detached'?tabShortStems:tabBeamPosition===value} onClick={()=>onTabBeam(value)}>{label}</button>)}</div>}
    </div>}
   </section>}
   <div className="mobileInputExtras">{(fretted||desktop)&&<button type="button" onClick={onAddBar}><Plus size={18}/><span>마디 추가</span></button>}<>{(fretted||desktop)&&!drums&&<button type="button" className="is-delete" disabled={!canDeleteBar} onClick={onDeleteBar}><Trash2 size={18}/><span>마디 삭제</span></button>}</>{(fretted?[['picking','피킹'],['note','주법'],['beam','빔표기'],['repeat','반복']]:drums?[['repeat','반복']]:[['note','연결'],['repeat','반복']]).map(([kind,label])=><button type="button" key={kind} data-mobile-tool-toggle={kind} aria-label={`${label} 도구 ${openTool===kind?'닫기':'열기'}`} aria-expanded={openTool===kind} aria-pressed={openTool===kind} aria-controls={openTool===kind?`mobile-tool-${kind}`:undefined} onClick={()=>onTool(kind)}><span>{label}</span>{(desktop?openTool===kind:openTool!==kind)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>)}{drums&&<><button type="button" disabled={!event.lowerRest&&(event.rest||!event.notes.length)} title="현재 위치의 드럼 음 전체 삭제" onClick={onDeleteLine}>삭제</button><button type="button" aria-label="현재 마디 초기화" title="현재 마디의 음을 비웁니다 · 실행 취소 가능" onClick={onResetBar}>초기화</button></>}{extraActions}</div>
  </div>;
 const toolDock=renderToolDock();
 return <section ref={panel} className={desktop?"desktopScoreInput":"mobileScoreInput"} aria-label="통합 악보 입력">
  {!fretted&&!desktop?cloneElement(pitchInput,{renderControls:(actions,navigationExtras)=><MobileCursorControls navigationExtras={navigationExtras} {...{cursor,event,meter,onKey,onBar}}>{renderToolDock(actions.props.children)}</MobileCursorControls>}):desktop&&!drums?<>{inputPads}{toolDock}</>:<>{toolDock}{inputPads}</>}
  {(!desktop||feedback)&&<div className="mobileEditorFeedback">{feedback}</div>}
  {playback}
 </section>;
}

