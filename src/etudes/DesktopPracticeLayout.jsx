import {Timer,Star,Printer,BookOpen} from 'lucide-react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import ScoreWorkspaceActions from './ScoreWorkspaceActions.jsx';

// Desktop owns its arrangement; the session and score renderer remain shared.
export default function DesktopPracticeLayout({model,picker,storage,zoom,onZoom,onRowCount,onPrint,printLabel,tips,children}) {
 useLanguage();
 return <>
  <aside className="desktopPracticeRail" aria-label={t('etudes.scoreToolbar')}>
   <h1>{t('score.practiceRoom')}</h1>
   {picker}
   {!model.pdfMode&&<section className="desktopPracticeGroup" aria-label={t('etudes.scoreView')}>
    <h2>{t('etudes.scoreView')}</h2>
    <label className="desktopPracticeField"><span>{t('etudes.scoreDisplay')}</span><select aria-label={t('etudes.changeScoreDisplay')} value={model.notationView} onChange={e=>model.setNotationView(e.target.value)}>{[['tab','etudes.tabOnly'],['both','etudes.staffTab'],['staff','etudes.staffOnly']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
    <label className="desktopPracticeField etudeDesktopSizeControl"><span>{t('etudes.scoreZoom')}</span><select aria-label={t('etudes.scoreZoom')} value={zoom} onChange={e=>onZoom(e.target.value)}><option value="auto">{t('etudes.autoFit')}</option><option value="width">{t('components.fitWidth')}</option>{[.5,.75,1,1.25,1.5,2].map(value=><option key={value} value={value}>{value*100}%</option>)}</select></label>
    <label className="desktopPracticeField etudeDesktopRowControl"><span>{t('etudes.barsPerLine')}</span><select aria-label={t('etudes.barsPerLine')} value={model.measuresPerRow} onChange={e=>onRowCount(Number(e.target.value))}><option value={0}>{t('etudes.auto')}</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <label className="desktopPracticeField"><span>{t('etudes.practicePosition')}</span><select aria-label={t('etudes.scorePlaybackBar')} value={model.playPosition?.bar??0} onChange={e=>model.controller.current?.seek({bar:Number(e.target.value),event:0})}>{model.selected.measures.map((_,i)=><option key={i} value={i}>{i+1}{t('app.bar')}</option>)}</select></label>
   </section>}
   <section className="desktopPracticeGroup desktopPracticeButtons" aria-label={t('etudes.scoreToolbar')}>
    <button type="button" data-ui="metronome" aria-label={t('menu.metronome')} aria-pressed={model.toolsVisible||model.metroMinimized} onClick={()=>{model.setTipsOpen(false);model.toggleMetro();}}><Timer size={17}/>{t('menu.metronome')}</button>
    <span className="etudeBackingToggleMount" ref={model.setBackingTarget}/>
    {tips&&<button type="button" className="etudeTipToggle" aria-expanded={model.tipsOpen} onClick={()=>model.setTipsOpen(v=>!v)}><BookOpen size={17}/>{t('originalUi.tip')}</button>}
   </section>
   <section className="desktopPracticeGroup" aria-label={t('score.actions')}>
    <h2>{t('score.actions')}</h2>
    {!model.pdfMode&&<button type="button" className="desktopPracticePrint" aria-label={printLabel} onClick={onPrint}><Printer size={17}/>{t('etudes.savePdf')}</button>}
    {model.pdfTools??<ScoreWorkspaceActions inline mobile={false} onCreate={model.createScore} onEdit={()=>model.editScore(model.selected)} onImport={model.importPdf} canEdit={model.canEdit!==false} importBusy={model.importBusy}/>}
   </section>
   {storage&&<footer className="desktopPracticeStorage">{storage}</footer>}
   <div className="etudeHudMetroMount etudeFloatingTheme" ref={model.setHudTarget}/>
  </aside>
  <div className="desktopPracticeReader">
   {!model.pdfMode&&model.toggleFavorite&&<button type="button" className="etudeFavoriteToggle desktopPracticeFavorite" aria-label={t(model.isFavorite?'etudes.removeFromFavorites':'etudes.addToFavorites')} title={`${model.selected.document?.title??model.selected.english??model.selected.title} · ${t(model.isFavorite?'etudes.removeFromFavorites':'etudes.addToFavorites')}`} aria-pressed={model.isFavorite} onClick={model.toggleFavorite}><Star size={22} aria-hidden="true" fill={model.isFavorite?'currentColor':'none'}/></button>}
   {children}
  </div>
 </>;
}
