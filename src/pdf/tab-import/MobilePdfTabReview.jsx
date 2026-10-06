import {pdfTabReview} from './pdfTabReview.js';
import {reviewTargetLabel} from './reviewTargetLabel.js';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import './mobilePdfTabReview.css';

export default function MobilePdfTabReview({document,cursor,onSelect,onConfirm,pitchRepair,onRepairPitch}){
  useLanguage();
  const {imported,positions,current,currentIndex,move,canConfirm}=pdfTabReview(document,cursor,onSelect);
  if(!imported)return null;
  return <><PdfTabCoverageNotice summary={document.pdfTabImport?.summary}/>
    {pitchRepair&&<div className="mobileStaffPitchRepair" role="status"><p>{t(pitchRepair.canRepair?'editor.staffPitchRepairHint':'editor.staffPitchRepairEdited')}</p><button type="button" disabled={!pitchRepair.canRepair} onClick={onRepairPitch}>{t('editor.staffPitchRepair')}</button></div>}
    <section className="mobilePdfTabReview" aria-label={t('editor.reviewQuick')}>
    <div className="mobileReviewQuick">
      <button type="button" aria-label={t('editor.reviewPrevious')} disabled={!positions.length} onClick={()=>move(-1)}><ChevronLeft size={20}/></button>
      <output aria-live="polite" aria-atomic="true"><strong>{current?reviewTargetLabel(current):t(positions.length?'editor.reviewRemaining':'editor.reviewComplete',{value1:positions.length})}</strong>{positions.length>0&&<span>{current?t('editor.reviewProgress',{value1:currentIndex+1,value2:positions.length}):t('editor.reviewArrowHint')}</span>}</output>
      <button type="button" aria-label={t('editor.reviewNext')} disabled={!positions.length} onClick={()=>move(1)}><ChevronRight size={20}/></button>
    </div>
    <details>
    <summary>{t('editor.reviewDetails')}</summary>
    <p>{t('editor.pdfConfirmHint')}</p>
    {document.pdfTabImport?.notation&&<p>{t('editor.reviewScopeHint')}</p>}
    <button type="button" disabled={!canConfirm} onClick={onConfirm}>{t('editor.pdfConfirmMeasure')}</button>
  </details></section></>;
}
