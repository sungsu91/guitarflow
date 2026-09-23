import { formatMessage } from "../i18n/format.js";
import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,RotateCcw} from 'lucide-react';
import {OPEN_CHORD_SHAPES} from './openChordStudies.js';
import {chordCandidateDetails,chordNameCandidates,chordFretWindow,editableChordFrets} from './scoreChordDiagram.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import {maxFret} from './scoreTuning.js';
import './scoreChordDialog.css';

export default function ScoreChordDialog({document:score,bar,cursor,mobile,onApply,onClose}){
  useLanguage();
 const existing=score.measures[bar].chord,count=score.tuning.length,maximum=maxFret(score)-(score.capo??0);
 const meter=measureMeters(score)[bar],unit=1920/meter[1],capacity=meterTicks(meter);
 const initialFrets=editableChordFrets(existing,count);
 const [frets,setFrets]=useState(initialFrets),[barre,setBarre]=useState(existing?.barre??null);
 const [fingers,setFingers]=useState(existing?.fingers??Array(count).fill(null));
 const initialWindow=existing?.fretWindow??chordFretWindow(initialFrets,maximum),rowHeight=mobile?32:40;
 const [fretCount,setFretCount]=useState(Math.max(3,Math.min(7,initialWindow.end-initialWindow.start+1)));
 const [autoFill,setAutoFill]=useState(false),[lastInput,setLastInput]=useState('');
 const [manual,setManual]=useState(Boolean(existing)&&!chordNameCandidates(score,initialFrets).includes(existing.name)),[name,setName]=useState(existing?.name??'');
 const [choice,setChoice]=useState(''),[barreStart,setBarreStart]=useState(null),[barrePreview,setBarrePreview]=useState(null);
 const [error,setError]=useState('');
 const [visibleStart,setVisibleStart]=useState(initialWindow.start),[cellWidth,setCellWidth]=useState(56);
 const ref=useRef(null),board=useRef(null),gesture=useRef(null),timer=useRef(null),closeButton=useRef(null);
 const window={start:visibleStart,end:visibleStart+fretCount-1};
 const appliedFrets=frets.map(f=>f>0&&(f<window.start||f>window.end)?undefined:f);
 const details=chordCandidateDetails(score,appliedFrets,{inferOpen:frets.map(f=>f===undefined)});
 const candidates=details.map(c=>c.name);
 useEffect(()=>setChoice(''),[frets,visibleStart,fretCount]);
 const viewStart=useRef(initialWindow.start);
 const selectedName=manual?name:(candidates.includes(choice)?choice:candidates[0]??'');
 const library=useMemo(()=>{
  const items=score.measures.flatMap((m,i)=>m.chord?[{label:formatMessage(ko["etudes.valueBarValue"], { value1: m.chord.name, value2: i+1 }),shape:m.chord}]:[]);
  const standard=score.instrument==='guitar'&&score.tuning.join(',')==='64,59,55,50,45,40'&&!score.capo;
  return [...items,...(standard?Object.entries(OPEN_CHORD_SHAPES).map(([name,shape])=>({label:name,shape:{...shape,name}})):[])];
 },[score]);
 useEffect(()=>{const dialog=ref.current;dialog.showModal();closeButton.current?.focus();return()=>{clearTimeout(timer.current);dialog.close();};},[]);
 useLayoutEffect(()=>{const node=board.current;const resize=()=>setCellWidth(node.clientWidth/fretCount);resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();},[fretCount]);
 useLayoutEffect(()=>{const first=Math.min(viewStart.current,maximum-fretCount+1);viewStart.current=first;setVisibleStart(first);board.current.scrollLeft=(first-1)*cellWidth;},[cellWidth,fretCount,maximum]);
 const clearGesture=()=>{clearTimeout(timer.current);gesture.current=null;setBarrePreview(null);};
 const editString=(string,value)=>{setFrets(f=>f.map((v,i)=>i===count-string?value:v));setFingers(f=>f.map((v,i)=>i===count-string?null:v));if(barre&&string>=barre.to&&string<=barre.from&&(value==null||value<barre.fret))setBarre(null);setError('');};
 const finishBarre=(anchor,string)=>{
  if(anchor.string===string){setBarreStart(anchor);return;}
  const next={fret:anchor.fret,from:Math.max(anchor.string,string),to:Math.min(anchor.string,string)};
  setBarre(next);setBarreStart(null);setBarrePreview(null);
  // Barre is a visual annotation; only explicit string input changes notes.
  setError('');
 };
 const tap=(string,fret)=>{if(barreStart){finishBarre(barreStart,string);return;}editString(string,frets[count-string]===fret?undefined:fret);setLastInput(formatMessage(ko["etudes.stringValueFretValue"], { value1: string, value2: fret }));};
 const down=(e,string,fret)=>{
  if(e.button!==0)return;clearTimeout(timer.current);
  // The fret wire belongs to the cell on its left, including a small touch tolerance.
  if(fret>1&&e.clientX-e.currentTarget.getBoundingClientRect().left<5)fret--;
  gesture.current={x:e.clientX,y:e.clientY,string,fret,moved:false,long:false,pointer:e.pointerId};
  const target=e.currentTarget;
  timer.current=setTimeout(()=>{const g=gesture.current;if(!g||g.moved)return;g.long=true;setBarreStart({string,fret});setBarrePreview({fret,from:string,to:string});target.setPointerCapture(e.pointerId);},480);
 };
 const move=e=>{
  const g=gesture.current;if(!g)return;
  if(g.long){const rect=board.current.getBoundingClientRect();g.endString=Math.max(1,Math.min(count,Math.floor((e.clientY-rect.top)/rowHeight)+1));setBarrePreview({fret:g.fret,from:Math.max(g.string,g.endString),to:Math.min(g.string,g.endString)});}
  else if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>8){g.moved=true;clearTimeout(timer.current);}
 };
 const up=e=>{const g=gesture.current;clearTimeout(timer.current);if(!g)return;if(g.long){finishBarre(g,g.endString??g.string);if(e.currentTarget.hasPointerCapture(g.pointer))e.currentTarget.releasePointerCapture(g.pointer);}else if(!g.moved)tap(g.string,g.fret);gesture.current=null;setBarrePreview(null);};
 const scrollToFret=start=>board.current.scrollTo({left:(Math.max(1,Math.min(maximum-fretCount+1,start))-1)*cellWidth,behavior:'smooth'});
 const load=value=>{if(value==='')return;const shape=library[Number(value)].shape,next=editableChordFrets(shape,count),range=shape.fretWindow??chordFretWindow(next,maximum);setFrets(next);setBarre(shape.barre??null);setFingers(shape.fingers??Array(count).fill(null));setName(shape.name);setManual(!chordNameCandidates(score,next).includes(shape.name));setChoice(shape.name);viewStart.current=range.start;setVisibleStart(range.start);setFretCount(Math.max(3,Math.min(7,range.end-range.start+1)));board.current.scrollLeft=(range.start-1)*cellWidth;setBarreStart(null);setError('');};
 const reset=()=>{setFrets(Array(count).fill(undefined));setFingers(Array(count).fill(null));setBarre(null);setBarreStart(null);setManual(false);setName('');setChoice('');setLastInput('');viewStart.current=1;setVisibleStart(1);board.current.scrollLeft=0;setError('');};
 const submit=()=>{
  if(!selectedName.trim()){setManual(true);setError(ko["etudes.enterAChordNameOrChooseASuggestedChord"]);return;}
  if(!appliedFrets.some(f=>Number.isInteger(f))){setError(ko["etudes.selectAtLeastOneStringToPlay"]);return;}
  try{onApply({name:selectedName.trim(),frets:appliedFrets.map(f=>f??null),fingers:fingers.map((f,i)=>appliedFrets[i]>0?f:null),barre:barre&&barre.fret>=window.start&&barre.fret<=window.end?barre:null,blankStrings:appliedFrets.flatMap((f,i)=>f===undefined?[count-i]:[]),fretWindow:window,range:{startTick:0,endTick:Math.min(unit,capacity)}},{autoFill});}catch(e){setError(e.message);}
 };
 const displayBarre=barrePreview??barre;
 return <dialog ref={ref} className={`scoreChordDialog scoreChordDialog--${mobile?'mobile':'desktop'}`} aria-label={translateUi("etudes.createChordDiagram")} onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <header><button ref={closeButton} type="button" aria-label={translateUi("etudes.closeChordDiagram")} onClick={onClose}><ArrowLeft size={22}/></button><h2>{existing?translateUi("etudes.editChordDiagram"):translateUi("etudes.createChordDiagram")}</h2><label className="chordLoad"><span><Translation id="app.load" /></span><select aria-label={translateUi("etudes.loadChordDiagram")} value="" onChange={e=>load(e.target.value)}><option value=""><Translation id="app.load" /></option>{library.map((item,i)=><option value={i} key={i}>{localizeUi(item.label)}</option>)}</select></label></header>
  <div className="chordDialogContent">
   <div className="chordNameRow"><span><Translation id="etudes.chordCandidates" /></span><div className="chordCandidates">{candidates.length?candidates.map(c=><button type="button" key={c} aria-pressed={!manual&&selectedName===c} onClick={()=>{setChoice(c);setManual(false);}}>{c}</button>):<small>{frets.some(f=>Number.isInteger(f))?translateUi("etudes.noMatchingCandidates"):translateUi("etudes.chooseAFingering")}</small>}</div><button type="button" aria-pressed={manual} onClick={()=>{setName(selectedName);setManual(v=>!v);}}><Translation id="audioStudio.manual" /></button></div>
   {!manual&&details.length>0&&<small className="chordCandidateHelp">{(()=>{const c=details.find(c=>c.name===selectedName);return [c?.assumed?ko["etudes.treatEmptyStringsAsOpen"]:null,c?.extra?ko["etudes.nearMatchWithExtraTones"]:c?.missing?ko["etudes.someChordTonesOmitted"]:!c?.assumed?ko["etudes.matchingChordTones"]:null].filter(Boolean).join(' · ');})()}</small>}
   {manual&&<label className="chordManualName"><Translation id="etudes.chordNames" /><input aria-label={translateUi("etudes.enterChordName")} placeholder={translateUi("etudes.eGCAm7CG")} maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label>}
   <div className="chordFretNavigation"><button type="button" aria-label={translateUi("etudes.previousFret")} disabled={visibleStart<=1} onClick={()=>scrollToFret(visibleStart-1)}><ChevronLeft size={18}/></button><span><strong>{visibleStart}–{Math.min(maximum,visibleStart+fretCount-1)}<Translation id="etudes.fret" /></strong><Translation id="etudes.swipeToMove" /></span><button type="button" aria-label={translateUi("etudes.nextFret")} disabled={visibleStart>=maximum-fretCount+1} onClick={()=>scrollToFret(visibleStart+1)}><ChevronRight size={18}/></button></div>
   <div className="chordFretboard" style={{'--chord-cell':`${cellWidth}px`,'--chord-row':`${rowHeight}px`,'--chord-board-height':`${rowHeight*count}px`}}>
    <div className="chordOpenStrings">{Array.from({length:count},(_,i)=>{const string=i+1,value=frets[count-string];return <div key={string}><span>{string}</span><button type="button" aria-label={translateUi("etudes.toggleStringValue1OpenMuted", { value1: string })} title={translateUi("etudes.blankOXBlank")} onClick={()=>{setBarreStart(null);editString(string,value===0?null:value===null?undefined:0);}}>{value===0?'○':value===null?'×':''}</button></div>;})}</div>
    <div className="chordFretViewport"><div className="chordFretScroll" ref={board} onScroll={()=>{const first=Math.min(maximum-fretCount+1,Math.max(1,Math.round(board.current.scrollLeft/cellWidth)+1));viewStart.current=first;setVisibleStart(first);if(gesture.current&&!gesture.current.long){gesture.current.moved=true;clearTimeout(timer.current);}}}>
     <div className="chordFretColumns">{Array.from({length:maximum},(_,i)=>i+1).map(fret=><div key={fret} className={`chordFretColumn${fret===1?' is-nut':''}`}>
      <div className="chordFretCells">{Array.from({length:count},(_,i)=>i+1).map(string=><button key={string} type="button" aria-label={translateUi("etudes.stringValue1FretValue2", { value1: string, value2: fret })} aria-pressed={frets[count-string]===fret} onPointerDown={e=>down(e,string,fret)} onPointerMove={move} onPointerUp={up} onPointerCancel={clearGesture} onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail===0)tap(string,fret);}}><span className="chordStringLine"/>{frets[count-string]===fret&&<span className="chordFingerDot"/>}</button>)}{displayBarre?.fret===fret&&<span className="chordBarreMark" style={{top:(displayBarre.to-1)*rowHeight+(rowHeight-16)/2,height:(displayBarre.from-displayBarre.to)*rowHeight+16}}/>}</div>
      <span className="chordFretNumber">{fret}</span>
     </div>)}</div>
    </div></div>
   </div>
   <label className="chordFretCount"><span><Translation id="etudes.visibleFrets" /><strong>{fretCount}<Translation id="etudes.cells" /></strong></span><input type="range" aria-label={translateUi("etudes.numberOfVisibleFrets")} min="3" max="7" step="1" value={fretCount} onChange={e=>{const n=Number(e.target.value);viewStart.current=Math.min(visibleStart,maximum-n+1);setFretCount(n);setError('');}}/><output>{window.start}–{window.end}<Translation id="etudes.placeFret" /></output></label>

   {barreStart?<div className="chordBarreHint" role="status">{barreStart.fret}<Translation id="etudes.fretTapTheEndingStringForTheBarre" /><button type="button" onClick={()=>setBarreStart(null)}><Translation id="common.cancel" /></button></div>:<p className="chordGestureHelp"><Translation id="etudes.tapToPlaceTapAgainToClearHoldForBarre" /></p>}
   <div className="chordGripSummary"><span><Translation id="etudes.selectedFingering" /><strong>{appliedFrets.map(f=>f===undefined?'–':f===null?'X':f).join(' · ')}</strong><small>{count}<Translation id="etudes.1stStringScoreChordDialog" />{lastInput&&` · ${lastInput}`}</small></span><button type="button" aria-label={translateUi("etudes.resetChordFingering")} onClick={reset}><RotateCcw size={16}/><Translation id="app.reset" /></button></div>
   <label className="chordAutoFill"><input type="checkbox" checked={autoFill} onChange={e=>setAutoFill(e.target.checked)}/><span><Translation id="etudes.insertSelectedFingering" /><small>{autoFill?translateUi("etudes.insertsOnOneBeatOnlyUseCopyBeatInTheScoreTo"):translateUi("etudes.attachTheDiagramOnlyKeepExistingNotes")}</small></span></label>
   {barre&&<div className="chordBarreHint"><Translation id="etudes.barre" />{barre.fret}<Translation id="etudes.fretScoreChordDialog" />{barre.from}→{barre.to}<Translation id="etudes.stringEditorSettings" /><button type="button" onClick={()=>{setBarre(null);setBarreStart(null);}}><Translation id="etudes.removeBarre" /></button></div>}
   {error&&<p className="chordDialogError" role="alert">{localizeUi(error)}</p>}
  </div>
  <footer>{existing&&<button type="button" className="chordRemove" onClick={()=>onApply(null)}><Translation id="etudes.deleteChordDiagram" /></button>}<button type="button" className="chordApply" onClick={submit}>{existing?translateUi("etudes.applyChanges"):translateUi("etudes.attachToScore")}</button></footer>
 </dialog>;
}
