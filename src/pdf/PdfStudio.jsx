import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { formatMessage } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import '../pdf/scoreWorkspaceTheme.css';
import {FilePlus2,Plus} from 'lucide-react';
import {LibraryHeader,LibraryStorage} from './LibraryChrome.jsx';
import './libraryDesign.css';
import {normalizePdfBarEntry} from './pdfBarRows.js';
import ScoreLibraryTabs from './ScoreLibraryTabs.jsx';
import {normalizePageEdits} from './pdfAnnotations.js';
import ScoreFolderList from './ScoreFolderList.jsx';
import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {listPdfs,getPdf,findPdf,savePdf,patchPdf,deletePdf,fingerprintPdf,storageError,downloadBlob,exportPdfLibrary,readBackup} from './pdfLibrary.js';
import {inspectPdf} from './pdfRenderer.js';
import {loadLibrary,saveLibraryDocument,renameLibraryDocument,deleteLibraryDocument,markLibraryPracticed} from '../etudes/scoreLibrary.js';
import {createBlankDocument} from '../etudes/scoreModel.js';
import {ETUDES} from '../etudes/catalog.js';
import './pdfStudio.css';
import './scoreFileBrowser.css';
import './scoreLibraryTheme.css';
import './scoreLibraryMobile.css';
const preloadPdfPractice=()=>import('./PdfPractice.jsx');
const PdfPractice=lazy(preloadPdfPractice);
const ScoreEditor=lazy(()=>import('../etudes/ScoreEditor.jsx'));
const EditablePractice=lazy(()=>import('./EditablePractice.jsx'));
const Lessons=lazy(()=>import('../etudes/EtudeStudio.jsx'));
function readEditableLibrary(){try{return loadLibrary(localStorage,ETUDES);}catch{return {records:{},errors:[ko["pdf.editableScoreStorageIsUnavailable"]]};}}
const meters=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];
export function pdfMetadata(source={}) {
 const count=Math.max(1,Math.floor(Number(source.pageCount)||1));
 return {viewMode:source.viewMode==='continuous'?'continuous':'single',pageEdits:normalizePageEdits(source.pageEdits,count),title:String(source.title||ko["pdf.newPdfScore"]).slice(0,200),artist:String(source.artist??'').slice(0,200),bpm:Math.max(30,Math.min(240,Number(source.bpm)||80)),meter:meters.includes(source.meter?.join('/'))?source.meter:[4,4],difficulty:[ko["pdf.unspecified"],ko["etudes.beginner"],ko["etudes.intermediate"],ko["etudes.advanced"]].includes(source.difficulty)?source.difficulty:ko["pdf.unspecified"],tags:Array.isArray(source.tags)?source.tags.map(String).slice(0,30):[],memo:String(source.memo??'').slice(0,5000),pageCount:count,lastPage:Math.max(1,Math.min(count,Number(source.lastPage)||1)),zoom:['fit','page'].includes(source.zoom)?source.zoom:Math.max(25,Math.min(250,Number(source.zoom)||100)),mobileZoom:source.mobileZoom==null?'fit':['fit','page'].includes(source.mobileZoom)?source.mobileZoom:Math.max(25,Math.min(250,Number(source.mobileZoom)||100)),barMap:(Array.isArray(source.barMap)?source.barMap:[]).filter(b=>Number.isInteger(b.number)&&b.number>0&&Number.isInteger(b.page)&&b.page>0&&b.page<=count&&[b.x,b.y,b.width,b.height,b.beats].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.001&&b.y+b.height<=1.001&&b.beats>=1&&b.beats<=32).slice(0,5000).map(normalizePdfBarEntry),practiceOrder:Array.isArray(source.practiceOrder)?source.practiceOrder.filter(Number.isInteger).slice(0,1000):[],countIn:Boolean(source.countIn),audible:source.audible!==false,highlight:Boolean(source.highlight),loop:Boolean(source.loop),loopStart:Math.max(1,Number(source.loopStart)||1),loopEnd:Math.max(1,Number(source.loopEnd)||1)};
}
function MetadataDialog({record,onSave,onClose,busy,error}) {
  useLanguage();
 const ref=useRef(null),[draft,setDraft]=useState(record);
 useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
 const field=(key,value)=>setDraft(d=>({...d,[key]:value}));
 return <dialog ref={ref} className="pdfDialog" aria-label={translateUi("pdf.pdfScoreDetails")} onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><form onSubmit={e=>{e.preventDefault();onSave(draft);}}><h2><Translation id="pdf.pdfScoreDetails" /></h2>{error&&<p role="alert">{localizeUi(error)}</p>}<label><Translation id="etudes.scoreTitle" /><input autoFocus required maxLength="200" value={draft.title} onChange={e=>field('title',e.target.value)}/></label><label><Translation id="pdf.composerArtist" /><input maxLength="200" value={draft.artist} onChange={e=>field('artist',e.target.value)}/></label><div className="pdfPair"><label><Translation id="originalUi.bpm" /><input type="number" min="30" max="240" required value={draft.bpm} onChange={e=>field('bpm',e.target.value)}/></label><label><Translation id="app.meter" /><select value={draft.meter.join('/')} onChange={e=>field('meter',e.target.value.split('/').map(Number))}>{meters.map(m=><option key={m}>{m}</option>)}</select></label></div><label><Translation id="app.difficulty" /><select value={draft.difficulty} onChange={e=>field('difficulty',e.target.value)}>{[ko["pdf.unspecified"],ko["etudes.beginner"],ko["etudes.intermediate"],ko["etudes.advanced"]].map(v=><option key={v}>{v}</option>)}</select></label><label><Translation id="pdf.practiceTagsCommaSeparated" /><input value={draft.tags.join(',')} onChange={e=>field('tags',e.target.value.split(','))}/></label><label><Translation id="pdf.notes" /><textarea maxLength="5000" value={draft.memo} onChange={e=>field('memo',e.target.value)}/></label><p><Translation id="pdf.theOriginalPdfAndSettingsAreStoredInThisBrowserOnThis" /></p><footer><button type="button" disabled={busy} onClick={onClose}><Translation id="common.cancel" /></button><button type="submit" className="pdfPrimary" disabled={busy}>{busy?translateUi("pdf.saving"):translateUi("pdf.saveToDevice")}</button></footer></form></dialog>;
}
export default function PdfStudio({mobile,onOpenMenu,onExit}) {
  useLanguage();
 const [lessonSavedId,setLessonSavedId]=useState('');
 const [mode,setMode]=useState('lessons'),[records,setRecords]=useState([]),[library,setLibrary]=useState(()=>readEditableLibrary()),[editing,setEditing]=useState(null),[opened,setOpened]=useState(null),[pending,setPending]=useState(null),[remove,setRemove]=useState(null),[duplicate,setDuplicate]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[search,setSearch]=useState(''),[sort,setSort]=useState('practice'),[estimate,setEstimate]=useState(null);
 const [libraryFilter,setLibraryFilter]=useState('all'),[folderId,setFolderId]=useState(null),[scoreOpened,setScoreOpened]=useState(null),[rename,setRename]=useState(null);
 const studio=useRef(null),firstView=useRef(true),pdfClose=useRef(null),input=useRef(null),backup=useRef(null);
 const refresh=async()=>{try{setRecords(await listPdfs());setEstimate(await navigator.storage?.estimate?.());}catch(e){setError(storageError(e));}setLibrary(readEditableLibrary());};
 useEffect(()=>{void refresh();},[]);
 useLayoutEffect(()=>{if(firstView.current){firstView.current=false;return;}if(mobile)return;studio.current.querySelector('.scoreTabsAnchor,.libraryTabAnchor')?.scrollIntoView({block:'start'});},[mode,opened?.record.id,scoreOpened?.id]);
 const open=async (record,edit=false)=>{void preloadPdfPractice();setBusy(true);setError('');try{const blob=await getPdf(record.id);if(!blob)throw Error(ko["pdf.noOriginalPdfIsStoredImportABackupOrTheOriginalAgain"]);setOpened({record,blob,edit});}catch(e){setError(e.message);}finally{setBusy(false);}};
 const importPdfFile=async (blob,openAfterSave=false)=>{if(!blob){input.current.click();return;}setBusy(true);setError('');setMessage(ko["pdf.checkingPdfAndPreparingTheFirstPage"]);try{const fingerprint=await fingerprintPdf(blob),existing=await findPdf(fingerprint);if(existing){setDuplicate(existing);setMessage(ko["pdf.thisPdfIsAlreadySaved"]);return;}const info=await inspectPdf(blob);const record={...pdfMetadata({title:blob.name.replace(/\.pdf$/i,''),...info,zoom:'fit'}),...info,id:crypto.randomUUID(),fingerprint,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastPracticedAt:null};setPending({record,blob,openAfterSave});setMessage(ko["pdf.reviewTheDetailsThenSave"]);}catch(e){setError(e.name==='PasswordException'?ko["pdf.chooseAnUnlockedPdfCopy"]:e.message);}finally{setBusy(false);}};
 const importPdf=e=>{const blob=e.target.files?.[0];e.target.value='';if(blob)void importPdfFile(blob);};
 const importScorePdf=blob=>{setMode('pdf');setScoreOpened(null);void importPdfFile(blob,true);};
 const save=async draft=>{setBusy(true);setError('');try{const record={...draft,...pdfMetadata(draft),updatedAt:new Date().toISOString()};if(pending.blob)await savePdf(record,pending.blob);else await patchPdf(record.id,record);pending.onSaved?.(record);if(pending.openAfterSave&&pending.blob)setOpened({record,blob:pending.blob});setPending(null);setMessage(ko["pdf.pdfScoreSavedToDevice"]);await refresh();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const saveScore=document=>{try{const result=saveLibraryDocument(localStorage,document,ETUDES);if(result.saved){setLibrary(readEditableLibrary());if(scoreOpened?.id===document.id)setScoreOpened(document);}return result;}catch(e){return {saved:false,errors:[e.message]};}};
 const restore=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');let added=0,skipped=0;try{for(const {record:old,pdfBlob} of await readBackup(file)){const fingerprint=await fingerprintPdf(pdfBlob);if(await findPdf(fingerprint)){skipped++;continue;}const info=await inspectPdf(pdfBlob),record={...pdfMetadata({...old,pageCount:info.pageCount}),...info,id:crypto.randomUUID(),fingerprint,createdAt:Number.isFinite(Date.parse(old.createdAt))?old.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastPracticedAt:Number.isFinite(Date.parse(old.lastPracticedAt))?old.lastPracticedAt:null};await savePdf(record,pdfBlob);added++;}setMessage(formatMessage(ko["pdf.restoredValue1KeptValue2ExistingMatchingPdfs"], { value1: added, value2: skipped }));}catch(e){setError(formatMessage(ko["pdf.stoppedAfterRestoringValue1Value2"], { value1: added, value2: storageError(e) }));}finally{await refresh();setBusy(false);}};
 const items=[...records.map(r=>({id:r.id,type:'pdf',title:r.title,count:r.pageCount,bpm:r.bpm,position:r.lastPracticedAt?formatMessage(ko["pdf.pageValue1"], { value1: r.lastPage }):null,practice:r.lastPracticedAt,added:r.createdAt,search:`${r.title} ${r.artist??''} ${(r.tags??[]).join(' ')}`,record:r})),...Object.values(library.records).map(r=>({id:r.document.id,type:'score',title:r.document.title,count:r.document.measures?.length??0,bpm:r.document.bpm,practice:r.lastPracticedAt,added:r.createdAt??r.updatedAt,search:r.document.title,unreadable:r.status==='unreadable',record:r}))];
 const filtered=items.filter(r=>r.search.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'ko'):sort==='bpm'?(a.bpm??0)-(b.bpm??0):sort==='added'?String(b.added??'').localeCompare(String(a.added??'')):String(b.practice??'').localeCompare(String(a.practice??''))||String(b.added??'').localeCompare(String(a.added??'')));
 const openScore=item=>{const result=markLibraryPracticed(localStorage,item.id,ETUDES);if(!result.saved)setError(result.errors.join(' '));setScoreOpened(null);setOpened(null);setLessonSavedId(item.id);setMode('lessons');setMessage('');};
 const renameItem=async title=>{setBusy(true);setError('');try{if(rename.type==='pdf')await patchPdf(rename.id,{title});else{const r=renameLibraryDocument(localStorage,rename.id,title,ETUDES);if(!r.saved)throw Error(r.errors.join(' '));}setRename(null);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const switchTab=next=>{const apply=()=>{setMode(next);setOpened(null);setScoreOpened(null);setMessage('');void refresh();};if(opened){void pdfClose.current?.(apply);return;}apply();};

 const run=async action=>{setBusy(true);setError('');try{await action();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const storageContent=<><p><Translation id="pdf.storedOnlyInThisBrowserOnThisDeviceBrowserDataCleanupOr" /></p>{estimate&&<p><Translation id="pdf.siteStorage" />{(estimate.usage/1048576).toFixed(1)}<Translation id="pdf.mbQuota" />{(estimate.quota/1048576).toFixed(0)}<Translation id="originalUi.mb" /></p>}<button type="button" onClick={()=>void run(async()=>{const granted=await navigator.storage?.persist?.();setMessage(granted?ko["pdf.persistentStorageWasGranted"]:ko["pdf.theBrowserDidNotGrantPersistentStorageKeepABackup"]);})}><Translation id="pdf.requestPersistentStorage" /></button><button type="button" disabled={busy||!records.length} onClick={()=>void run(async()=>downloadBlob(await exportPdfLibrary(),'FRETIVA-PDF-library.fretiva-pdf'))}><Translation id="pdf.backUpPdfLibrary" /></button><button type="button" disabled={busy} onClick={()=>backup.current.click()}><Translation id="pdf.restorePdfBackup" /></button><p><Translation id="pdf.pdfBackupsIncludeOriginalsMarginCropsTextNotesBarsAndPracticeSettings" /></p></>;
 const top=<ScoreLibraryTabs library={!opened} mode={mode} onChange={switchTab}/>;
 const additions=<div className="libraryActions"><button type="button" disabled={busy} onClick={()=>input.current.click()}><FilePlus2 size={20}/><Translation id="app.importPdf" /></button><button type="button" onClick={()=>setEditing(createBlankDocument())}><Plus size={20}/><Translation id="app.createScore" /></button></div>;

 return <section id={!opened?'scoreLibraryHome':undefined} ref={studio} data-library-view={!opened&&!scoreOpened?mode:undefined} className={`pdfStudio ${mobile?'pdfStudio--mobile':'pdfStudio--desktop'}`}>
  {!opened&&<LibraryHeader mobile={mobile} onMenu={onOpenMenu} onExit={onExit}/>}
  <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label={translateUi("pdf.choosePdfFile")} onChange={importPdf}/><input ref={backup} type="file" accept=".fretiva-pdf" hidden aria-label={translateUi("pdf.choosePdfBackup")} onChange={restore}/>
  {(!mobile||!opened)&&top}
  {error&&<p role="alert" className="pdfError">{localizeUi(error)}</p>}{message&&!opened&&<p role="status">{localizeUi(message)}</p>}
  <div id="score-library-panel" role="tabpanel" aria-labelledby={`score-tab-${mode}`}>
  {opened?<Suspense fallback={<div className="pdfOpeningPreview"><header><strong>{opened.record.title}</strong><span>{opened.record.lastPage} / {opened.record.pageCount}</span></header>{opened.record.thumbnail&&<img src={opened.record.thumbnail} alt={translateUi("pdf.savedFirstPagePreview")}/>}</div>}><PdfPractice key={opened.record.id} closeController={pdfClose} initial={opened.record} blob={opened.blob} initialEditing={opened.edit} mobile={mobile} onInfo={(record,onSaved)=>setPending({record,onSaved})} onClose={()=>{setOpened(null);void refresh();}}/></Suspense>:scoreOpened?<Suspense fallback={<p><Translation id="etudes.preparingScore" /></p>}><EditablePractice key={scoreOpened.id} document={scoreOpened} savedScores={items.filter(item=>item.type==='score'&&!item.unreadable)} onSelectScore={id=>{const item=items.find(item=>item.type==='score'&&item.id===id&&!item.unreadable);if(item)openScore(item);}} mobile={mobile} editing={Boolean(editing)||Boolean(remove)} onDelete={()=>setRemove({id:scoreOpened.id,type:'score',title:scoreOpened.title})} onCreate={()=>setEditing(createBlankDocument())} onEdit={()=>setEditing(scoreOpened)} onClose={()=>{setScoreOpened(null);void refresh();}}/></Suspense>:mode==='lessons'?<>
   <Suspense fallback={<p><Translation id="pdf.preparingPracticePiece" /></p>}><Lessons initialSavedId={lessonSavedId} {...{mobile,onOpenMenu,onExit}} onImportPdf={importScorePdf}/></Suspense>
  </>:<>
   {additions}
   {library.errors.map(e=><p role="alert" key={e}>{localizeUi(e)}</p>)}
   <ScoreFolderList sort={sort} onSort={setSort} onSearch={setSearch} filter={libraryFilter} onFilterChange={setLibraryFilter} items={filtered} allItems={items} search={search} mobile={mobile} busy={busy} folderId={folderId} onFolderChange={setFolderId} onOpen={item=>item.type==='pdf'?void open(item.record):openScore(item)} onRename={setRename} onDelete={setRemove}/>
   <LibraryStorage mobile={mobile}>{storageContent}</LibraryStorage>
  </>}
  </div>
  {pending&&<MetadataDialog key={pending.record.id} record={pending.record} {...{busy,error}} onSave={save} onClose={()=>setPending(null)}/>}
  {rename&&<RenameDialog title={rename.title} busy={busy} error={error} onSave={renameItem} onClose={()=>setRename(null)}/>}
  {remove&&<Confirm text={localizeUi(translateUi("pdf.deleteValue1Value2FromThisDevice", { value1: remove.title, value2: remove.type==='pdf'?ko["pdf.originalPdfAndSettings"]:ko["pdf.editableScore"] }))} busy={busy} onCancel={()=>setRemove(null)} onConfirm={()=>void run(async()=>{if(remove.type==='pdf')await deletePdf(remove.id);else{const result=deleteLibraryDocument(localStorage,remove.id,ETUDES);if(!result.saved)throw Error(result.errors.join(' '));}if(scoreOpened?.id===remove.id)setScoreOpened(null);setRemove(null);setMessage(ko["pdf.scoreDeleted"]);await refresh();})}/>}
  {duplicate&&<Confirm text={translateUi("pdf.thePdfValue1AlreadyExistsOpenTheExistingScore", { value1: duplicate.title })} onCancel={()=>setDuplicate(null)} onConfirm={()=>{void open(duplicate);setDuplicate(null);}}/>}
  {editing&&<Suspense fallback={<p><Translation id="pdf.preparingEditor" /></p>}><ScoreEditor compactImport key={editing.id} document={editing} mobile={mobile} onClose={()=>{setEditing(null);void refresh();}} onSave={saveScore} onImportPdf={importScorePdf}/></Suspense>}
 </section>;
}
function Confirm({text,onConfirm,onCancel,busy}) {
  useLanguage();const ref=useRef(null);useEffect(()=>{ref.current.showModal();},[]);return <dialog className="pdfDialog" ref={ref} aria-label={translateUi("common.confirm")} onCancel={e=>{if(busy)e.preventDefault();else onCancel();}}><p>{text}</p><footer><button type="button" disabled={busy} onClick={onCancel}><Translation id="common.cancel" /></button><button type="button" disabled={busy} onClick={onConfirm}><Translation id="common.confirm" /></button></footer></dialog>;}

function RenameDialog({title,busy,error,onSave,onClose}){
  useLanguage();
 const ref=useRef(null),[value,setValue]=useState(title);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} className="pdfDialog" aria-label={translateUi("pdf.renameScore")} onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><form onSubmit={e=>{e.preventDefault();if(value.trim())void onSave(value.trim());}}><h2><Translation id="audioStudio.rename" /></h2><label><Translation id="app.title" /><input autoFocus required maxLength="200" value={value} onChange={e=>setValue(e.target.value)}/></label>{error&&<p role="alert">{localizeUi(error)}</p>}<footer><button type="button" disabled={busy} onClick={onClose}><Translation id="common.cancel" /></button><button type="submit" disabled={busy||!value.trim()}><Translation id="common.save" /></button></footer></form></dialog>;
}

import './librarySafeArea.css';
