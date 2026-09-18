import {lazy,Suspense,useEffect,useState} from 'react';
import {ChevronDown,ChevronLeft,Pencil,PanelsTopLeft,ScanLine,Timer} from 'lucide-react';
import {scoreInstrument} from './scoreInstruments.js';
import './etudes.css';
import './practiceLayout.css';
const Score=lazy(()=>import('./Score.jsx'));
export default function PracticeSheet({model,mobile,heading,lessonTips,footer}) {
 const [viewOpen,setViewOpen]=useState(false);
 const {tipsOpen:tips,setTipsOpen:setTips}=model;
 const {selected:etude,bpm,layout}=model;
 const focus=layout.focus,compact=model.scope==='etude';
 const followControl=<label className="etudeFollowControl"><ScanLine aria-hidden="true"/><select className="etudeFollowSelect" aria-label="자동 따라가기" value={model.followMode} onChange={e=>model.setFollowMode(e.target.value)}><option value="line">줄 따라가기</option><option value="page">페이지 전환</option><option value="off">따라가기 끔</option></select><ChevronDown aria-hidden="true"/></label>;
 useEffect(()=>{if(!focus)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[focus]);
 if(!etude)return null;
 const customTuning=etude.tuning?.some((pitch,i)=>pitch!==scoreInstrument(etude.instrument).tuning[i]);
 const tuningLabel=customTuning?[...etude.tuning].reverse().map(pitch=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1)).join(' '):'';
 return <div className={'etudePracticeLayout'+(compact?' etudeCompactTools':'')+(focus?' is-focus':'')} data-practice-layout={focus?'landscape':'normal'} style={focus?{left:layout.viewport.left,top:layout.viewport.top,width:layout.viewport.width,height:layout.viewport.height}:undefined}>
 <div className="etudePracticeToolbar" aria-label="악보 도구 모음">
 <div className="etudeViewTools" role="group" aria-label="악보 화면">
 {focus&&<button type="button" className="etudeFocusBack" aria-label="돌아가기" title="돌아가기" onClick={layout.exit}><ChevronLeft aria-hidden="true"/></button>}
 <div className="etudeViewMenu"><button type="button" aria-expanded={viewOpen} aria-label="악보 표시 방식 변경" aria-controls="etude-notation-options" onClick={()=>setViewOpen(v=>!v)}><PanelsTopLeft aria-hidden="true"/><span>{{both:"오선보 + TAB",staff:"오선보만",tab:"TAB만"}[model.notationView]}</span><ChevronDown aria-hidden="true"/></button>
 {viewOpen&&<div id="etude-notation-options" role="group" aria-label="악보 표시 방식" onKeyDown={e=>{if(e.key==='Escape'){setViewOpen(false);e.currentTarget.previousElementSibling.focus();}}}>
 {[['both','오선보+TAB'],['staff','오선보만'],['tab','TAB만']].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>model.setNotationView(v)}>{label}</button>)}
 {compact&&followControl}
 <label>연습 위치<select aria-label="악보 재생 마디" value={model.playPosition?.bar??0} onChange={e=>model.controller.current?.seek({bar:Number(e.target.value),event:0})}>{etude.measures.map((_,i)=><option key={i} value={i}>{i+1}마디</option>)}</select></label>
 <label>악보 확대<select aria-label="악보 확대" value={model.zoom} onChange={e=>model.setZoom(Number(e.target.value))}>{[.8,1,1.25,1.5].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>
 <button type="button" onClick={()=>setViewOpen(false)}>닫기</button></div>}</div>
 {!focus&&<><button type="button" aria-label="악보 편집" onClick={()=>model.editScore(etude)}><Pencil aria-hidden="true"/>{compact?"편집":"악보 편집"}</button><button type="button" aria-label="가로 전환" onClick={layout.enter}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="5" y="10" width="16" height="10" rx="2"/><path d="M3 12V7a4 4 0 0 1 4-4h6m-3-3 3 3-3 3"/></svg>{compact?"가로":"가로 전환"}</button></>}
 {!compact&&followControl}
 <button type="button" aria-label="메트로놈" title="메트로놈" aria-pressed={model.toolsVisible||model.metroMinimized} onClick={()=>{setTips(false);model.toggleMetro();}}><Timer aria-hidden="true"/>메트로놈{model.playPosition?.playing&&<span aria-label="연습 재생 중"> ·</span>}</button>
 <span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>
 {focus&&lessonTips&&<button type="button" aria-expanded={tips} onClick={()=>{setTips(v=>!v);}}>TIP</button>}
 </div></div>
 <div className="etudeScoreViewport" tabIndex={0} aria-label="연습 악보 스크롤 영역">
 <article className="etudeSheet" aria-label="연습 악보">
 {!focus&&(heading??<header className="etudeSheetHeader"><div className="etudeSheetBrand"><img src="/icons/fretiva-lab-icon-192.png" alt=""/><span>FRETIVA LAB</span></div><h2>{etude.english}</h2><div className="etudeSheetMeta"><span>{etude.instrument&&etude.instrument!=='guitar'&&scoreInstrument(etude.instrument).label+' · '}{customTuning&&'튜닝 ('+etude.tuning.length+'→1번줄) · '+tuningLabel+' · '}{etude.keySignature}</span><span>♩ = {bpm}</span></div></header>)}
 <Suspense fallback={<p className="etudeLoading">악보를 준비하고 있습니다…</p>}><Score etude={etude} mobile={mobile} bpm={bpm} view={model.notationView} playPosition={model.playPosition} followMode={model.followMode} responsive zoom={model.zoom} focusLayout={focus}/></Suspense>
 {footer}</article></div>
 {lessonTips&&(!focus||tips)&&<div className={focus?'etudeFocusTips':''}>{lessonTips}</div>}
 </div>;
}

