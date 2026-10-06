import {MEASURE_ROW_OPTIONS,scoreLineSettings} from './measureLayout.js';
import ImportPlaybackNotice from './ImportPlaybackNotice.jsx';
import DesktopPracticeLayout from './DesktopPracticeLayout.jsx';
import PlaybackBarSelect from './PlaybackBarSelect.jsx';
import {useTabletLayout} from '../layouts/TabletLayout.jsx';
import ScoreWorkspaceActions from './ScoreWorkspaceActions.jsx';
import DifficultyStars from './DifficultyStars.jsx';
import { etudeDifficulty } from './difficultyRatings.js';
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {printEditorScore} from './printScore.js';
import {toScoreDocument} from './scoreDocument.js';
import useScorePinch from './useScorePinch.js';
import usePracticePageScroll from './usePracticePageScroll.js';
import useDesktopScoreSizing from './useDesktopScoreSizing.js';
import {lazy,Suspense,useEffect,useState,useRef} from 'react';
import {ChevronDown,ChevronLeft,PanelsTopLeft,Timer,Settings2,Star,Printer,FileText} from 'lucide-react';
import {scoreInstrument} from './scoreInstruments.js';
import './etudes.css';
import './practiceLayout.css';
const Score=lazy(()=>import('./Score.jsx'));
export default function PracticeSheet({model,mobile,heading,title,lessonTips,footer,desktopPicker,desktopStorage,externalContent,externalTools}) {
 const tablet=useTabletLayout();
  const language=useLanguage();
 const printLabel=mobile?(language==='ko'?'악보 PDF 미리보기':'Score PDF preview'):translateUi('etudes.saveScorePdfPrint');
 const [viewOpen,setViewOpen]=useState(false);
 const [followTarget,setFollowTarget]=useState(null);
 const [notationOpen,setNotationOpen]=useState(false);
 const [printError,setPrintError]=useState('');
 const {tipsOpen:tips,setTipsOpen:setTips}=model;
 const {selected:etude,bpm,layout}=model;
 const difficulty=etudeDifficulty(etude);
 const focus=layout.focus,compact=model.compactTools,quickViews=tablet||(layout.focus&&layout.viewport.landscape);
 const fixedMetro=mobile&&focus&&layout.viewport.landscape;
 const scoreViewport=useRef(null);
 const practiceLayout=useRef(null);
 usePracticePageScroll(practiceLayout,mobile&&!focus,Boolean(externalContent));
 const [desktopZoom,setDesktopZoom]=useState('auto');
 const desktopSizing=useDesktopScoreSizing(scoreViewport,!mobile&&!focus,desktopZoom,etude?.id);
 useScorePinch(scoreViewport,focus,model.zoom,model.setZoom);
 const measuresPerRow=mobile?model.mobileMeasuresPerRow:model.measuresPerRow;
 const setMeasuresPerRow=mobile?model.setMobileMeasuresPerRow:model.setMeasuresPerRow;
 // The renderer owns its loading state on both platforms. A cached layout
 // should not flash a badge or leave an imperative aria-busy flag behind.
 const changeMeasuresPerRow=value=>{
  if(value!==measuresPerRow)setMeasuresPerRow(value);
 };
 const notationButtons=[['tab','TAB'],['both',ko["etudes.staffTab"]],['staff',ko["etudes.staff"]]].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>{model.setNotationView(v);setNotationOpen(false);}}>{localizeUi(label)}</button>);
 useEffect(()=>{if(!focus)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[focus]);
 if(!etude)return null;
 const compactTitle=title??etude.english??etude.document?.title??etude.title;
 const printScore=()=>{try{const document=toScoreDocument(etude);printEditorScore(scoreViewport.current,compactTitle,model.notationView,{...document,bpm,viewSettings:{...document.viewSettings,...(measuresPerRow?{sourceLayout:false}:{}),measuresPerRow:scoreLineSettings(document,measuresPerRow,mobile?1:4).perRow,systemBreaks:scoreLineSettings(document,measuresPerRow).breaks}});setPrintError('');}catch(error){setPrintError(error.message);}};
 const customTuning=etude.tuning?.some((pitch,i)=>pitch!==scoreInstrument(etude.instrument).tuning[i]);
 const tuningLabel=customTuning?[...etude.tuning].reverse().map(pitch=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1)).join(' '):'';
 const paginatedDesktop=!mobile&&!focus;
 const pageHeader=heading??<header className="etudeSheetHeader"><h2>{etude.english}</h2><DifficultyStars score={etude}/><div className="etudeSheetMeta"><span>{localizeUi(etude.instrument&&etude.instrument!=='guitar'&&scoreInstrument(etude.instrument).label+' · ')}{customTuning&&translateUi("etudes.tuningPracticeSheet")+etude.tuning.length+translateUi("etudes.1stStringPracticeSheet")+tuningLabel+' · '}{etude.keySignature}</span><span>♩ = {bpm}</span></div></header>;
 const notation=<Suspense fallback={<p className="etudeLoading"><Translation id="etudes.preparingTheScore" /></p>}><Score practiceRange={model.loopRange} onSelectBar={model.selectBar} selectedBar={model.followMode==='off'?null:model.startBar} etude={etude} mobile={mobile} bpm={bpm} view={model.notationView} playPosition={model.followMode==='off'?null:model.playPosition} followMode={model.followMode} responsive measuresPerRow={measuresPerRow} zoom={mobile||focus?model.zoom:1} focusLayout={focus} paginatedDesktop={paginatedDesktop} paginatedMobile={mobile&&!focus} pageHeader={pageHeader} pageFooter={footer}/></Suspense>;
 const paper=externalContent??<div ref={scoreViewport} className="etudeScoreViewport" tabIndex={0} aria-label={translateUi("etudes.practiceScoreScrollArea")}>
 {paginatedDesktop?<div ref={desktopSizing.sheetRef} style={desktopSizing.sheetStyle} className="desktopScorePages">{notation}</div>:<article className={'etudeSheet'+(mobile&&!focus?' mobileScorePages':'')} aria-label={translateUi("etudes.practiceScore")}>{notation}{footer}</article>}
 </div>;
 if(!mobile&&!focus&&desktopPicker)return <div className="etudePracticeLayout etudePracticeLayout--desktop etudePracticeLayout--rail" data-practice-layout="desktop-rail">
  <DesktopPracticeLayout model={model} picker={desktopPicker} storage={desktopStorage} zoom={desktopZoom} onZoom={setDesktopZoom} onRowCount={changeMeasuresPerRow} onPrint={printScore} printLabel={printLabel} tips={Boolean(lessonTips)}>
   {lessonTips&&tips&&<div className="etudeTopTips">{lessonTips}</div>}
   {printError&&<p role="alert">{printError}</p>}
   <ImportPlaybackNotice playback={model.importPlayback} mobile={false}/>
   {paper}
  </DesktopPracticeLayout>
 </div>;
 return <div ref={practiceLayout} className={'etudePracticeLayout'+(externalContent?' etudePracticeLayout--pdf':'')+(compact?' etudeCompactTools':'')+(focus?' is-focus':'')+(!mobile?' etudePracticeLayout--desktop':'')} data-practice-layout={focus?'landscape':'normal'} style={focus?{left:layout.viewport.left,top:layout.viewport.top,width:layout.viewport.width,height:layout.viewport.height}:undefined}>
 {!externalContent&&<ImportPlaybackNotice playback={model.importPlayback} mobile={mobile}/>}
 <div className="etudePracticeToolbar" aria-label={translateUi("etudes.scoreToolbar")}>
 <div className="etudeViewTools" role="group" aria-label={translateUi("etudes.scoreView")}>
 {externalContent?<>{focus&&<button type="button" className="etudeFocusBack" aria-label={translateUi("app.back")} onClick={layout.exit}><ChevronLeft/></button>}{mobile&&!fixedMetro&&<button type="button" data-ui="metronome" aria-label={translateUi("menu.metronome")} aria-pressed={model.toolsVisible||model.metroMinimized} onClick={model.toggleMetro}><Timer/></button>}{mobile&&<span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>}{externalTools}</>:<>
 {focus&&<button type="button" className="etudeFocusBack" aria-label={translateUi("app.back")} title={translateUi("app.back")} onClick={layout.exit}><ChevronLeft aria-hidden="true"/></button>}
 {quickViews&&<div className="etudeViewMenu" onKeyDown={e=>{if(e.key==='Escape')setNotationOpen(false);}}><button type="button" aria-label={translateUi("etudes.changeScoreDisplay")} aria-expanded={notationOpen} onClick={()=>{setNotationOpen(v=>!v);setViewOpen(false);}}><span>{localizeUi({tab:'TAB',both:ko["etudes.staffTab"],staff:ko["etudes.staff"]}[model.notationView])}</span><ChevronDown aria-hidden="true"/></button>{notationOpen&&<div className="etudeNotationChoices" role="group" aria-label={translateUi("etudes.scoreDisplay")}>{notationButtons}</div>}</div>}
 <>{quickViews?<select className="etudeFocusBarCount" aria-label={translateUi("etudes.barsPerLine")} value={measuresPerRow} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}>{[0,...MEASURE_ROW_OPTIONS].map(n=><option key={n} value={n}>{n?<>{n}<Translation id="app.bar" /></>:translateUi("etudes.auto")}</option>)}</select>:<div className="etudeViewMenu"><button type="button" aria-expanded={viewOpen} aria-label={quickViews?translateUi("etudes.scoreViewSettings"):translateUi("etudes.changeScoreDisplay")} aria-controls="etude-notation-options" onClick={()=>{setViewOpen(v=>!v);setNotationOpen(false);}}>{quickViews?<Settings2 aria-hidden="true"/>:<><PanelsTopLeft aria-hidden="true"/><span>{localizeUi({both:ko["etudes.staffTabPracticeSheet"],staff:ko["etudes.staffOnly"],tab:ko["etudes.tabOnly"]}[model.notationView])}</span><ChevronDown aria-hidden="true"/></>}</button>
 {viewOpen&&<div id="etude-notation-options" className={"etudeViewOptions"+(mobile?" is-mobile":"")} role="group" aria-label={translateUi("etudes.scoreDisplay")} onKeyDown={e=>{if(e.key==='Escape'){setViewOpen(false);e.currentTarget.previousElementSibling.focus();}}}>
 <div className="etudeViewChoices">{!quickViews&&[['tab',ko["etudes.tabOnly"]],['both',ko["etudes.staffTab"]],['staff',ko["etudes.staffOnly"]]].map(([v,label])=><button key={v} type="button" aria-pressed={model.notationView===v} onClick={()=>model.setNotationView(v)}>{localizeUi(label)}</button>)}</div>
 <div className="etudeViewFields etudeViewFieldsPrimary" role="group" aria-label={translateUi("etudes.scoreLayoutSettings")}>
 {mobile&&focus&&<label><Translation id="etudes.barsPerLine" /><select aria-label={translateUi("etudes.barsPerLine")} value={measuresPerRow} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}><option value={0}><Translation id="etudes.auto" /></option>{MEASURE_ROW_OPTIONS.map(n=><option key={n} value={n}>{n}<Translation id="app.bar" /></option>)}</select></label>}
 </div><div className="etudeViewFields etudeViewFieldsSecondary" role="group" aria-label={translateUi("etudes.practicePositionAndZoom")}>
 <label><Translation id="etudes.practicePosition" /><PlaybackBarSelect aria-label={translateUi("etudes.scorePlaybackBar")} bar={model.playPosition?.bar??0} count={etude.measures.length} barLabel={translateUi('app.bar')} onChange={bar=>model.controller.current?.seek({bar,event:0})}/></label>
 {mobile&&!focus&&<label><Translation id="etudes.scoreZoom" /><select aria-label={translateUi("etudes.scoreZoom")} value={model.zoom} onChange={e=>model.setZoom(Number(e.target.value))}>{[.8,1,1.25,1.5].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>}
 </div><button type="button" className="etudeViewOptionsClose" onClick={()=>setViewOpen(false)}><Translation id="common.close" /></button></div>}</div>}</>

 {!mobile&&!focus&&<>
 <label className="etudeDesktopSizeControl"><span><Translation id="etudes.scoreZoom"/></span><select aria-label={translateUi('etudes.scoreZoom')} value={desktopZoom} onChange={e=>setDesktopZoom(e.target.value)}><option value="auto"><Translation id="etudes.autoFit"/></option><option value="width"><Translation id="components.fitWidth"/></option>{[.5,.75,1,1.25,1.5,2].map(value=><option key={value} value={value}>{value*100}%</option>)}</select></label>
 <label className="etudeDesktopRowControl"><span><Translation id="etudes.barsPerLine"/></span><select aria-label={translateUi('etudes.barsPerLine')} value={measuresPerRow} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}><option value={0}><Translation id="etudes.auto"/></option>{MEASURE_ROW_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
 </>}
 {mobile&&!fixedMetro&&<button type="button" data-ui="metronome" aria-label={translateUi("menu.metronome")} title={translateUi("menu.metronome")} aria-pressed={model.toolsVisible||model.metroMinimized} onClick={()=>{setTips(false);model.toggleMetro();}}><Timer aria-hidden="true"/>{model.playPosition?.playing&&<span aria-label={translateUi("etudes.practicePlaying")}> ·</span>}</button>}
 {mobile&&<span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>}
 {mobile&&<button type="button" className="etudePrintScore" aria-label={printLabel} title={printLabel} onClick={printScore}><FileText size={18} aria-hidden="true"/></button>}
 {model.toggleFavorite&&<button type="button" className="etudeFavoriteToggle" aria-label={model.isFavorite?translateUi("etudes.removeFromFavorites"):translateUi("etudes.addToFavorites")} title={model.isFavorite?translateUi("etudes.removeFromFavorites"):translateUi("etudes.addToFavorites")} aria-pressed={model.isFavorite} onClick={model.toggleFavorite}><Star size={19} fill={model.isFavorite?'currentColor':'none'}/>{!mobile&&<span><Translation id="etudes.favorites" /></span>}</button>}
 {!mobile&&<button type="button" className="etudePrintScore" aria-label={printLabel} title={printLabel} onClick={printScore}><Printer aria-hidden="true"/><span><Translation id="etudes.savePdf" /></span></button>}
 {lessonTips&&<button type="button" className="etudeTipToggle" aria-expanded={tips} onClick={()=>{setTips(v=>!v);}}><Translation id="originalUi.tip" /></button>}
 {!focus&&<ScoreWorkspaceActions mobile={mobile} onCreate={model.createScore} onEdit={()=>model.editScore(etude)} onImport={model.importPdf} canEdit={model.canEdit!==false} importBusy={model.importBusy}/>} </>}</div>{mobile&&!focus&&!externalContent&&<div className="etudeMobileTitleRow"><div className="etudeMobileScoreTitle" title={compactTitle}><Translation id="etudes.title" />{compactTitle}</div><div className="etudeInlineBarCount" role="group" aria-label={translateUi("etudes.barsPerLine")}><span><Translation id="etudes.view" /></span>{[0,1,2,3,4].map(n=><button key={n} type="button" aria-label={n?translateUi("etudes.value1BarsPerLine", { value1: n }):translateUi("etudes.autoBarsPerLine")} aria-pressed={measuresPerRow===n} onClick={()=>changeMeasuresPerRow(n)}>{n||translateUi("etudes.auto")}</button>)}<select aria-label={translateUi("etudes.barsPerLine")} value={measuresPerRow>4?measuresPerRow:""} onChange={e=>changeMeasuresPerRow(Number(e.target.value))}><option value="" disabled>…</option>{MEASURE_ROW_OPTIONS.filter(n=>n>4).map(n=><option key={n} value={n}>{n}</option>)}</select></div></div>}{mobile&&!focus&&!externalContent&&difficulty!==null&&<div className="etudeCurrentDifficulty"><Translation id="etudes.difficulty"/><DifficultyStars score={etude}/></div>}<div className="etudeHudMetroMount etudeFloatingTheme" ref={model.setHudTarget}/></div>
 {lessonTips&&tips&&<div className={focus?'etudeFocusTips':'etudeTopTips'}>{lessonTips}</div>}
 {printError&&<p role="alert">{printError}</p>}
 {paper}
 {!mobile&&<div className="desktopPracticeDockMount etudeFloatingTheme" ref={model.setDesktopDockTarget}/>}

 </div>;
}


