import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,RotateCcw} from 'lucide-react';
import {OPEN_CHORD_SHAPES} from './openChordStudies.js';
import {chordCandidateDetails,chordNameCandidates,chordFretWindow,editableChordFrets} from './scoreChordDiagram.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import {maxFret} from './scoreTuning.js';
import './scoreChordDialog.css';

export default function ScoreChordDialog({document:score,bar,cursor,mobile,onApply,onClose}){
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
  const items=score.measures.flatMap((m,i)=>m.chord?[{label:`${m.chord.name} · ${i+1}마디`,shape:m.chord}]:[]);
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
 const tap=(string,fret)=>{if(barreStart){finishBarre(barreStart,string);return;}editString(string,frets[count-string]===fret?undefined:fret);setLastInput(`${string}번줄 · ${fret}프렛`);};
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
  if(!selectedName.trim()){setManual(true);setError('코드명을 입력하거나 코드 후보를 선택하세요.');return;}
  if(!appliedFrets.some(f=>Number.isInteger(f))){setError('연주할 줄을 하나 이상 선택하세요.');return;}
  try{onApply({name:selectedName.trim(),frets:appliedFrets.map(f=>f??null),fingers:fingers.map((f,i)=>appliedFrets[i]>0?f:null),barre:barre&&barre.fret>=window.start&&barre.fret<=window.end?barre:null,blankStrings:appliedFrets.flatMap((f,i)=>f===undefined?[count-i]:[]),fretWindow:window,range:{startTick:0,endTick:Math.min(unit,capacity)}},{autoFill});}catch(e){setError(e.message);}
 };
 const displayBarre=barrePreview??barre;
 return <dialog ref={ref} className={`scoreChordDialog scoreChordDialog--${mobile?'mobile':'desktop'}`} aria-label="코드표 만들기" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <header><button ref={closeButton} type="button" aria-label="코드표 닫기" onClick={onClose}><ArrowLeft size={22}/></button><h2>{existing?'코드표 편집':'코드표 만들기'}</h2><label className="chordLoad"><span>불러오기</span><select aria-label="코드표 불러오기" value="" onChange={e=>load(e.target.value)}><option value="">불러오기</option>{library.map((item,i)=><option value={i} key={i}>{item.label}</option>)}</select></label></header>
  <div className="chordDialogContent">
   <div className="chordNameRow"><span>코드 후보</span><div className="chordCandidates">{candidates.length?candidates.map(c=><button type="button" key={c} aria-pressed={!manual&&selectedName===c} onClick={()=>{setChoice(c);setManual(false);}}>{c}</button>):<small>{frets.some(f=>Number.isInteger(f))?'일치하는 후보 없음':'운지를 선택하세요'}</small>}</div><button type="button" aria-pressed={manual} onClick={()=>{setName(selectedName);setManual(v=>!v);}}>직접 입력</button></div>
   {!manual&&details.length>0&&<small className="chordCandidateHelp">{(()=>{const c=details.find(c=>c.name===selectedName);return [c?.assumed?'빈 줄을 개방현으로 가정':null,c?.extra?'다른 음이 섞인 근접 후보':c?.missing?'일부 구성음 생략':!c?.assumed?'구성음 일치':null].filter(Boolean).join(' · ');})()}</small>}
   {manual&&<label className="chordManualName">코드명<input aria-label="코드명 직접 입력" placeholder="예: C, Am7, C/G" maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label>}
   <div className="chordFretNavigation"><button type="button" aria-label="이전 프렛" disabled={visibleStart<=1} onClick={()=>scrollToFret(visibleStart-1)}><ChevronLeft size={18}/></button><span><strong>{visibleStart}–{Math.min(maximum,visibleStart+fretCount-1)} 프렛</strong> · 좌우로 밀어 이동</span><button type="button" aria-label="다음 프렛" disabled={visibleStart>=maximum-fretCount+1} onClick={()=>scrollToFret(visibleStart+1)}><ChevronRight size={18}/></button></div>
   <div className="chordFretboard" style={{'--chord-cell':`${cellWidth}px`,'--chord-row':`${rowHeight}px`,'--chord-board-height':`${rowHeight*count}px`}}>
    <div className="chordOpenStrings">{Array.from({length:count},(_,i)=>{const string=i+1,value=frets[count-string];return <div key={string}><span>{string}</span><button type="button" aria-label={`${string}번줄 개방현·뮤트 전환`} title="빈칸 → O → X → 빈칸" onClick={()=>{setBarreStart(null);editString(string,value===0?null:value===null?undefined:0);}}>{value===0?'○':value===null?'×':''}</button></div>;})}</div>
    <div className="chordFretViewport"><div className="chordFretScroll" ref={board} onScroll={()=>{const first=Math.min(maximum-fretCount+1,Math.max(1,Math.round(board.current.scrollLeft/cellWidth)+1));viewStart.current=first;setVisibleStart(first);if(gesture.current&&!gesture.current.long){gesture.current.moved=true;clearTimeout(timer.current);}}}>
     <div className="chordFretColumns">{Array.from({length:maximum},(_,i)=>i+1).map(fret=><div key={fret} className={`chordFretColumn${fret===1?' is-nut':''}`}>
      <div className="chordFretCells">{Array.from({length:count},(_,i)=>i+1).map(string=><button key={string} type="button" aria-label={`${string}번줄 ${fret}프렛`} aria-pressed={frets[count-string]===fret} onPointerDown={e=>down(e,string,fret)} onPointerMove={move} onPointerUp={up} onPointerCancel={clearGesture} onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail===0)tap(string,fret);}}><span className="chordStringLine"/>{frets[count-string]===fret&&<span className="chordFingerDot"/>}</button>)}{displayBarre?.fret===fret&&<span className="chordBarreMark" style={{top:(displayBarre.to-1)*rowHeight+(rowHeight-16)/2,height:(displayBarre.from-displayBarre.to)*rowHeight+16}}/>}</div>
      <span className="chordFretNumber">{fret}</span>
     </div>)}</div>
    </div></div>
   </div>
   <label className="chordFretCount"><span>표시 프렛 <strong>{fretCount}칸</strong></span><input type="range" aria-label="표시 프렛 수" min="3" max="7" step="1" value={fretCount} onChange={e=>{const n=Number(e.target.value);viewStart.current=Math.min(visibleStart,maximum-n+1);setFretCount(n);setError('');}}/><output>{window.start}–{window.end}프렛 부착</output></label>

   {barreStart?<div className="chordBarreHint" role="status">{barreStart.fret}프렛 · 바레 끝 줄을 누르세요<button type="button" onClick={()=>setBarreStart(null)}>취소</button></div>:<p className="chordGestureHelp">탭하여 운지 · 다시 탭하여 해제 · 길게 눌러 바레</p>}
   <div className="chordGripSummary"><span>선택 운지 <strong>{appliedFrets.map(f=>f===undefined?'–':f===null?'X':f).join(' · ')}</strong><small>{count}→1번 줄{lastInput&&` · ${lastInput}`}</small></span><button type="button" aria-label="코드표 운지 초기화" onClick={reset}><RotateCcw size={16}/>초기화</button></div>
   <label className="chordAutoFill"><input type="checkbox" checked={autoFill} onChange={e=>setAutoFill(e.target.checked)}/><span>선택 운지 자동 기입<small>{autoFill?'1박에만 기입합니다. 반복은 악보의 박 복사를 사용하세요.':'코드표만 붙이고 음표는 유지합니다.'}</small></span></label>
   {barre&&<div className="chordBarreHint">바레 {barre.fret}프렛 · {barre.from}→{barre.to}번 줄<button type="button" onClick={()=>{setBarre(null);setBarreStart(null);}}>바레 해제</button></div>}
   {error&&<p className="chordDialogError" role="alert">{error}</p>}
  </div>
  <footer>{existing&&<button type="button" className="chordRemove" onClick={()=>onApply(null)}>코드표 삭제</button>}<button type="button" className="chordApply" onClick={submit}>{existing?'변경 적용':'악보에 붙이기'}</button></footer>
 </dialog>;
}
