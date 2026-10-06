import {useLanguage,Translation} from '../i18n/react.jsx';
import PdfViewToolbar from './PdfViewToolbar.jsx';
import './desktopPdfTools.css';

// Desktop presentation only; PDF state/actions stay in PdfPractice.
export default function DesktopPdfTools({zoom,setZoom,previewRoot,editing,onEdit,onRepeat,repeatActive,original,onOriginal,onFullscreen,onAnalyse,onReset,hasBars,busy,hasDraft,onCreate,onImport,importBusy,onSave,saving}){
 const lang=useLanguage(),t=(ko,en)=>lang==='ko'?ko:en;
 return <div className="desktopPdfTools">
  <div className="desktopPdfToolSection">
   <h3>{t('화면','View')}</h3>
   <PdfViewToolbar zoom={zoom} setZoom={setZoom} previewRoot={previewRoot}/>
   <div className="desktopPdfToolRow desktopPdfViewActions"><button type="button" onClick={onFullscreen}><Translation id="pdf.fullscreen"/></button><button type="button" aria-pressed={original} disabled={hasDraft||busy} onClick={onOriginal}>{original?t('연습 보기','Practice view'):t('원본 보기','View original')}</button></div>
  </div>
  <div className="desktopPdfToolSection">
   <h3>{t('악보 편집','Score editing')}</h3>
   <button type="button" aria-pressed={editing&&!original} disabled={busy||original} onClick={onEdit}>{editing?t('편집 완료','Done editing'):t('자르기 · 필기 편집','Crop · annotate')}</button>
   <button type="button" aria-pressed={repeatActive} disabled={hasDraft||busy} onClick={onRepeat}>{t('반복 설정','Repeat settings')}</button>
   <div className="desktopPdfToolRow"><button type="button" disabled={hasDraft||busy||original} onClick={onAnalyse}><Translation id="pdf.autoDetect"/></button><button type="button" disabled={!hasBars||hasDraft||busy||original} onClick={onReset}><Translation id="pdf.resetMeasureAreas"/></button></div>
  </div>
  <div className="desktopPdfToolSection">
   <h3>{t('파일','File')}</h3>
   <button type="button" disabled={saving} aria-busy={saving} onClick={onSave}><Translation id={saving?'pdf.savingPdf':'pdf.savePdf'}/></button>
   <div className="desktopPdfToolRow"><button type="button" onClick={onCreate}><Translation id="score.make"/></button><button type="button" disabled={importBusy} onClick={onImport}><Translation id="app.load"/></button></div>
  </div>
 </div>;
}
