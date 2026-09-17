import {FilePlus2,Plus} from 'lucide-react';
import {LibraryHeader,LibraryStorage} from './LibraryChrome.jsx';
import './libraryDesign.css';
import {normalizePdfBarEntry} from './pdfBarRows.js';
import {MobileLibraryHeader} from './MobileLibraryChrome.jsx';
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
function readEditableLibrary(){try{return loadLibrary(localStorage,ETUDES);}catch{return {records:{},errors:['편집 악보 저장소를 사용할 수 없습니다.']};}}
const meters=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];
export function pdfMetadata(source={}) {
 const count=Math.max(1,Math.floor(Number(source.pageCount)||1));
 return {viewMode:source.viewMode==='continuous'?'continuous':'single',pageEdits:normalizePageEdits(source.pageEdits,count),title:String(source.title||'새 PDF 악보').slice(0,200),artist:String(source.artist??'').slice(0,200),bpm:Math.max(30,Math.min(240,Number(source.bpm)||80)),meter:meters.includes(source.meter?.join('/'))?source.meter:[4,4],difficulty:['미지정','초급','중급','고급'].includes(source.difficulty)?source.difficulty:'미지정',tags:Array.isArray(source.tags)?source.tags.map(String).slice(0,30):[],memo:String(source.memo??'').slice(0,5000),pageCount:count,lastPage:Math.max(1,Math.min(count,Number(source.lastPage)||1)),zoom:['fit','page'].includes(source.zoom)?source.zoom:Math.max(25,Math.min(250,Number(source.zoom)||100)),mobileZoom:source.mobileZoom==null?'fit':['fit','page'].includes(source.mobileZoom)?source.mobileZoom:Math.max(25,Math.min(250,Number(source.mobileZoom)||100)),barMap:(Array.isArray(source.barMap)?source.barMap:[]).filter(b=>Number.isInteger(b.number)&&b.number>0&&Number.isInteger(b.page)&&b.page>0&&b.page<=count&&[b.x,b.y,b.width,b.height,b.beats].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.001&&b.y+b.height<=1.001&&b.beats>=1&&b.beats<=32).slice(0,5000).map(normalizePdfBarEntry),practiceOrder:Array.isArray(source.practiceOrder)?source.practiceOrder.filter(Number.isInteger).slice(0,1000):[],countIn:Boolean(source.countIn),audible:source.audible!==false,highlight:Boolean(source.highlight),loop:Boolean(source.loop),loopStart:Math.max(1,Number(source.loopStart)||1),loopEnd:Math.max(1,Number(source.loopEnd)||1)};
}
function MetadataDialog({record,onSave,onClose,busy,error}) {
 const ref=useRef(null),[draft,setDraft]=useState(record);
 useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
 const field=(key,value)=>setDraft(d=>({...d,[key]:value}));
 return <dialog ref={ref} className="pdfDialog" aria-label="PDF 악보 정보" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><form onSubmit={e=>{e.preventDefault();onSave(draft);}}><h2>PDF 악보 정보</h2>{error&&<p role="alert">{error}</p>}<label>악보 제목<input autoFocus required maxLength="200" value={draft.title} onChange={e=>field('title',e.target.value)}/></label><label>작곡가 / 아티스트<input maxLength="200" value={draft.artist} onChange={e=>field('artist',e.target.value)}/></label><div className="pdfPair"><label>BPM<input type="number" min="30" max="240" required value={draft.bpm} onChange={e=>field('bpm',e.target.value)}/></label><label>박자<select value={draft.meter.join('/')} onChange={e=>field('meter',e.target.value.split('/').map(Number))}>{meters.map(m=><option key={m}>{m}</option>)}</select></label></div><label>난이도<select value={draft.difficulty} onChange={e=>field('difficulty',e.target.value)}>{['미지정','초급','중급','고급'].map(v=><option key={v}>{v}</option>)}</select></label><label>연습 태그 · 쉼표로 구분<input value={draft.tags.join(',')} onChange={e=>field('tags',e.target.value.split(','))}/></label><label>메모<textarea maxLength="5000" value={draft.memo} onChange={e=>field('memo',e.target.value)}/></label><p>PDF 원본과 설정을 현재 브라우저의 기기에 저장합니다. 서버로 업로드하지 않습니다.</p><footer><button type="button" disabled={busy} onClick={onClose}>취소</button><button type="submit" className="pdfPrimary" disabled={busy}>{busy?'저장 중…':'기기에 저장'}</button></footer></form></dialog>;
}
export default function PdfStudio({mobile,onOpenMenu,onExit}) {
 const [mode,setMode]=useState('pdf'),[records,setRecords]=useState([]),[library,setLibrary]=useState(()=>readEditableLibrary()),[editing,setEditing]=useState(null),[opened,setOpened]=useState(null),[pending,setPending]=useState(null),[remove,setRemove]=useState(null),[duplicate,setDuplicate]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[search,setSearch]=useState(''),[sort,setSort]=useState('practice'),[estimate,setEstimate]=useState(null);
 const [libraryFilter,setLibraryFilter]=useState('all'),[folderId,setFolderId]=useState(null),[scoreOpened,setScoreOpened]=useState(null),[rename,setRename]=useState(null);
 const studio=useRef(null),firstView=useRef(true),pdfClose=useRef(null),input=useRef(null),backup=useRef(null);
 const refresh=async()=>{try{setRecords(await listPdfs());setEstimate(await navigator.storage?.estimate?.());}catch(e){setError(storageError(e));}setLibrary(readEditableLibrary());};
 useEffect(()=>{void refresh();},[]);
 useLayoutEffect(()=>{if(firstView.current){firstView.current=false;return;}if(mobile)return;studio.current.querySelector('.scoreTabsAnchor,.libraryTabAnchor')?.scrollIntoView({block:'start'});},[mode,opened?.record.id,scoreOpened?.id]);
 const open=async (record,edit=false)=>{void preloadPdfPractice();setBusy(true);setError('');try{const blob=await getPdf(record.id);if(!blob)throw Error('저장된 원본 PDF가 없습니다. 백업 또는 원본을 다시 불러오세요.');setOpened({record,blob,edit});}catch(e){setError(e.message);}finally{setBusy(false);}};
 const importPdfFile=async (blob,openAfterSave=false)=>{if(!blob){input.current.click();return;}setBusy(true);setError('');setMessage('PDF 확인 및 첫 페이지 준비 중…');try{const fingerprint=await fingerprintPdf(blob),existing=await findPdf(fingerprint);if(existing){setDuplicate(existing);setMessage('동일한 PDF가 이미 저장되어 있습니다.');return;}const info=await inspectPdf(blob);const record={...pdfMetadata({title:blob.name.replace(/\.pdf$/i,''),...info,zoom:'fit'}),...info,id:crypto.randomUUID(),fingerprint,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastPracticedAt:null};setPending({record,blob,openAfterSave});setMessage('정보를 확인한 후 저장하세요.');}catch(e){setError(e.name==='PasswordException'?'암호를 해제한 PDF 사본을 선택하세요.':e.message);}finally{setBusy(false);}};
 const importPdf=e=>{const blob=e.target.files?.[0];e.target.value='';if(blob)void importPdfFile(blob);};
 const importScorePdf=blob=>{setMode('pdf');setScoreOpened(null);void importPdfFile(blob,true);};
 const save=async draft=>{setBusy(true);setError('');try{const record={...draft,...pdfMetadata(draft),updatedAt:new Date().toISOString()};if(pending.blob)await savePdf(record,pending.blob);else await patchPdf(record.id,record);pending.onSaved?.(record);if(pending.openAfterSave&&pending.blob)setOpened({record,blob:pending.blob});setPending(null);setMessage('PDF 악보를 기기에 저장했습니다.');await refresh();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const saveScore=document=>{try{const result=saveLibraryDocument(localStorage,document,ETUDES);if(result.saved){setLibrary(readEditableLibrary());if(scoreOpened?.id===document.id)setScoreOpened(document);}return result;}catch(e){return {saved:false,errors:[e.message]};}};
 const restore=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');let added=0,skipped=0;try{for(const {record:old,pdfBlob} of await readBackup(file)){const fingerprint=await fingerprintPdf(pdfBlob);if(await findPdf(fingerprint)){skipped++;continue;}const info=await inspectPdf(pdfBlob),record={...pdfMetadata({...old,pageCount:info.pageCount}),...info,id:crypto.randomUUID(),fingerprint,createdAt:Number.isFinite(Date.parse(old.createdAt))?old.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastPracticedAt:Number.isFinite(Date.parse(old.lastPracticedAt))?old.lastPracticedAt:null};await savePdf(record,pdfBlob);added++;}setMessage(`${added}개 복원 · 기존과 같은 PDF ${skipped}개 유지`);}catch(e){setError(`${added}개 복원 후 중단. ${storageError(e)}`);}finally{await refresh();setBusy(false);}};
 const items=[...records.map(r=>({id:r.id,type:'pdf',title:r.title,count:r.pageCount,bpm:r.bpm,position:r.lastPracticedAt?`${r.lastPage}페이지`:null,practice:r.lastPracticedAt,added:r.createdAt,search:`${r.title} ${r.artist??''} ${(r.tags??[]).join(' ')}`,record:r})),...Object.values(library.records).map(r=>({id:r.document.id,type:'score',title:r.document.title,count:r.document.measures?.length??0,bpm:r.document.bpm,practice:r.lastPracticedAt,added:r.createdAt??r.updatedAt,search:r.document.title,unreadable:r.status==='unreadable',record:r}))];
 const filtered=items.filter(r=>r.search.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'ko'):sort==='bpm'?(a.bpm??0)-(b.bpm??0):sort==='added'?String(b.added??'').localeCompare(String(a.added??'')):String(b.practice??'').localeCompare(String(a.practice??''))||String(b.added??'').localeCompare(String(a.added??'')));
 const openScore=item=>{const result=markLibraryPracticed(localStorage,item.id,ETUDES);if(!result.saved)setError(result.errors.join(' '));setScoreOpened(item.record.document);};
 const renameItem=async title=>{setBusy(true);setError('');try{if(rename.type==='pdf')await patchPdf(rename.id,{title});else{const r=renameLibraryDocument(localStorage,rename.id,title,ETUDES);if(!r.saved)throw Error(r.errors.join(' '));}setRename(null);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const switchTab=next=>{const apply=()=>{setMode(next);setOpened(null);setScoreOpened(null);setMessage('');void refresh();};if(opened){void pdfClose.current?.(apply);return;}apply();};

 const run=async action=>{setBusy(true);setError('');try{await action();}catch(e){setError(storageError(e));}finally{setBusy(false);}};
 const storageContent=<><p>현재 브라우저의 기기에만 저장됩니다. 브라우저 데이터 삭제·기기 변경 시 사라질 수 있으므로 원본과 백업을 별도로 보관하세요.</p>{estimate&&<p>이 사이트 사용량 {(estimate.usage/1048576).toFixed(1)} MB / 허용량 {(estimate.quota/1048576).toFixed(0)} MB</p>}<button type="button" onClick={()=>void run(async()=>{const granted=await navigator.storage?.persist?.();setMessage(granted?'기기 저장소 유지 요청이 승인되었습니다.':'브라우저가 저장소 유지 요청을 승인하지 않았습니다. 백업을 보관하세요.');})}>저장소 유지 요청</button><button type="button" disabled={busy||!records.length} onClick={()=>void run(async()=>downloadBlob(await exportPdfLibrary(),'FRETIVA-PDF-library.fretiva-pdf'))}>PDF 보관함 백업</button><button type="button" disabled={busy} onClick={()=>backup.current.click()}>PDF 백업 복원</button><p>PDF 백업에는 원본·여백 자르기·텍스트 메모·마디 및 연습 설정이 포함됩니다. 편집 악보는 편집기의 파일 내보내기로 보관합니다.</p></>;
 const top=<ScoreLibraryTabs library={!opened&&!scoreOpened} mode={mode} onChange={switchTab}/>;
 const additions=<div className="libraryActions"><button type="button" disabled={busy} onClick={()=>input.current.click()}><FilePlus2 size={20}/>PDF 불러오기</button><button type="button" onClick={()=>setEditing(createBlankDocument())}><Plus size={20}/>악보 만들기</button></div>;

 return <section id={!opened&&!scoreOpened?'scoreLibraryHome':undefined} ref={studio} data-library-view={!opened&&!scoreOpened?mode:undefined} className={`pdfStudio ${mobile?'pdfStudio--mobile':'pdfStudio--desktop'}`}>
  {!opened&&!scoreOpened?<LibraryHeader onMenu={onOpenMenu} onExit={onExit}/>:mobile&&!opened&&<MobileLibraryHeader onMenu={onOpenMenu} onExit={onExit}/>}
  <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label="PDF 파일 선택" onChange={importPdf}/><input ref={backup} type="file" accept=".fretiva-pdf" hidden aria-label="PDF 백업 선택" onChange={restore}/>
  {(!mobile||!opened)&&top}
  {error&&<p role="alert" className="pdfError">{error}</p>}{message&&!opened&&<p role="status">{message}</p>}
  <div id="score-library-panel" role="tabpanel" aria-labelledby={`score-tab-${mode}`}>
  {opened?<Suspense fallback={<div className="pdfOpeningPreview"><header><strong>{opened.record.title}</strong><span>{opened.record.lastPage} / {opened.record.pageCount}</span></header>{opened.record.thumbnail&&<img src={opened.record.thumbnail} alt="저장된 첫 페이지 미리보기"/>}</div>}><PdfPractice key={opened.record.id} closeController={pdfClose} initial={opened.record} blob={opened.blob} initialEditing={opened.edit} mobile={mobile} onInfo={(record,onSaved)=>setPending({record,onSaved})} onClose={()=>{setOpened(null);void refresh();}}/></Suspense>:scoreOpened?<Suspense fallback={<p>악보 준비 중…</p>}><EditablePractice key={scoreOpened.id} document={scoreOpened} mobile={mobile} editing={Boolean(editing)||Boolean(remove)} onDelete={()=>setRemove({id:scoreOpened.id,type:'score',title:scoreOpened.title})} onEdit={()=>setEditing(scoreOpened)} onClose={()=>{setScoreOpened(null);void refresh();}}/></Suspense>:mode==='lessons'?<>
   <Suspense fallback={<p>연습곡 준비 중…</p>}><Lessons {...{mobile,onOpenMenu,onExit}} onImportPdf={importScorePdf}/></Suspense>
  </>:<>
   {additions}
   {library.errors.map(e=><p role="alert" key={e}>{e}</p>)}
   <ScoreFolderList sort={sort} onSort={setSort} onSearch={setSearch} filter={libraryFilter} onFilterChange={setLibraryFilter} items={filtered} allItems={items} search={search} mobile={mobile} busy={busy} folderId={folderId} onFolderChange={setFolderId} onOpen={item=>item.type==='pdf'?void open(item.record):openScore(item)} onRename={setRename} onDelete={setRemove}/>
   <LibraryStorage mobile={mobile}>{storageContent}</LibraryStorage>
  </>}
  </div>
  {pending&&<MetadataDialog key={pending.record.id} record={pending.record} {...{busy,error}} onSave={save} onClose={()=>setPending(null)}/>}
  {rename&&<RenameDialog title={rename.title} busy={busy} error={error} onSave={renameItem} onClose={()=>setRename(null)}/>}
  {remove&&<Confirm text={`‘${remove.title}’${remove.type==='pdf'?' PDF 원본과 연결된 설정':' 편집 악보'}을 이 기기에서 삭제할까요?`} busy={busy} onCancel={()=>setRemove(null)} onConfirm={()=>void run(async()=>{if(remove.type==='pdf')await deletePdf(remove.id);else{const result=deleteLibraryDocument(localStorage,remove.id,ETUDES);if(!result.saved)throw Error(result.errors.join(' '));}if(scoreOpened?.id===remove.id)setScoreOpened(null);setRemove(null);setMessage('악보를 삭제했습니다.');await refresh();})}/>}
  {duplicate&&<Confirm text={`같은 PDF ‘${duplicate.title}’이 이미 있습니다. 기존 악보를 열까요?`} onCancel={()=>setDuplicate(null)} onConfirm={()=>{void open(duplicate);setDuplicate(null);}}/>}
  {editing&&<Suspense fallback={<p>기존 편집기 준비 중…</p>}><ScoreEditor compactImport key={editing.id} document={editing} mobile={mobile} onClose={()=>{setEditing(null);void refresh();}} onSave={saveScore} onImportPdf={importScorePdf}/></Suspense>}
 </section>;
}
function Confirm({text,onConfirm,onCancel,busy}) {const ref=useRef(null);useEffect(()=>{ref.current.showModal();},[]);return <dialog className="pdfDialog" ref={ref} aria-label="확인" onCancel={e=>{if(busy)e.preventDefault();else onCancel();}}><p>{text}</p><footer><button type="button" disabled={busy} onClick={onCancel}>취소</button><button type="button" disabled={busy} onClick={onConfirm}>확인</button></footer></dialog>;}

function RenameDialog({title,busy,error,onSave,onClose}){
 const ref=useRef(null),[value,setValue]=useState(title);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} className="pdfDialog" aria-label="악보 이름 변경" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><form onSubmit={e=>{e.preventDefault();if(value.trim())void onSave(value.trim());}}><h2>이름 변경</h2><label>제목<input autoFocus required maxLength="200" value={value} onChange={e=>setValue(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>취소</button><button type="submit" disabled={busy||!value.trim()}>저장</button></footer></form></dialog>;
}
