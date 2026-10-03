import {pdfTabReview} from './pdfTabReview.js';
import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import './mobilePdfTabReview.css';

export default function MobilePdfTabReview({document,cursor,onSelect,onConfirm,pitchRepair,onRepairPitch}){
  useLanguage();
  const {imported,positions,review,move,canConfirm}=pdfTabReview(document,cursor,onSelect);
  if(!imported)return null;
  return <><PdfTabCoverageNotice summary={document.pdfTabImport?.summary}/>
    {pitchRepair&&<div className="mobileStaffPitchRepair" role="status"><p>{t(pitchRepair.canRepair?'editor.staffPitchRepairHint':'editor.staffPitchRepairEdited')}</p><button type="button" disabled={!pitchRepair.canRepair} onClick={onRepairPitch}>{t('editor.staffPitchRepair')}</button></div>}
    <details className="mobilePdfTabReview">
    <summary>{t(document.pdfTabImport?.notation?'editor.staffReviewSummary':'editor.pdfReviewSummary',{value1:positions.length,value2:review})}</summary>
    <p>{t('editor.pdfConfirmHint')}</p>
    {document.pdfTabImport?.notation&&<p className="notationReviewNotice">{t('editor.staffReviewHint')}</p>}
    <div><button type="button" disabled={!positions.length} onClick={()=>move(1)}>{t('editor.pdfNextUnresolved')}</button><button type="button" disabled={!canConfirm} onClick={onConfirm}>{t('editor.pdfConfirmMeasure')}</button></div>
  </details></>;
}
