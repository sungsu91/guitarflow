import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import TabPhotoPreview from './TabPhotoPreview.jsx';
import StaffImportOptions from './StaffImportOptions.jsx';
import {TAB_SOURCE_ACCEPT,TAB_PHOTO_ACCEPT} from './imageTabSource.js';
import {t,localizeUi} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import './mobilePdfTabImport.css';

export default function MobilePdfTabImport(props){
  const {dialog,busy,opening,progress,result,error,cancel,run,addPhotos,open,photo,photos,analyzePhoto,attempted}=props;
  useLanguage();
  return <dialog ref={dialog} className="mobilePdfTabImport" aria-label={t('editor.pdfImportConvert')} onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><h2>{t('editor.pdfImportConvert')}</h2><button type="button" onClick={cancel} aria-label={t('common.close')}>×</button></header>
    <div className="mobilePdfTabBody">
      <p>{t('editor.pdfImportDescription')}</p>
      {error&&<div className="scoreImportError" role="alert"><strong>{t('editor.importFailed')}</strong><p>{localizeUi(error)}</p></div>}
      {!busy&&!result&&<><StaffImportOptions {...props}/><label className="mobilePdfTabFile">{t(photo?'editor.pdfChooseAnother':'editor.pdfChoose')}<input type="file" multiple accept={TAB_SOURCE_ACCEPT} aria-label={t('editor.pdfChoose')} disabled={opening} onChange={run}/></label>
        {photo&&<label className="mobilePdfTabFile mobileTabPhotoAdd">{t('editor.photoAdd')}<input type="file" multiple accept={TAB_PHOTO_ACCEPT} aria-label={t('editor.photoAdd')} disabled={opening} onChange={addPhotos}/></label>}</>}
      {photo&&!busy&&!result&&<TabPhotoPreview {...props}/>}
      {busy&&<div role="status" aria-live="polite"><p>{localizeUi(progress.message)||t('editor.pdfPreparing')}</p><progress max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>}
      {result&&<section aria-label={t('editor.pdfAnalysisDone')}><h3>{t('editor.pdfAnalysisDone')}</h3><p className="mobilePdfTabFilename">{result.fileName}</p><dl>{[['editor.pdfPages','pages'],['editor.pdfMeasures','measures'],['editor.pdfFrets','confirmed']].map(([label,key])=><div key={key}><dt>{t(label)}</dt><dd>{result.summary[key]}</dd></div>)}</dl>{!result.pages.some(p=>p.notation)&&<p>{t('editor.pdfReviewHint')}</p>}</section>}
      {result&&<PdfTabCoverageNotice summary={result.summary}/>}
      {result?.pages.some(p=>p.notation)&&<p className="notationReviewNotice">{t('editor.staffReviewHint')}</p>}
    </div>
    <footer><button type="button" onClick={cancel}>{t(busy?'editor.pdfCancelAnalysis':'common.cancel')}</button>{photo&&!busy&&!result&&<button type="button" onClick={analyzePhoto}>{t(attempted?'editor.photoRetry':photos.length>1?'editor.photoAnalyzeAll':'editor.photoAnalyze')}</button>}{result&&<button type="button" disabled={opening} aria-busy={opening} onClick={open}>{t(opening?'editor.pdfOpening':'editor.pdfOpenDraft')}</button>}</footer>
  </dialog>;
}
