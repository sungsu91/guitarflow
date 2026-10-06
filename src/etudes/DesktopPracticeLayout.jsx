import {MEASURE_ROW_OPTIONS} from './measureLayout.js';
import {Star,Printer,BookOpen,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {useState} from 'react';
import './desktopPracticeDock.css';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import ScoreWorkspaceActions from './ScoreWorkspaceActions.jsx';
import PlaybackBarSelect from './PlaybackBarSelect.jsx';

// Desktop owns its arrangement; the session and score renderer remain shared.
export default function DesktopPracticeLayout({model,picker,storage,zoom,onZoom,onRowCount,onPrint,printLabel,tips,children}) {
 const language=useLanguage();
 const [railOpen,setRailOpen]=useState(true);
 const railLabel=language==='ko'?'연습 도구':'Practice tools';
 return <>
  {railOpen?<aside className="desktopPracticeRail" aria-label={t('etudes.scoreToolbar')}>
   <div className="desktopPracticeRailHeading"><h1>{t('score.practiceRoom')}</h1><button type="button" aria-label={railLabel+' '+(language==='ko'?'접기':'collapse')} aria-expanded={true} onClick={()=>setRailOpen(false)}><PanelLeftClose size={17}/></button></div>
   {picker}
   {!model.pdfMode&&<section className="desktopPracticeGroup" aria-label={t('etudes.scoreView')}>
    <h2>{t('etudes.scoreView')}</h2>
    <label className="desktopPracticeField"><span>{t('etudes.scoreDisplay')}</span><select aria-label={t('etudes.changeScoreDisplay')} value={model.notationView} onChange={e=>model.setNotationView(e.target.value)}>{[['tab','etudes.tabOnly'],['both','etudes.staffTab'],['staff','etudes.staffOnly']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
    <label className="desktopPracticeField etudeDesktopSizeControl"><span>{t('etudes.scoreZoom')}</span><select aria-label={t('etudes.scoreZoom')} value={zoom} onChange={e=>onZoom(e.target.value)}><option value="auto">{t('etudes.autoFit')}</option><option value="width">{t('components.fitWidth')}</option>{[.5,.75,1,1.25,1.5,2].map(value=><option key={value} value={value}>{value*100}%</option>)}</select></label>
    <label className="desktopPracticeField etudeDesktopRowControl"><span>{t('etudes.barsPerLine')}</span><select aria-label={t('etudes.barsPerLine')} value={model.measuresPerRow} onChange={e=>onRowCount(Number(e.target.value))}><option value={0}>{t('etudes.auto')}</option>{MEASURE_ROW_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <label className="desktopPracticeField"><span>{t('etudes.practicePosition')}</span><PlaybackBarSelect aria-label={t('etudes.scorePlaybackBar')} bar={model.playPosition?.bar??0} count={model.selected.measures.length} barLabel={t('app.bar')} onChange={bar=>model.controller.current?.seek({bar,event:0})}/></label>
   </section>}
   <section className="desktopPracticeGroup desktopPracticeButtons" aria-label={t('etudes.scoreToolbar')}>
    {tips&&<button type="button" className="etudeTipToggle" aria-expanded={model.tipsOpen} onClick={()=>model.setTipsOpen(v=>!v)}><BookOpen size={17}/>{t('originalUi.tip')}</button>}
   </section>
   <section className="desktopPracticeGroup" aria-label={t('score.actions')}>
    <h2>{t('score.actions')}</h2>
    {!model.pdfMode&&<button type="button" className="desktopPracticePrint" aria-label={printLabel} onClick={onPrint}><Printer size={17}/>{t('etudes.savePdf')}</button>}
    {model.pdfTools??<ScoreWorkspaceActions inline mobile={false} onCreate={model.createScore} onEdit={()=>model.editScore(model.selected)} onImport={model.importPdf} canEdit={model.canEdit!==false} importBusy={model.importBusy}/>}
   </section>
   {storage&&<footer className="desktopPracticeStorage">{storage}</footer>}
   <div className="etudeHudMetroMount etudeFloatingTheme" ref={model.setHudTarget}/>
  </aside>:<aside className="desktopPracticeRailHandle"><button type="button" aria-label={railLabel+' '+(language==='ko'?'열기':'expand')} aria-expanded={false} onClick={()=>setRailOpen(true)}><PanelLeftOpen size={18}/><span>{railLabel}</span></button></aside>}
  <div className="desktopPracticeColumn">
  <div className="desktopPracticeReader">
   {!model.pdfMode&&model.toggleFavorite&&<button type="button" className="etudeFavoriteToggle desktopPracticeFavorite" aria-label={t(model.isFavorite?'etudes.removeFromFavorites':'etudes.addToFavorites')} title={`${model.selected.document?.title??model.selected.english??model.selected.title} · ${t(model.isFavorite?'etudes.removeFromFavorites':'etudes.addToFavorites')}`} aria-pressed={model.isFavorite} onClick={model.toggleFavorite}><Star size={22} aria-hidden="true" fill={model.isFavorite?'currentColor':'none'}/></button>}
   {children}
  </div>
  <div className="desktopPracticeDockMount etudeFloatingTheme" ref={model.setDesktopDockTarget}/>
  </div>
 </>;
}
