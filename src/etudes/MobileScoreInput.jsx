import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import MobileCursorControls from './MobileCursorControls.jsx';
import {cloneElement} from 'react';
import RepeatTools from './RepeatTools.jsx';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Plus,X,Delete,Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {useRef,useLayoutEffect,useState} from 'react';
export default function MobileScoreInput({drums=false,fretted=true,pitchInput,desktop=false,openTool,onTool,onCloseTool,techniques,repeatBar,repeatIssue,onRepeat,onNavigation,onResetBar,onDeleteBar,canDeleteBar,cursor,event,meter,tabRhythm=true,tabBeamPosition='below',tabShortStems=false,tabPickingPosition='below',onTabBeam,onPickingPosition,onKey,onBar,onCopyLine,onDeleteLine,onCopyBeat,onDeleteBeat,onAddBar,onPick,onBatch,feedback,playback}) {
  useLanguage();
 const [confirmReset,setConfirmReset]=useState(false);
 const resetButton=useRef(null);
 const closeReset=()=>{setConfirmReset(false);resetButton.current?.focus();};
 useLayoutEffect(()=>{setConfirmReset(false);},[cursor.bar]);
 const panel=useRef(null);useLayoutEffect(()=>{const node=panel.current;if(desktop)return;const observer=new ResizeObserver(()=>node.closest('dialog').style.setProperty('--mobile-input-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[desktop]);
 const arrows={ArrowUp,ArrowDown,ArrowLeft,ArrowRight};
 const key=(k,label)=>{const Icon=arrows[k];return <button type="button" className={k==='Delete'?'is-delete':`cursorKey-${k}`} aria-label={localizeUi(label)} onClick={()=>onKey(k)}>{Icon?<Icon size={21} strokeWidth={1.8}/>:k==='Delete'?<><Trash2 size={18}/><span><Translation id="common.delete" /></span></>:label}</button>;};
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
   <div className="scoreBarStepper"><button type="button" onClick={()=>onBar(-1)} aria-label={translateUi("etudes.previousBar")}><ChevronLeft size={18}/></button><span aria-hidden="true"><Translation id="app.bar" /></span><button type="button" onClick={()=>onBar(1)} aria-label={translateUi("etudes.nextBar")}><ChevronRight size={18}/></button></div>{key('ArrowUp',translateUi("etudes.guitarStringAbove"))}<div className="scoreLineActions"><button type="button" aria-label={translateUi("etudes.copyRow")} title={translateUi("etudes.copyCurrentFingeringToTheNextPositionKeepNextNoteDuration")} disabled={event.rest||!event.notes.length} onClick={onCopyLine}><Translation id="etudes.copyRow" /></button><button type="button" aria-label={translateUi("etudes.deleteRow")} title={translateUi("etudes.deleteFingeringOrRestAtTheCurrentPositionKeepDuration")} disabled={event.blank&&!event.lowerRest} onClick={onDeleteLine}><Translation id="editor.clearRowCompact" /></button></div>
   {key('ArrowLeft',translateUi("etudes.previousInputPosition"))}<output>{cursor.bar+1}<Translation id="app.barApp" />{Math.floor(event.onset/(1920/meter[1]))+1}<Translation id="app.beat" />{event.tuplet?` · ${Math.round(event.onset%(1920/meter[1])/(1920/meter[1])*3)+1}/3`:''} · {cursor.string}<Translation id="app.string" /></output>{key('ArrowRight',translateUi("etudes.nextInputPosition"))}{!desktop&&<div className="scoreBeatActions"><button type="button" aria-label={translateUi("etudes.copyBeat")} title={translateUi("etudes.copyBeat")} onClick={onCopyBeat}><Translation id="editor.copyBeatCompact" /></button><button type="button" aria-label={translateUi("etudes.deleteBeat")} title={translateUi("etudes.deleteBeat")} onClick={onDeleteBeat}><Translation id="editor.deleteBeatCompact" /></button></div>}
   {key('r',translateUi("etudes.rest"))}{key('ArrowDown',translateUi("etudes.guitarStringBelow"))}{desktop?key('Delete',translateUi("common.delete")):<div className="scoreResetActions">{key('Delete',translateUi("common.delete"))}<button ref={resetButton} type="button" aria-expanded={confirmReset} onClick={()=>setConfirmReset(v=>!v)}><Translation id="app.reset" /></button>{confirmReset&&<div className="scoreResetConfirm" role="alertdialog" aria-label={translateUi("etudes.resetCurrentBar")} aria-modal="false" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeReset();}}}><span><Translation id="etudes.resetThisBar" /></span><div><button type="button" onClick={()=>{onResetBar();closeReset();}}><Translation id="etudes.yes" /></button><button type="button" autoFocus onClick={closeReset}><Translation id="etudes.no" /></button></div></div>}</div>}
  </div>
  <div inert={covered?true:undefined} className="mobileFretPad" aria-label={translateUi("etudes.enterFretNumber")}>{['1','2','3','4','5','6','7','8','9','0','X','⌫'].map(k=><button type="button" key={k} aria-label={k==='⌫'?translateUi("etudes.deleteFret"):k==='X'?translateUi("etudes.mutedNote"):translateUi("etudes.fretValue1", { value1: k })} onClick={()=>onKey(k==='⌫'?'Delete':k)}>{k==='⌫'?<Delete size={22}/>:k}</button>)}</div>
  </>}
  {desktop&&hasPanel&&<output className="desktopCursorStatus">{cursor.bar+1}<Translation id="app.barApp" />{Math.floor(event.onset/(1920/meter[1]))+1}<Translation id="etudes.beat" />{cursor.string}<Translation id="app.string" /></output>}
 </>;
 const renderToolDock=(extraActions=null)=><div className={`mobileToolDock${hasPanel?' has-connected-panel':''}`}>
   {hasPanel&&<svg className="toolPanelBridge" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M 7 0 H 93 V 3 Q 93 11 100 11 V 12 H 0 V 11 Q 7 11 7 3 Z"/><path className="toolPanelBridgeEdge" d="M 7 0 V 3 Q 7 11 0 11 M 93 0 V 3 Q 93 11 100 11"/></svg>}
   {openTool==='note'&&techniques}
   {(openTool==='picking'||openTool==='beam'||openTool==='repeat')&&<section className="mobileDockPopover" aria-label={localizeUi(translateUi("etudes.value1Tools", { value1: openTool==='picking'?ko["etudes.picking"]:openTool==='repeat'?ko["app.repeat"]:ko["etudes.beaming"] }))} id={`mobile-tool-${openTool}`}>
    <header><strong>{openTool==='picking'?translateUi("etudes.picking"):openTool==='repeat'?translateUi("app.repeat"):translateUi("etudes.beaming")}{openTool==='repeat'&&<small className="repeatHeaderTarget"> · {cursor.bar+1}<Translation id="app.bar" /></small>}</strong><button type="button" aria-label={translateUi("etudes.closeTools")} onClick={onCloseTool}><X size={22}/></button></header>
    {openTool==='repeat'?<RepeatTools compact={!desktop} bar={repeatBar} index={cursor.bar} issue={repeatIssue} onRepeat={onRepeat} onNavigation={onNavigation}/>:openTool==='picking'?<div className="mobilePickingColumns"><div className="tabDisplayOptions" role="group" aria-label={translateUi("etudes.pickingMarkPosition")}><span><Translation id="etudes.position" /></span>{[['below',ko["etudes.below"]],['above',ko["etudes.above"]]].map(([value,label])=><button type="button" key={value} aria-label={translateUi("etudes.showPickingValue1", { value1: localizeUi(label) })} aria-pressed={tabPickingPosition===value} onClick={()=>onPickingPosition(value)}>{localizeUi(label)}</button>)}</div><div className="mobilePickRow"><span><Translation id="etudes.fill" /></span>{[['down','Π'],['up','V'],['alternate-down','Π V']].map(([value,label])=><button type="button" key={value} aria-label={value==='down'?translateUi("etudes.allDown"):value==='up'?translateUi("etudes.allUp"):translateUi("etudes.alternateDownUp")} onClick={()=>onBatch(value)}><span className="pickSymbol">{value==='alternate-down'?<><EditorMusicIcon kind="down"/><EditorMusicIcon kind="up"/></>:<EditorMusicIcon kind={value}/>}</span></button>)}</div>
  <div className="mobilePickRow"><span><Translation id="etudes.manual" /></span>{[['down','Π'],['up','V'],[null,ko["etudes.clear"]]].map(([value,label])=><button type="button" key={label} aria-label={localizeUi(translateUi("etudes.manualPickingValue1", { value1: value==='down'?ko["etudes.down"]:value==='up'?ko["etudes.up"]:ko["etudes.clear"] }))} aria-pressed={Boolean(value&&event.pickStroke===value)} onClick={()=>onPick(value)}>{value?<EditorMusicIcon kind={value}/>:<X size={22}/>}</button>)}</div></div>:<div className="mobileBeamPopoverBody">{fretted&&<div className="tabDisplayOptions" role="group" aria-label={translateUi("etudes.tabBeams")}><span><Translation id="originalUi.tab" /></span>{[['below',ko["etudes.below"]],['above',ko["etudes.above"]],['detached',ko["etudes.shortStems"]],['hidden',ko["etudes.removeBeams"]]].map(([value,label])=><button type="button" key={value} aria-label={value==='hidden'?translateUi("etudes.removeTabBeams"):translateUi("etudes.showTabBeamsValue1", { value1: label })} aria-pressed={value==='hidden'?!tabRhythm:value==='detached'?tabShortStems:tabBeamPosition===value} onClick={()=>onTabBeam(value)}>{localizeUi(label,{[ko["etudes.shortStems"]]:"editor.shortStemsCompact",[ko["etudes.removeBeams"]]:"editor.hideBeamsCompact"})}</button>)}</div>}
    </div>}
   </section>}
   <div className="mobileInputExtras">{(fretted||desktop)&&<button type="button" onClick={onAddBar}><Plus size={18}/><span><Translation id="editor.addBarCompact" /></span></button>}<>{(fretted||desktop)&&!drums&&<button type="button" className="is-delete" disabled={!canDeleteBar} onClick={onDeleteBar}><Trash2 size={18}/><span><Translation id="editor.deleteBarCompact" /></span></button>}</>{(fretted?[['picking',ko["etudes.picking"]],['note',ko["app.technique"]],['beam',ko["etudes.beaming"]],['repeat',ko["app.repeat"]]]:drums?[['repeat',ko["app.repeat"]]]:[['note',ko["etudes.connect"]],['repeat',ko["app.repeat"]]]).map(([kind,label])=><button type="button" key={kind} data-mobile-tool-toggle={kind} title={localizeUi(label)} aria-label={localizeUi(translateUi("etudes.value1ToolsValue2", { value1: localizeUi(label), value2: openTool===kind?translateUi("common.close"):translateUi("common.open") }))} aria-expanded={openTool===kind} aria-pressed={openTool===kind} aria-controls={openTool===kind?`mobile-tool-${kind}`:undefined} onClick={()=>onTool(kind)}><span>{localizeUi(label, desktop?undefined:{[ko["etudes.picking"]]:"editor.pickingCompact",[ko["app.technique"]]:"editor.techniqueCompact",[ko["etudes.beaming"]]:"editor.beamingCompact",[ko["app.repeat"]]:"editor.repeatCompact"})}</span>{(desktop?openTool===kind:openTool!==kind)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>)}{drums&&<><button type="button" disabled={!event.lowerRest&&(event.rest||!event.notes.length)} title={translateUi("etudes.deleteAllDrumNotesAtThisPosition")} onClick={onDeleteLine}><Translation id="common.delete" /></button><button type="button" aria-label={translateUi("etudes.resetCurrentBar")} title={translateUi("etudes.clearNotesInThisBarCanBeUndone")} onClick={onResetBar}><Translation id="app.reset" /></button></>}{extraActions}</div>
  </div>;
 const toolDock=renderToolDock();
 return <section ref={panel} className={desktop?"desktopScoreInput":"mobileScoreInput"} aria-label={translateUi("etudes.unifiedScoreInput")}>
  {!fretted&&!desktop?cloneElement(pitchInput,{renderControls:(actions,navigationExtras)=><MobileCursorControls navigationExtras={navigationExtras} {...{cursor,event,meter,onKey,onBar}}>{renderToolDock(actions.props.children)}</MobileCursorControls>}):desktop&&!drums?<>{inputPads}{toolDock}</>:<>{toolDock}{inputPads}</>}
  {(!desktop||feedback)&&<div className="mobileEditorFeedback">{localizeUi(feedback)}</div>}
  {playback}
 </section>;
}

