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
import {importActivityDetails} from './importActivity.js';
import './mobilePdfTabImport.css';

export default function MobilePdfTabImport(props){
  const {dialog,busy,preparing,opening,progress,result,error,cancel,run,addPhotos,open,photo,pdfFile,removePdf,analyze,attempted,sourceMode,target,targetError}=props;
  const selecting=preparing||opening,hasSource=Boolean(photo||pdfFile);
  const checkpoint=props.checkpoint;
  const resumeLabel=checkpoint?.completed&&!checkpoint.complete?t(error?'editor.importRetryPage':'editor.importContinuePage',{value1:checkpoint.completed+1,value2:Math.min(checkpoint.totalPages,checkpoint.completed+props.batchSize)}):t(attempted?'editor.importAnalyzeAgain':'editor.importAnalyze');
  const pianoResult=Boolean(result)&&target?.instrument==='piano';
  useLanguage();
  const activity=importActivityDetails(progress,{pdfFile,photos:props.photos});
  const comparison=notationCheckSummary(result);
  return <dialog ref={dialog} data-has-photos={Boolean(photo&&!busy&&!result)} className="mobilePdfTabImport" aria-label={t('editor.pdfImportConvert')} onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><h2>{t('editor.pdfImportConvert')}</h2><button type="button" onClick={cancel} aria-label={t('common.close')}>×</button></header>
    <div className="mobilePdfTabBody">{!result&&checkpoint?.completed>0&&<section className="mobileImportCheckpoint" aria-label={t('editor.importCheckpoint')}>
      <strong role="status">{t('editor.importCheckpointCount',{value1:checkpoint.completed,value2:checkpoint.totalPages})}</strong>
      <p>{t(props.paused?'editor.importPausedHint':'editor.importCheckpointHint')}</p>
      {!busy&&checkpoint.completed>0&&<><PhotoScanNotice result={checkpoint}/>{Boolean(props.partOptions?.length)&&<label>{t('editor.photoPartLabel')}<select aria-label={t('editor.photoPartLabel')} disabled={opening} value={props.selectedPart??''} onChange={e=>props.changePart(e.target.value)}><option value="">{t('editor.photoPartChoose')}</option>{props.partOptions.map(part=><option value={part} key={part}>{t('editor.photoPartOrder',{value1:part})}</option>)}</select></label>}<button type="button" disabled={selecting||!checkpoint.summary.measures} onClick={props.openPartial}>{t('editor.importOpenPartial',{value1:checkpoint.completed})}</button></>}
    </section>}{sourceMode==='grand'&&target?.instrument!=='bass'?<div className="pdfImportTarget mobilePianoImportRoute"><strong>{t('editor.pianoGuitarRoute')}</strong><span>{t('editor.pianoGuitarRouteHint')}</span></div>:busy||result?<ImportTargetCaption target={target}/>:<MobileImportTargetSettings {...props} opening={selecting}/>}
      {(busy||result)&&<div className="pdfTabActiveMode" role="group" aria-label={t('editor.selectedConversionMode')}><span>{t('editor.selectedConversionMode')}</span><strong>{conversionLabels(sourceMode,target).title}</strong><p>{conversionLabels(sourceMode,target).description}</p></div>}
      {error&&<div className="scoreImportError" role="alert"><strong>{t('editor.importFailed')}</strong><p>{localizeUi(error)}</p></div>}
      {!busy&&!result&&<><StaffImportOptions {...props} opening={selecting} compact={hasSource}/><label className="mobilePdfTabFile"><span className="pdfImportStep"><span aria-hidden="true">2</span>{t(hasSource?'editor.pdfChooseAnother':'editor.pdfChoose')}</span><input type="file" multiple accept={TAB_SOURCE_ACCEPT} aria-label={t('editor.pdfChoose')} disabled={selecting||!!targetError} onChange={run}/></label>
        {!pdfFile&&<label className="mobilePdfTabFile mobilePhotoCapture">{t('editor.photoCapture')}<input type="file" accept="image/*" capture="environment" aria-label={t('editor.photoCapture')} disabled={selecting||!!targetError} onChange={addPhotos}/></label>}
        {photo&&<label className="mobilePdfTabFile mobileTabPhotoAdd">{t('editor.photoAdd')}<input type="file" multiple accept={TAB_PHOTO_ACCEPT} aria-label={t('editor.photoAdd')} disabled={selecting||!!targetError} onChange={addPhotos}/></label>}
        <p className="mobileImportSelectionHint">{t('editor.importSelectionHint')} {t('editor.importBatchHint',{value1:props.batchSize})}</p>
        {pdfFile&&<section className="mobileImportSelectedPdf" aria-label={t('editor.importSelectedFile')}><span><strong>PDF</strong> {pdfFile.name}</span><button type="button" disabled={selecting} onClick={removePdf}>{t('common.delete')}</button></section>}
      </>}
      {preparing&&<p role="status">{t('editor.importPreviewPreparing')}</p>}
      {photo&&!busy&&!result&&<TabPhotoPreview {...props} opening={selecting} mobile/>}
      {busy&&<section className="mobileImportActivity" aria-label={t('editor.importActivity')} aria-busy="true">
        <div className="mobileImportSource">
          {activity.preview&&<svg className="mobileImportSourcePreview" role="img" aria-label={t('editor.importSourcePreview',{value1:activity.fileName})} viewBox={`0 0 ${activity.preview.width} ${activity.preview.height}`}><image href={activity.preview.url} width={activity.preview.width} height={activity.preview.height}/>{activity.region&&<rect {...activity.region}/>}</svg>}
          <div className="mobileImportSourceText"><span>{t('editor.importCurrentFile')}</span><strong>{activity.fileName}</strong><span>{activity.pageLabel}</span><span>{activity.location}</span>{activity.stage&&<b>{activity.stage}</b>}</div>
        </div>
        <div className="mobileImportActivityHeading"><strong>{t('editor.importRecognizing')}</strong><span className="mobileImportScanMarks" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*.12}s`}}/>)}</span></div>
        <time className="mobileImportElapsed" aria-live="off">{t('editor.importElapsed',{value1:importElapsedTime(props.elapsedSeconds)})}</time><p role="status">{localizeUi(progress.message)||t('editor.pdfPreparing')}</p><div className="mobileImportProgressMeter"><progress aria-label={t('editor.importProgress')} max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>
        {activity.longWait&&<p className="mobileImportWaiting">{t('editor.importWaitingForReading')}</p>}
      </section>}
      {result&&<section aria-label={t('editor.pdfAnalysisDone')}><h3>{t('editor.scoreAnalysisDone')}</h3><p className="mobilePdfTabFilename">{result.fileName}</p><dl>{[['editor.pdfPages','pages'],['editor.pdfMeasures','measures'],['editor.importNotes','confirmed']].map(([label,key])=><div key={key}><dt>{t(label)}</dt><dd>{result.summary[key]}</dd></div>)}</dl>{!result.pages.some(p=>p.notation)&&<p>{t('editor.pdfReviewHint')}</p>}</section>}
      {result&&<><PhotoScanNotice result={result}/><PdfTabCoverageNotice summary={result.summary} showPhotoRecovery/></>}
      {result&&Boolean(props.partOptions?.length)&&<section className="mobileImportPart"><p>{t('editor.photoPartHint')}</p><label>{t('editor.photoPartLabel')}<select aria-label={t('editor.photoPartLabel')} disabled={opening} value={props.selectedPart??''} onChange={e=>props.changePart(e.target.value)}><option value="">{t('editor.photoPartChoose')}</option>{props.partOptions.map(part=><option value={part} key={part}>{t('editor.photoPartOrder',{value1:part})}</option>)}</select></label></section>}
      {result?.pages.some(p=>p.notation)&&<p className="notationReviewNotice">{target.instrument==='bass'?'선택한 베이스 설정으로 엽니다. 멜로디·코드는 저음 반주로 변환하며, 읽지 못한 코드는 먼저 확인합니다.':t(target.instrument==='piano'?'editor.pianoImportHint':'editor.staffReviewHint')}</p>}
      {comparison&&<p className="notationReviewNotice">{t('editor.notationCheckResult',{value1:comparison.matches,value2:comparison.mismatches})}{comparison.warnings.map(w=><span key={w}> {w}</span>)}</p>}
    </div>
    <footer data-piano-result={pianoResult}><button type="button" onClick={cancel}>{t(busy?'editor.importPause':'common.cancel')}</button>{!busy&&!result&&<button type="button" disabled={selecting||!!targetError||!hasSource} onClick={analyze}>{resumeLabel}</button>}{result&&<button type="button" disabled={opening} aria-busy={opening} onClick={open}>{t(opening?'editor.pdfOpening':pianoResult?'editor.openPianoOriginal':'editor.pdfOpenDraft')}</button>}{pianoResult&&<button type="button" className="mobileImportArrange" disabled={opening} onClick={props.arrange}>{t('editor.arrangePianoToTab')}</button>}</footer>
  </dialog>;
}

function MobileImportTargetSettings({target,targetOptions:o,opening,changeTargetInstrument,changeTargetTuning,sourceMode,changeNotationPitch,verifyNotation,changeVerifyNotation}){
  return <ImportTargetCaption target={target}><div className="mobileImportTargetFields">
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
