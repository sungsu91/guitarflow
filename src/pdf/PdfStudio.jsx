import { localizeUi } from "./../i18n/core.js";
import {useTabletLayout} from '../layouts/TabletLayout.jsx';
import ko from "./../i18n/locales/ko.js";
import { formatMessage } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import '../pdf/scoreWorkspaceTheme.css';
import {LibraryHeader,LibraryStorage} from './LibraryChrome.jsx';
import './libraryDesign.css';
import {normalizePdfBarEntry} from './pdfBarRows.js';
import {normalizePdfRepeats} from './pdfRepeats.js';
import ScoreLibraryTabs from './ScoreLibraryTabs.jsx';
import TabletScoreHeader from './TabletScoreHeader.jsx';
import {normalizePageEdits} from './pdfAnnotations.js';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {readPracticeSelection,writePracticeSelection} from './practiceSelection.js';
import {listPdfs,getPdf,savePdf,patchPdf,deletePdf,validatePdfFile,uniquePdfTitle,storageError,downloadBlob,exportPdfLibrary,readBackup} from './pdfLibrary.js';
import {inspectPdf} from './pdfRenderer.js';
import './pdfStudio.css';
import './scoreFileBrowser.css';
import './scoreLibraryTheme.css';
import './scoreLibraryMobile.css';
import './librarySafeArea.css';
import '../layouts/desktop-score-practice.css';
const preloadPdfPractice=()=>import('./PdfPractice.jsx');
const PdfPractice=lazy(preloadPdfPractice);
const Lessons=lazy(()=>import('../etudes/EtudeStudio.jsx'));
const meters=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];
export function pdfMetadata(source={}) {
 const count=Math.max(1,Math.floor(Number(source.pageCount)||1));
 return {viewMode:source.viewMode==='continuous'?'continuous':'single',pageEdits:normalizePageEdits(source.pageEdits,count),repeatSettings:normalizePdfRepeats(source.repeatSettings),title:String(source.title||ko["pdf.newPdfScore"]).slice(0,200),artist:String(source.artist??'').slice(0,200),bpm:Math.max(30,Math.min(240,Number(source.bpm)||80)),meter:meters.includes(source.meter?.join('/'))?source.meter:[4,4],difficulty:[ko["pdf.unspecified"],ko["etudes.beginner"],ko["etudes.intermediate"],ko["etudes.advanced"]].includes(source.difficulty)?source.difficulty:ko["pdf.unspecified"],tags:Array.isArray(source.tags)?source.tags.map(String).slice(0,30):[],memo:String(source.memo??'').slice(0,5000),pageCount:count,lastPage:Math.max(1,Math.min(count,Number(source.lastPage)||1)),zoom:['fit','page'].includes(source.zoom)?source.zoom:Math.max(25,Math.min(250,Number(source.zoom)||100)),mobileZoom:source.mobileZoom==null?'fit':['fit','page'].includes(source.mobileZoom)?source.mobileZoom:Math.max(25,Math.min(250,Number(source.mobileZoom)||100)),barMap:(Array.isArray(source.barMap)?source.barMap:[]).filter(b=>Number.isInteger(b.number)&&b.number>0&&Number.isInteger(b.page)&&b.page>0&&b.page<=count&&[b.x,b.y,b.width,b.height,b.beats].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.001&&b.y+b.height<=1.001&&b.beats>=1&&b.beats<=32).slice(0,5000).map(normalizePdfBarEntry),practiceOrder:Array.isArray(source.practiceOrder)?source.practiceOrder.filter(Number.isInteger).slice(0,1000):[],countIn:Boolean(source.countIn),audible:source.audible!==false,highlight:Boolean(source.highlight),loop:Boolean(source.loop),loopStart:Math.max(1,Number(source.loopStart)||1),loopEnd:Math.max(1,Number(source.loopEnd)||1)};
}
function MetadataDialog({record,onSave,onClose,busy,error}) {
  useLanguage();
 const ref=useRef(null),[draft,setDraft]=useState(record);
 useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
 const field=(key,value)=>setDraft(d=>({...d,[key]:value}));
 return <dialog ref={ref} className="pdfDialog" aria-label={translateUi("pdf.pdfScoreDetails")} onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><form onSubmit={e=>{e.preventDefault();onSave(draft);}}><h2><Translation id="pdf.pdfScoreDetails" /></h2>{error&&<p role="alert">{localizeUi(error)}</p>}<label><Translation id="etudes.scoreTitle" /><input autoFocus required maxLength="200" value={draft.title} onChange={e=>field('title',e.target.value)}/></label><label><Translation id="pdf.composerArtist" /><input maxLength="200" value={draft.artist} onChange={e=>field('artist',e.target.value)}/></label><div className="pdfPair"><label><Translation id="originalUi.bpm" /><input type="number" min="30" max="240" required value={draft.bpm} onChange={e=>field('bpm',e.target.value)}/></label><label><Translation id="app.meter" /><select value={draft.meter.join('/')} onChange={e=>field('meter',e.target.value.split('/').map(Number))}>{meters.map(m=><option key={m}>{m}</option>)}</select></label></div><label><Translation id="app.difficulty" /><select value={draft.difficulty} onChange={e=>field('difficulty',e.target.value)}>{[ko["pdf.unspecified"],ko["etudes.beginner"],ko["etudes.intermediate"],ko["etudes.advanced"]].map(v=><option key={v}>{v}</option>)}</select></label><label><Translation id="pdf.practiceTagsCommaSeparated" /><input value={draft.tags.join(',')} onChange={e=>field('tags',e.target.value.split(','))}/></label><label><Translation id="pdf.notes" /><textarea maxLength="5000" value={draft.memo} onChange={e=>field('memo',e.target.value)}/></label><p><Translation id="pdf.theOriginalPdfAndSettingsAreStoredInThisBrowserOnThis" /></p><footer><button type="button" disabled={busy} onClick={onClose}><Translation id="common.cancel" /></button><button type="submit" className="pdfPrimary" disabled={busy}>{busy?translateUi("pdf.saving"):translateUi("pdf.saveToDevice")}</button></footer></form></dialog>;
}
export default function PdfStudio({mobile,onOpenMenu,onExit}) {
 const tablet=useTabletLayout();
  useLanguage();
 const [initialSelection]=useState(readPracticeSelection);
 const [lessonSavedId,setLessonSavedId]=useState(initialSelection.savedId),[lessonId,setLessonId]=useState(initialSelection.lessonId||undefined);
 const [restoring,setRestoring]=useState(Boolean(initialSelection.pdfId));
 const [records,setRecords]=useState([]),[opened,setOpened]=useState(null),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[estimate,setEstimate]=useState(null);
 const [transfer,setTransfer]=useState(null);
 // Activity restarts effects when returning from another tool; keep the
 // current choice instead of restoring this mount's older PDF a second time.
 const restorationComplete=useRef(false);
 const practiceInput=useRef(null);
 const studio=useRef(null),pdfClose=useRef(null),input=useRef(null),backup=useRef(null);
 const refresh=async()=>{try{setRecords(await listPdfs());setEstimate(await navigator.storage?.estimate?.());}catch(e){setError(storageError(e));}};
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const entries=await listPdfs();if(!active)return;setRecords(entries);
    if(!restorationComplete.current&&initialSelection.pdfId){
     const record=entries.find(entry=>entry.id===initialSelection.pdfId);
     const blob=record?await getPdf(record.id):null;if(!active)return;
     if(blob){void preloadPdfPractice();setOpened({record,blob});}
     else writePracticeSelection({...initialSelection,pdfId:''});
    }
   }catch(e){if(active)setError(storageError(e));}
   finally{if(active){restorationComplete.current=true;setRestoring(false);}}
  })();
  void navigator.storage?.estimate?.().then(value=>{if(active)setEstimate(value);}).catch(()=>{});
  return()=>{active=false;};
 },[initialSelection]);
 const rememberLesson=useCallback((id,saved)=>{
  setLessonId(id);setLessonSavedId(saved);
  writePracticeSelection({lessonId:id,savedId:saved,pdfId:''});
 },[]);
 useEffect(()=>{
  if(opened)writePracticeSelection({lessonId,savedId:lessonSavedId,pdfId:opened.record.id});
 },[opened?.record.id,lessonId,lessonSavedId]);
 const open=async (record,edit=false)=>{void preloadPdfPractice();setBusy(true);setError('');try{const blob=await getPdf(record.id);if(!blob)throw Error(ko["pdf.noOriginalPdfIsStoredImportABackupOrTheOriginalAgain"]);setOpened({record,blob,edit});}catch(e){setError(e.message);}finally{setBusy(false);}};
 const importPdfFile=async (blob,openAfterSave=false)=>{if(!blob){input.current.click();return;}setBusy(true);setError('');setMessage(ko["pdf.checkingPdfAndPreparingTheFirstPage"]);try{await validatePdfFile(blob);const title=uniquePdfTitle(await listPdfs(),blob.name.replace(/\.pdf$/i,''));const info=await inspectPdf(blob);const record={...pdfMetadata({title,...info,zoom:'fit'}),...info,id:crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastPracticedAt:null};setPending({record,blob,openAfterSave});setMessage(ko["pdf.reviewTheDetailsThenSave"]);}catch(e){setError(e.name==='PasswordException'?ko["pdf.chooseAnUnlockedPdfCopy"]:e.message);}finally{setBusy(false);}};
 const importPdf=e=>{const blob=e.target.files?.[0];e.target.value='';if(blob)void importPdfFile(blob,true);};
 const importScorePdf=blob=>{void importPdfFile(blob,true);};
 const save=async draft=>{setBusy(true);setError('');try{let record={...draft,...pdfMetadata(draft),updatedAt:new Date().toISOString()};if(pending.blob)record=await savePdf(record,pending.blob);else await patchPdf(record.id,record);pending.onSaved?.(record);if(pending.openAfterSave&&pending.blob)setOpened({record,blob:pending.blob});setPending(null);setMessage(ko["pdf.pdfScoreSavedToDevice"]);await refresh();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const restore=async (e,practice=false)=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');let added=0,skipped=0;
  try{
   const entries=await readBackup(file);let single=null;
   for(const {record:old,pdfBlob} of entries){
    await validatePdfFile(pdfBlob);const existing=(await listPdfs()).find(r=>r.id===old.id);
    if(existing&&(!practice||entries.length!==1)){skipped++;continue;}
    const info=await inspectPdf(pdfBlob),record={...pdfMetadata({...old,pageCount:info.pageCount}),...info,id:existing?.id??(typeof old.id==='string'&&old.id?old.id:crypto.randomUUID()),fingerprint:existing?.fingerprint,createdAt:existing?.createdAt??(Number.isFinite(Date.parse(old.createdAt))?old.createdAt:new Date().toISOString()),updatedAt:new Date().toISOString(),lastPracticedAt:Number.isFinite(Date.parse(old.lastPracticedAt))?old.lastPracticedAt:null};
    if(existing){setTransfer({record,pdfBlob});return;}
    const saved=await savePdf(record,pdfBlob);added++;single={record:saved,blob:pdfBlob};
   }
   setMessage(formatMessage(ko["pdf.restoredValue1KeptValue2ExistingMatchingPdfs"], {value1:added,value2:skipped}));
   if(practice&&entries.length===1&&single)setOpened(single);
  }catch(e){setError(formatMessage(ko["pdf.stoppedAfterRestoringValue1Value2"], {value1:added,value2:storageError(e)}));}
  finally{await refresh();setBusy(false);}
 };
 const run=async action=>{setBusy(true);setError('');try{await action();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const storageContent=<><p><Translation id="pdf.storedOnlyInThisBrowserOnThisDeviceBrowserDataCleanupOr" /></p>{estimate&&<p><Translation id="pdf.siteStorage" />{(estimate.usage/1048576).toFixed(1)}<Translation id="pdf.mbQuota" />{(estimate.quota/1048576).toFixed(0)}<Translation id="originalUi.mb" /></p>}<button type="button" onClick={()=>void run(async()=>{const granted=await navigator.storage?.persist?.();setMessage(granted?ko["pdf.persistentStorageWasGranted"]:ko["pdf.theBrowserDidNotGrantPersistentStorageKeepABackup"]);})}><Translation id="pdf.requestPersistentStorage" /></button><button type="button" disabled={busy||!records.length} onClick={()=>void run(async()=>downloadBlob(await exportPdfLibrary(),'FRETIVA-PDF-library.fretiva-pdf'))}><Translation id="pdf.backUpPdfLibrary" /></button><button type="button" disabled={busy} onClick={()=>backup.current.click()}><Translation id="pdf.restorePdfBackup" /></button><p><Translation id="pdf.pdfBackupsIncludeOriginalsMarginCropsTextNotesBarsAndPracticeSettings" /></p></>;
 const storage=<LibraryStorage mobile={mobile} compact>{storageContent}<button type="button" disabled={busy} onClick={()=>practiceInput.current.click()}><Translation id="pdf.importPracticeFile"/></button></LibraryStorage>;
 const top=tablet?<TabletScoreHeader onHome={onExit}>{storage}</TabletScoreHeader>:<ScoreLibraryTabs>{storage}</ScoreLibraryTabs>;

 return <section id="scoreLibraryHome" ref={studio} data-library-view="lessons" className={`pdfStudio ${mobile?'pdfStudio--mobile':'pdfStudio--desktop'}`}>
  {mobile&&!tablet&&<LibraryHeader mobile={mobile} onMenu={onOpenMenu} onExit={onExit}/>}
  <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label={translateUi("pdf.choosePdfFile")} onChange={importPdf}/><input ref={backup} type="file" accept=".fretiva-pdf" hidden aria-label={translateUi("pdf.choosePdfBackup")} onChange={restore}/>
  <input ref={practiceInput} type="file" accept=".fretiva-pdf" hidden aria-label={translateUi("pdf.importPracticeFile")} onChange={e=>void restore(e,true)}/>
  {mobile&&top}
  {error&&<p role="alert" className="pdfError">{localizeUi(error)}</p>}{message&&!opened&&<p role="status">{localizeUi(message)}</p>}
  <div id="score-library-panel" role="region" aria-label={translateUi("score.practiceRoom")}>
  {restoring?<p role="status"><Translation id="pdf.preparingPracticePiece" /></p>:<Suspense fallback={<p><Translation id="pdf.preparingPracticePiece" /></p>}><Lessons desktopStorage={!mobile?storage:undefined} activePdf={opened?.record} onLeavePdf={after=>{if(opened)void pdfClose.current?.(after);else after();}} pdfContent={opened?(roomModel,desktopPicker)=><Suspense fallback={<p role="status"><Translation id="pdf.preparingPracticePiece" /></p>}><PdfPractice key={opened.record.id} embedded roomModel={roomModel} desktopPicker={desktopPicker} desktopStorage={!mobile?storage:undefined} closeController={pdfClose} initial={opened.record} blob={opened.blob} initialEditing={opened.edit} mobile={mobile} onInfo={(record,onSaved)=>setPending({record,onSaved})} onClose={()=>{setOpened(null);void refresh();}}/></Suspense>:null} importBusy={busy} pdfScores={records} onSelectPdf={record=>{if(opened)void pdfClose.current?.(()=>void open(record));else void open(record);}} onManagePdf={async(action,record,title)=>{if(action==='rename')await patchPdf(record.id,{title});else await deletePdf(record.id);await refresh();}} onSelectionChange={rememberLesson} initialId={lessonId} initialSavedId={lessonSavedId} {...{mobile,onOpenMenu,onExit}} onImportPdf={importScorePdf}/></Suspense>}

  </div>
  {pending&&<MetadataDialog key={pending.record.id} record={pending.record} {...{busy,error}} onSave={save} onClose={()=>setPending(null)}/>}
  {transfer&&<Confirm text={translateUi("pdf.replacePracticeConfirm",{title:transfer.record.title})} busy={busy} onCancel={()=>setTransfer(null)} onConfirm={()=>void run(async()=>{await savePdf(transfer.record,transfer.pdfBlob);setOpened({record:transfer.record,blob:transfer.pdfBlob});setTransfer(null);await refresh();})}/>}
 </section>;
}
function Confirm({text,onConfirm,onCancel,busy}) {
  useLanguage();const ref=useRef(null);useEffect(()=>{ref.current.showModal();},[]);return <dialog className="pdfDialog" ref={ref} aria-label={translateUi("common.confirm")} onCancel={e=>{if(busy)e.preventDefault();else onCancel();}}><p>{text}</p><footer><button type="button" disabled={busy} onClick={onCancel}><Translation id="common.cancel" /></button><button type="button" disabled={busy} onClick={onConfirm}><Translation id="common.confirm" /></button></footer></dialog>;}
