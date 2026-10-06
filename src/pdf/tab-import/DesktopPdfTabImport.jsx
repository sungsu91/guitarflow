import {conversionLabels} from './conversionLabels.js';
import {notationCheckSummary} from './notationCheckSummary.js';
import PhotoScanNotice from './PhotoScanNotice.jsx';
import ImportTargetCaption from './ImportTargetCaption.jsx';
import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import TabPhotoPreview from './TabPhotoPreview.jsx';
import StaffImportOptions from './StaffImportOptions.jsx';
import {TAB_SOURCE_ACCEPT,TAB_PHOTO_ACCEPT} from './imageTabSource.js';
import {t,localizeUi} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import {importElapsedTime} from './importProgress.js';
import './desktopPdfTabImport.css';

export default function DesktopPdfTabImport(props){
  const {dialog,busy,preparing,opening,progress,result,error,cancel,run,addPhotos,open,photo,pdfFile,removePdf,analyze,attempted,sourceMode,target,targetError}=props;
  const selecting=preparing||opening,hasSource=Boolean(photo||pdfFile);
  const pianoResult=result?.target?.instrument==='piano';
  useLanguage();
  const comparison=notationCheckSummary(result);
  return <dialog ref={dialog} data-has-photos={Boolean(photo&&!busy&&!result)} className="desktopPdfTabImport" aria-label="PDF·사진에서 악보 가져오기" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><div><small>FRETIVA LAB · DESKTOP</small><h2>PDF·사진에서 악보 가져오기</h2></div><button type="button" onClick={cancel} aria-label="PDF TAB 분석 닫기">×</button></header>
    <div className="desktopPdfTabBody">{sourceMode==='grand'?<div className="pdfImportTarget desktopPianoImportRoute"><strong>{t('editor.pianoGuitarRoute')}</strong><span>{t('editor.pianoGuitarRouteHint')}</span></div>:busy||result?<ImportTargetCaption target={target}/>:<DesktopImportTargetSettings {...props} opening={selecting}/>}
    {(busy||result)&&<div className="pdfTabActiveMode" role="group" aria-label={t('editor.selectedConversionMode')}><span>{t('editor.selectedConversionMode')}</span><strong>{conversionLabels(sourceMode,target).title}</strong><p>{conversionLabels(sourceMode,target).description}</p></div>}
    {error&&<div className="scoreImportError" role="alert"><strong>분석을 완료하지 못했습니다</strong><p>{error}</p></div>}
    {!busy&&!result&&<><StaffImportOptions {...props} opening={selecting} compact={hasSource}/><label className="pdfTabFileButton"><span className="pdfImportStep"><span aria-hidden="true">2</span>{t(hasSource?'editor.pdfChooseAnother':'editor.pdfChoose')}</span><input type="file" multiple accept={TAB_SOURCE_ACCEPT} aria-label={t('editor.pdfChoose')} disabled={selecting||!!targetError} onChange={run}/></label>
      {photo&&<label className="pdfTabFileButton desktopTabPhotoAdd">{t('editor.photoAdd')}<input type="file" multiple accept={TAB_PHOTO_ACCEPT} aria-label={t('editor.photoAdd')} disabled={selecting||!!targetError} onChange={addPhotos}/></label>}
      <p className="desktopImportSelectionHint">{t('editor.importSelectionHint')}</p>
      {pdfFile&&<section className="desktopImportSelectedPdf" aria-label={t('editor.importSelectedFile')}><span><strong>PDF</strong> {pdfFile.name}</span><button type="button" disabled={selecting} onClick={removePdf}>{t('common.delete')}</button></section>}
    </>}
    {preparing&&<p role="status">{t('editor.importPreviewPreparing')}</p>}
    {photo&&!busy&&!result&&<TabPhotoPreview {...props} opening={selecting}/>}
    {busy&&<section className="pdfTabProgress desktopImportActivity" aria-label={t('editor.importActivity')} aria-busy="true">
      <div className="desktopImportActivityHeading"><strong>{t('editor.importRecognizing')}</strong><span className="desktopImportScanMarks" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*.12}s`}}/>)}</span><time className="desktopImportElapsed" aria-live="off">{t('editor.importElapsed',{value1:importElapsedTime(props.elapsedSeconds)})}</time></div>
      <p role="status">{localizeUi(progress.message)||t('editor.pdfPreparing')}</p><div className="desktopImportProgressMeter"><progress aria-label={t('editor.importProgress')} max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>
    </section>}
    {result&&<section aria-label="TAB 분석 결과"><h3>악보 분석 완료</h3><dl>{[['전체 페이지','pages'],['전체 마디','measures'],[t('editor.importNotes'),'confirmed']].map(([label,key])=><div key={key}><dt>{label}</dt><dd>{result.summary[key]}</dd></div>)}</dl>
      <ul className="pdfTabPageResults" aria-label="페이지별 분석 결과">{result.pages.map(page=><li key={page.page}>{page.page}페이지 <strong>{page.staffs.reduce((n,s)=>n+s.measures.length,0)}마디</strong></li>)}</ul>
      <PhotoScanNotice result={result}/><PdfTabCoverageNotice summary={result.summary} showPhotoRecovery/>
      {Boolean(props.partOptions?.length)&&<div className="desktopImportPart"><p>{t('editor.photoPartHint')}</p><label>{t('editor.photoPartLabel')}<select aria-label={t('editor.photoPartLabel')} disabled={opening} value={props.selectedPart??''} onChange={e=>props.changePart(e.target.value)}><option value="">{t('editor.photoPartChoose')}</option>{props.partOptions.map(part=><option value={part} key={part}>{t('editor.photoPartOrder',{value1:part})}</option>)}</select></label></div>}
      {result.pages.some(p=>p.notation)&&<p className="notationReviewNotice">{target.instrument==='piano'?t('editor.pianoImportHint'):<>오선보에서 기본 운지로 배치한 초안입니다. 음높이·리듬·도돌이표를 원본과 비교해 주세요. 붙임줄·이음줄·주법, 1·2번 반복 구간 및 D.C.·D.S.·코다 진행은 직접 확인해 입력해 주세요.</>}</p>}
    </section>}
    {comparison&&<p className="notationReviewNotice">{t('editor.notationCheckResult',{value1:comparison.matches,value2:comparison.mismatches})}{comparison.warnings.map(w=><span key={w}> {w}</span>)}</p>}</div><footer><button type="button" onClick={cancel}>{busy?'분석 취소':'취소'}</button>{!busy&&!result&&<button type="button" className="pdfTabOpen" disabled={selecting||!!targetError||!hasSource} onClick={analyze}>{t(attempted?'editor.importAnalyzeAgain':'editor.importAnalyze')}</button>}{result&&<button type="button" className={pianoResult?'pdfTabOriginal':'pdfTabOpen'} disabled={opening} aria-busy={opening} onClick={open}>{opening?'제작실로 옮기는 중…':pianoResult?t('editor.openPianoOriginal'):'제작실에서 열기'}</button>}{pianoResult&&<button type="button" className="pdfTabOpen" disabled={opening} onClick={props.arrange}>{t('editor.arrangePianoToTab')}</button>}</footer>
  </dialog>;
}

function DesktopImportTargetSettings({target,targetOptions:o,opening,changeTargetInstrument,changeTargetTuning,sourceMode,changeNotationPitch,verifyNotation,changeVerifyNotation}){
  return <ImportTargetCaption target={target}><div className="desktopImportTargetFields">
    <label>{t('editor.importTarget')}<select aria-label={t('editor.importTarget')} value={o.instrumentValue} disabled={opening} onChange={e=>changeTargetInstrument(e.target.value)}>
      {!target&&<option value="" disabled>{t('editor.importChooseInstrument')}</option>}
      {o.instruments.map(p=><option key={p.id} value={p.id}>{localizeUi(p.label)}{p.count?` · ${t('editor.importStringCount',{value1:p.count})}`:''}</option>)}
    </select></label>
    {target?.tuning.length>0&&<label>{t('etudes.tuning')}<select aria-label={t('editor.importTuning')} value={o.tuningValue} disabled={opening||!target} onChange={e=>changeTargetTuning(e.target.value)}>
      {(!target||o.customTuning)&&<option value="current">{t('etudes.custom')}</option>}
      {o.tunings.map(p=><option key={p.id} value={p.id}>{localizeUi(p.label)}</option>)}
    </select></label>}
    {target?.tuning.length>0&&(sourceMode==='staff'||sourceMode==='tab'&&verifyNotation)&&<label className="importSourcePitch">{t('editor.sourcePitch')}<select aria-label={t('editor.sourcePitch')} value={target.notationPitch??'concert'} disabled={opening} onChange={e=>changeNotationPitch(e.target.value)}><option value="concert">{t('editor.concertPitch')}</option><option value="octave-down">{t('editor.octaveDownPitch')}</option></select><small>{t('editor.sourcePitchHint')}</small></label>}
    {sourceMode==='tab'&&<label className="importPairedCheck"><input type="checkbox" checked={verifyNotation} onChange={e=>changeVerifyNotation(e.target.checked)} disabled={opening}/>{t('editor.verifyPaired')}<small>{t('editor.verifyPairedHint')}</small></label>}
  </div></ImportTargetCaption>;
}
