import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './desktopPdfNavigation.css';

// Desktop presentation only; page and measure navigation use the shared session.
export default function DesktopPdfNavigation({page,pageCount,onPage,hasBars,activeBar,onStepBar}){
 const language=useLanguage();
 const barLabel=language==='ko'?'마디이동':'Bars';
 return <div className="pdfBarNav desktopPdfNavigation">
  {hasBars&&<div className="desktopPdfMeasureNav">
   <div className="desktopPdfMeasureButtons" role="group" aria-label={barLabel}>
    <button type="button" aria-label={t('etudes.previousBar')} title={t('etudes.previousBar')} onClick={()=>onStepBar(-1)}>‹</button>
    <span>{barLabel}</span>
    <button type="button" aria-label={t('etudes.nextBar')} title={t('etudes.nextBar')} onClick={()=>onStepBar(1)}>›</button>
   </div>
   <span className="desktopPdfMeasurePosition">{activeBar?t('etudes.barValue1',{value1:activeBar}):t('pdf.chooseBar')}</span>
  </div>}
  <nav className="desktopPdfPageNav" aria-label={language==='ko'?'PDF 페이지 이동':'PDF page navigation'}>
   <button type="button" aria-label={t('pdf.previousPdfPage')} title={t('pdf.previousPdfPage')} disabled={page<=1} onClick={()=>onPage(page-1)}>‹</button>
   <span>{page} / {pageCount}</span>
   <button type="button" aria-label={t('pdf.nextPdfPage')} title={t('pdf.nextPdfPage')} disabled={page>=pageCount} onClick={()=>onPage(page+1)}>›</button>
  </nav>
 </div>;
}
