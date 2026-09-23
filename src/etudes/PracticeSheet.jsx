import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
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
  useLanguage();
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
 const notationButtons=[['tab','TAB'],['both',ko["etudes.staffTab"]],['staff',ko["etudes.staff"]]].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>{model.setNotationView(v);setNotationOpen(false);}}>{localizeUi(label)}</button>);
 useEffect(()=>{if(!focus)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[focus]);
 if(!etude)return null;
 const compactTitle=title??etude.english??etude.document?.title??etude.title;
 const printScore=()=>{try{const document=toScoreDocument(etude);printEditorScore(scoreViewport.current,compactTitle,model.notationView,{...document,bpm,viewSettings:{...document.viewSettings,measuresPerRow:measuresPerRow||4}});setPrintError('');}catch(error){setPrintError(error.message);}};
 const customTuning=etude.tuning?.some((pitch,i)=>pitch!==scoreInstrument(etude.instrument).tuning[i]);
 const tuningLabel=customTuning?[...etude.tuning].reverse().map(pitch=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1)).join(' '):'';
 return <div className={'etudePracticeLayout'+(compact?' etudeCompactTools':'')+(focus?' is-focus':'')+(!mobile?' etudePracticeLayout--desktop':'')} data-practice-layout={focus?'landscape':'normal'} style={focus?{left:layout.viewport.left,top:layout.viewport.top,width:layout.viewport.width,height:layout.viewport.height}:undefined}>
 <div className="etudePracticeToolbar" aria-label={translateUi("etudes.scoreToolbar")}>
 <div className="etudeViewTools" role="group" aria-label={translateUi("etudes.scoreView")}>
 {focus&&<button type="button" className="etudeFocusBack" aria-label={translateUi("app.back")} title={translateUi("app.back")} onClick={layout.exit}><ChevronLeft aria-hidden="true"/></button>}
 {quickViews&&<div className="etudeViewMenu" onKeyDown={e=>{if(e.key==='Escape')setNotationOpen(false);}}><button type="button" aria-label={translateUi("etudes.changeScoreDisplay")} aria-expanded={notationOpen} onClick={()=>{setNotationOpen(v=>!v);setViewOpen(false);}}><span>{localizeUi({tab:'TAB',both:ko["etudes.staffTab"],staff:ko["etudes.staff"]}[model.notationView])}</span><ChevronDown aria-hidden="true"/></button>{notationOpen&&<div className="etudeNotationChoices" role="group" aria-label={translateUi("etudes.scoreDisplay")}>{notationButtons}</div>}</div>}
 <>{quickViews?<select className="etudeFocusBarCount" aria-label={translateUi("etudes.barsPerLine")} value={measuresPerRow||1} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}<Translation id="app.bar" /></option>)}</select>:<div className="etudeViewMenu"><button type="button" aria-expanded={viewOpen} aria-label={quickViews?translateUi("etudes.scoreViewSettings"):translateUi("etudes.changeScoreDisplay")} aria-controls="etude-notation-options" onClick={()=>{setViewOpen(v=>!v);setNotationOpen(false);}}>{quickViews?<Settings2 aria-hidden="true"/>:<><PanelsTopLeft aria-hidden="true"/><span>{localizeUi({both:ko["etudes.staffTabPracticeSheet"],staff:ko["etudes.staffOnly"],tab:ko["etudes.tabOnly"]}[model.notationView])}</span><ChevronDown aria-hidden="true"/></>}</button>
 {viewOpen&&<div id="etude-notation-options" className={"etudeViewOptions"+(mobile?" is-mobile":"")} role="group" aria-label={translateUi("etudes.scoreDisplay")} onKeyDown={e=>{if(e.key==='Escape'){setViewOpen(false);e.currentTarget.previousElementSibling.focus();}}}>
 <div className="etudeViewChoices">{!quickViews&&[['tab',ko["etudes.tabOnly"]],['both',ko["etudes.staffTab"]],['staff',ko["etudes.staffOnly"]]].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>model.setNotationView(v)}>{localizeUi(label)}</button>)}</div>
 <div className="etudeViewFields etudeViewFieldsPrimary" role="group" aria-label={translateUi("etudes.scoreLayoutSettings")}>
 {mobile&&focus&&<label><Translation id="etudes.barsPerLine" /><select aria-label={translateUi("etudes.barsPerLine")} value={measuresPerRow} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}>{!mobile&&<option value={0}><Translation id="etudes.auto" /></option>}{[1,2,3,4].map(n=><option key={n} value={n}>{n}<Translation id="app.bar" /></option>)}</select></label>}
 </div><div className="etudeViewFields etudeViewFieldsSecondary" role="group" aria-label={translateUi("etudes.practicePositionAndZoom")}>
 <label><Translation id="etudes.practicePosition" /><select aria-label={translateUi("etudes.scorePlaybackBar")} value={model.playPosition?.bar??0} onChange={e=>model.controller.current?.seek({bar:Number(e.target.value),event:0})}>{etude.measures.map((_,i)=><option key={i} value={i}>{i+1}<Translation id="app.bar" /></option>)}</select></label>
 {!focus&&<label><Translation id="etudes.scoreZoom" /><select aria-label={translateUi("etudes.scoreZoom")} value={model.zoom} onChange={e=>model.setZoom(Number(e.target.value))}>{[.8,1,1.25,1.5].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>}
 </div><button type="button" className="etudeViewOptionsClose" onClick={()=>setViewOpen(false)}><Translation id="common.close" /></button></div>}</div>}</>
 {!focus&&<><div className="scoreEditMenu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setEditOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setEditOpen(false);}}><button type="button" aria-label={translateUi("etudes.createOrEditScore")} aria-expanded={editOpen} onClick={()=>setEditOpen(v=>!v)}><Pencil aria-hidden="true"/><Translation id="etudes.createEdit" /></button>{editOpen&&<div className="scoreEditOptions"><button type="button" onClick={()=>{setEditOpen(false);model.createScore();}}><Translation id="etudes.createNewScore" /></button><button type="button" disabled={model.canEdit===false} onClick={()=>{setEditOpen(false);model.editScore(etude);}}><Translation id="etudes.editCurrentScore" /></button></div>}</div>{!mobile&&<button type="button" data-ui="landscape" aria-label={translateUi("etudes.switchToLandscape")} onClick={layout.enter}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="5" y="10" width="16" height="10" rx="2"/><path d="M3 12V7a4 4 0 0 1 4-4h6m-3-3 3 3-3 3"/></svg>{compact?translateUi("app.landscape"):translateUi("etudes.switchToLandscape")}</button>}</>}
 {!mobile&&!focus&&<div className="etudeInlineBarCount etudeDesktopBarCount" role="group" aria-label={translateUi("etudes.barsPerLine")}><span><Translation id="etudes.view" /></span>{[0,1,2,3,4].map(n=><button key={n} type="button" aria-label={n?translateUi("etudes.value1BarsPerLine", { value1: n }):translateUi("etudes.autoBarsPerLine")} aria-pressed={measuresPerRow===n} onClick={()=>changeMeasuresPerRow(n)}>{n||translateUi("etudes.auto")}</button>)}</div>}
 <button type="button" data-ui="metronome" aria-label={translateUi("menu.metronome")} title={translateUi("menu.metronome")} aria-pressed={model.toolsVisible||model.metroMinimized} onClick={()=>{setTips(false);model.toggleMetro();}}><Timer aria-hidden="true"/>{mobile?translateUi("menu.metronome"):"BPM"}{model.playPosition?.playing&&<span aria-label={translateUi("etudes.practicePlaying")}> ·</span>}</button>
 <span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>
 {mobile&&<button type="button" className="etudePrintScore" aria-label={translateUi("etudes.saveScorePdfPrint")} title={translateUi("etudes.saveScorePdfPrint")} onClick={printScore}><Printer size={18} aria-hidden="true"/></button>}
 {model.toggleFavorite&&<button type="button" className="etudeFavoriteToggle" aria-label={model.isFavorite?translateUi("etudes.removeFromFavorites"):translateUi("etudes.addToFavorites")} title={model.isFavorite?translateUi("etudes.removeFromFavorites"):translateUi("etudes.addToFavorites")} aria-pressed={model.isFavorite} onClick={model.toggleFavorite}><Star size={19} fill={model.isFavorite?'currentColor':'none'}/>{!mobile&&<span><Translation id="etudes.favorites" /></span>}</button>}
 {!mobile&&<button type="button" className="etudePrintScore" aria-label={translateUi("etudes.saveScorePdfPrint")} title={translateUi("etudes.saveScorePdfPrint")} onClick={printScore}><Printer aria-hidden="true"/><span><Translation id="etudes.savePdf" /></span></button>}
 {focus&&lessonTips&&<button type="button" aria-expanded={tips} onClick={()=>{setTips(v=>!v);}}><Translation id="originalUi.tip" /></button>}
 </div>{mobile&&!focus&&<div className="etudeMobileTitleRow"><div className="etudeMobileScoreTitle" title={compactTitle}><Translation id="etudes.title" />{compactTitle}</div><div className="etudeInlineBarCount" role="group" aria-label={translateUi("etudes.barsPerLine")}><span><Translation id="etudes.view" /></span>{[1,2,3,4].map(n=><button key={n} type="button" aria-label={translateUi("etudes.value1BarsPerLine", { value1: n })} aria-pressed={measuresPerRow===n} onClick={()=>changeMeasuresPerRow(n)}>{n}</button>)}</div></div>}<div className="etudeHudMetroMount etudeFloatingTheme" ref={model.setHudTarget}/></div>
 {printError&&<p role="alert">{printError}</p>}
 <div ref={scoreViewport} className="etudeScoreViewport" tabIndex={0} aria-label={translateUi("etudes.practiceScoreScrollArea")}>
 <article className="etudeSheet" aria-label={translateUi("etudes.practiceScore")}>
 {!mobile&&!focus&&(heading??<header className="etudeSheetHeader"><h2>{etude.english}</h2><div className="etudeSheetMeta"><span>{localizeUi(etude.instrument&&etude.instrument!=='guitar'&&scoreInstrument(etude.instrument).label+' · ')}{customTuning&&translateUi("etudes.tuningPracticeSheet")+etude.tuning.length+translateUi("etudes.1stStringPracticeSheet")+tuningLabel+' · '}{etude.keySignature}</span><span>♩ = {bpm}</span></div></header>)}
 <Suspense fallback={<p className="etudeLoading"><Translation id="etudes.preparingTheScore" /></p>}><Score practiceRange={model.loopRange} onSelectBar={model.selectBar} selectedBar={model.followMode==='off'?null:model.startBar} etude={etude} mobile={mobile} bpm={bpm} view={model.notationView} playPosition={model.followMode==='off'?null:model.playPosition} followMode={model.followMode} responsive measuresPerRow={measuresPerRow} zoom={model.zoom} focusLayout={focus}/></Suspense>
 {footer}</article></div>
 {lessonTips&&(!focus||tips)&&<div className={focus?'etudeFocusTips':''}>{lessonTips}</div>}
 </div>;
}




