import {printEditorScore} from './printScore.js';
import {toScoreDocument} from './scoreDocument.js';
import useScorePinch from './useScorePinch.js';
import {lazy,Suspense,useEffect,useState,useRef} from 'react';
import {ChevronDown,ChevronLeft,Pencil,PanelsTopLeft,Timer,Settings2,Star,Printer} from 'lucide-react';
import {scoreInstrument} from './scoreInstruments.js';
import './etudes.css';
import './practiceLayout.css';
const Score=lazy(()=>import('./Score.jsx'));
export default function PracticeSheet({model,mobile,heading,title,lessonTips,footer}) {
 const [viewOpen,setViewOpen]=useState(false);
 const [followTarget,setFollowTarget]=useState(null);
 const [notationOpen,setNotationOpen]=useState(false);
 const [editOpen,setEditOpen]=useState(false);
 const [printError,setPrintError]=useState('');
 const {tipsOpen:tips,setTipsOpen:setTips}=model;
 const {selected:etude,bpm,layout}=model;
 const focus=layout.focus,compact=model.compactTools,quickViews=layout.focus&&layout.viewport.landscape;
 const scoreViewport=useRef(null);
 useScorePinch(scoreViewport,focus,model.zoom,model.setZoom);
 // Show feedback without triggering the expensive parent update first.
 const pendingLayout=useRef(null);
 useEffect(()=>()=>pendingLayout.current?.(),[]);
 const changeMeasuresPerRow=value=>{
  pendingLayout.current?.();
  if(value===(mobile?(model.measuresPerRow||1):model.measuresPerRow))return;
  const feedback=scoreViewport.current?.querySelector('.scoreRenderFeedback');
  const notation=scoreViewport.current?.querySelector('.etudeNotation');
  const wasHidden=feedback?.hidden,wasBusy=notation?.getAttribute('aria-busy');
  if(feedback)feedback.hidden=false;
  notation?.setAttribute('aria-busy','true');
  let second,timer;
  const first=requestAnimationFrame(()=>{
   second=requestAnimationFrame(()=>{timer=setTimeout(()=>{
    pendingLayout.current=null;
    model.setMeasuresPerRow(value);
   },0);});
  });
  pendingLayout.current=()=>{
   cancelAnimationFrame(first);cancelAnimationFrame(second);clearTimeout(timer);
   if(feedback)feedback.hidden=wasHidden;
   if(notation)notation.setAttribute('aria-busy',wasBusy??'false');
   pendingLayout.current=null;
  };
 };
 const measuresPerRow=mobile?(model.measuresPerRow||1):model.measuresPerRow;
 const notationButtons=[['tab','TAB'],['both','오선보+TAB'],['staff','오선보']].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>{model.setNotationView(v);setNotationOpen(false);}}>{label}</button>);
 useEffect(()=>{if(!focus)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[focus]);
 if(!etude)return null;
 const compactTitle=title??etude.english??etude.document?.title??etude.title;
 const printScore=()=>{try{const document=toScoreDocument(etude);printEditorScore(scoreViewport.current,compactTitle,model.notationView,{...document,bpm,viewSettings:{...document.viewSettings,measuresPerRow:measuresPerRow||4}});setPrintError('');}catch(error){setPrintError(error.message);}};
 const customTuning=etude.tuning?.some((pitch,i)=>pitch!==scoreInstrument(etude.instrument).tuning[i]);
 const tuningLabel=customTuning?[...etude.tuning].reverse().map(pitch=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1)).join(' '):'';
 return <div className={'etudePracticeLayout'+(compact?' etudeCompactTools':'')+(focus?' is-focus':'')+(!mobile?' etudePracticeLayout--desktop':'')} data-practice-layout={focus?'landscape':'normal'} style={focus?{left:layout.viewport.left,top:layout.viewport.top,width:layout.viewport.width,height:layout.viewport.height}:undefined}>
 <div className="etudePracticeToolbar" aria-label="악보 도구 모음">
 <div className="etudeViewTools" role="group" aria-label="악보 화면">
 {focus&&<button type="button" className="etudeFocusBack" aria-label="돌아가기" title="돌아가기" onClick={layout.exit}><ChevronLeft aria-hidden="true"/></button>}
 {quickViews&&<div className="etudeViewMenu" onKeyDown={e=>{if(e.key==='Escape')setNotationOpen(false);}}><button type="button" aria-label="악보 표시 방식 변경" aria-expanded={notationOpen} onClick={()=>{setNotationOpen(v=>!v);setViewOpen(false);}}><span>{{tab:'TAB',both:'오선보+TAB',staff:'오선보'}[model.notationView]}</span><ChevronDown aria-hidden="true"/></button>{notationOpen&&<div className="etudeNotationChoices" role="group" aria-label="악보 표시 방식">{notationButtons}</div>}</div>}
 <>{quickViews?<select className="etudeFocusBarCount" aria-label="한 줄 마디 수" value={measuresPerRow||1} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}마디</option>)}</select>:<div className="etudeViewMenu"><button type="button" aria-expanded={viewOpen} aria-label={quickViews?"악보 보기 설정":"악보 표시 방식 변경"} aria-controls="etude-notation-options" onClick={()=>{setViewOpen(v=>!v);setNotationOpen(false);}}>{quickViews?<Settings2 aria-hidden="true"/>:<><PanelsTopLeft aria-hidden="true"/><span>{{both:"오선보 + TAB",staff:"오선보만",tab:"TAB만"}[model.notationView]}</span><ChevronDown aria-hidden="true"/></>}</button>
 {viewOpen&&<div id="etude-notation-options" className={"etudeViewOptions"+(mobile?" is-mobile":"")} role="group" aria-label="악보 표시 방식" onKeyDown={e=>{if(e.key==='Escape'){setViewOpen(false);e.currentTarget.previousElementSibling.focus();}}}>
 <div className="etudeViewChoices">{!quickViews&&[['tab','TAB만'],['both','오선보+TAB'],['staff','오선보만']].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>model.setNotationView(v)}>{label}</button>)}</div>
 <div className="etudeViewFields etudeViewFieldsPrimary" role="group" aria-label="악보 배치 설정">
 {mobile&&focus&&<label>한 줄 마디 수<select aria-label="한 줄 마디 수" value={measuresPerRow} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}>{!mobile&&<option value={0}>자동</option>}{[1,2,3,4].map(n=><option key={n} value={n}>{n}마디</option>)}</select></label>}
 </div><div className="etudeViewFields etudeViewFieldsSecondary" role="group" aria-label="연습 위치와 확대">
 <label>연습 위치<select aria-label="악보 재생 마디" value={model.playPosition?.bar??0} onChange={e=>model.controller.current?.seek({bar:Number(e.target.value),event:0})}>{etude.measures.map((_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select></label>
 {!focus&&<label>악보 확대<select aria-label="악보 확대" value={model.zoom} onChange={e=>model.setZoom(Number(e.target.value))}>{[.8,1,1.25,1.5].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>}
 </div><button type="button" className="etudeViewOptionsClose" onClick={()=>setViewOpen(false)}>닫기</button></div>}</div>}</>
 {!focus&&<><div className="scoreEditMenu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setEditOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setEditOpen(false);}}><button type="button" aria-label="악보 생성·편집 선택" aria-expanded={editOpen} onClick={()=>setEditOpen(v=>!v)}><Pencil aria-hidden="true"/>생성·편집</button>{editOpen&&<div className="scoreEditOptions"><button type="button" onClick={()=>{setEditOpen(false);model.createScore();}}>새 악보 생성</button><button type="button" disabled={model.canEdit===false} onClick={()=>{setEditOpen(false);model.editScore(etude);}}>현재 악보 편집</button></div>}</div>{!mobile&&<button type="button" aria-label="가로 전환" onClick={layout.enter}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="5" y="10" width="16" height="10" rx="2"/><path d="M3 12V7a4 4 0 0 1 4-4h6m-3-3 3 3-3 3"/></svg>{compact?"가로":"가로 전환"}</button>}</>}
 {!mobile&&!focus&&<div className="etudeInlineBarCount etudeDesktopBarCount" role="group" aria-label="한 줄 마디 수"><span>보기</span>{[0,1,2,3,4].map(n=><button key={n} type="button" aria-label={n?`한 줄 ${n}마디`:'한 줄 마디 수 자동'} aria-pressed={measuresPerRow===n} onClick={()=>changeMeasuresPerRow(n)}>{n||'자동'}</button>)}</div>}
 <button type="button" aria-label="메트로놈" title="메트로놈" aria-pressed={model.toolsVisible||model.metroMinimized} onClick={()=>{setTips(false);model.toggleMetro();}}><Timer aria-hidden="true"/>{mobile?"메트로놈":"BPM"}{model.playPosition?.playing&&<span aria-label="연습 재생 중"> ·</span>}</button>
 <span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>
 {mobile&&<button type="button" className="etudePrintScore" aria-label="악보 PDF 저장 · 인쇄" title="악보 PDF 저장 · 인쇄" onClick={printScore}><Printer size={18} aria-hidden="true"/></button>}
 {model.toggleFavorite&&<button type="button" className="etudeFavoriteToggle" aria-label={model.isFavorite?'즐겨찾기 해제':'즐겨찾기 추가'} title={model.isFavorite?'즐겨찾기 해제':'즐겨찾기 추가'} aria-pressed={model.isFavorite} onClick={model.toggleFavorite}><Star size={19} fill={model.isFavorite?'currentColor':'none'}/>{!mobile&&<span>즐겨찾기</span>}</button>}
 {!mobile&&<button type="button" className="etudePrintScore" aria-label="악보 PDF 저장 · 인쇄" title="악보 PDF 저장 · 인쇄" onClick={printScore}><Printer aria-hidden="true"/><span>PDF 저장</span></button>}
 {focus&&lessonTips&&<button type="button" aria-expanded={tips} onClick={()=>{setTips(v=>!v);}}>TIP</button>}
 </div>{mobile&&!focus&&<div className="etudeMobileTitleRow"><div className="etudeMobileScoreTitle" title={compactTitle}>제목: {compactTitle}</div><div className="etudeInlineBarCount" role="group" aria-label="한 줄 마디 수"><span>보기</span>{[1,2,3,4].map(n=><button key={n} type="button" aria-label={`한 줄 ${n}마디`} aria-pressed={measuresPerRow===n} onClick={()=>changeMeasuresPerRow(n)}>{n}</button>)}</div></div>}<div className="etudeHudMetroMount etudeFloatingTheme" ref={model.setHudTarget}/></div>
 {printError&&<p role="alert">{printError}</p>}
 <div ref={scoreViewport} className="etudeScoreViewport" tabIndex={0} aria-label="연습 악보 스크롤 영역">
 <article className="etudeSheet" aria-label="연습 악보">
 {!mobile&&!focus&&(heading??<header className="etudeSheetHeader"><h2>{etude.english}</h2><div className="etudeSheetMeta"><span>{etude.instrument&&etude.instrument!=='guitar'&&scoreInstrument(etude.instrument).label+' · '}{customTuning&&'튜닝 ('+etude.tuning.length+'→1번줄) · '+tuningLabel+' · '}{etude.keySignature}</span><span>♩ = {bpm}</span></div></header>)}
 <Suspense fallback={<p className="etudeLoading">악보를 준비하고 있습니다…</p>}><Score practiceRange={model.loopRange} onSelectBar={model.selectBar} selectedBar={model.followMode==='off'?null:model.startBar} etude={etude} mobile={mobile} bpm={bpm} view={model.notationView} playPosition={model.followMode==='off'?null:model.playPosition} followMode={model.followMode} responsive measuresPerRow={measuresPerRow} zoom={model.zoom} focusLayout={focus}/></Suspense>
 {footer}</article></div>
 {lessonTips&&(!focus||tips)&&<div className={focus?'etudeFocusTips':''}>{lessonTips}</div>}
 </div>;
}




