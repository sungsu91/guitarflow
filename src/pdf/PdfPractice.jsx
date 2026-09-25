import {normalizeGapCuts,pageVisibleHeight} from './pdfGapCuts.js';
import { formatMessage } from "./../i18n/core.js";
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {LocateFixed} from 'lucide-react';
import {MobilePdfHeader,MobilePdfTransport} from './MobilePdfChrome.jsx';
import PdfBarCount from './PdfBarCount.jsx';
import {cropMargins,pageCrop} from './pdfAnnotations.js';
import {PdfAnnotationToolbar} from './PdfAnnotationLayer.jsx';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import PdfPage from './PdfPage.jsx';
import PdfContinuous from './PdfContinuous.jsx';
import PdfViewToolbar from './PdfViewToolbar.jsx';
import usePdfFullscreen from './usePdfFullscreen.js';
import useEtudeMetronome from '../etudes/useEtudeMetronome.js';
import {useMetronomeVolume,setMetronomeVolume} from '../audio/metronomeVolumeStore.js';
import {patchPdf,storageError,downloadBlob,exportPdfPractice,pdfPracticeFilename} from './pdfLibrary.js';
import {expandPdfBars,removePdfRow,setPdfBarBeats,movePdfRow,setPdfBarBoundary} from './pdfBarRows.js';
import {practiceOrder,barAtTick,alignBarRow,pdfEditResumePosition} from './pdfModel.js';
const emptyBars=[];
export default function PdfPractice({initial,blob,mobile,onClose,onInfo,closeController,initialEditing=false}) {
  useLanguage();
 const fullscreen=usePdfFullscreen(),zoomController=useRef(null);
 const [mobileZoom,setMobileZoom]=useState(100);
 const [followRequest,setFollowRequest]=useState(0);
 const [record,setRecord]=useState(initial),[saveState,setSaveState]=useState(ko["pdf.saved"]),[error,setError]=useState(''),[mapping,setMapping]=useState(false),[activeBar,setActiveBar]=useState(null),[selectedBar,setSelectedBar]=useState(null),[orderText,setOrderText]=useState((initial.practiceOrder??[]).join(', '));
 const snapRows=true;
 const [toast,setToast]=useState(null);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),2000);return()=>clearTimeout(timer);},[toast]);
 const [rowCount,setRowCount]=useState(4),[draftRow,setDraftRow]=useState(null);
 const [editing,setEditing]=useState(initialEditing),[editTool,setEditTool]=useState('select'),[noteDraft,setNoteDraft]=useState(null),[,setHistoryVersion]=useState(0),[notice,setNotice]=useState('');
 const [original,setOriginal]=useState(false);
 const [pen,setPen]=useState({color:'brown',width:.003,opacity:1});
 const undo=useRef([]),redo=useRef([]),resumeEditedBar=useRef(initialEditing);
 const [cropDraft,setCropDraft]=useState(null);
 const current=useRef(initial),queue=useRef(Promise.resolve()),revision=useRef(0),saved=useRef(0),shell=useRef(null),modeScroll=useRef(null);
 useEffect(()=>{if(!mobile)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[mobile]);
 const {volume}=useMetronomeVolume();
 const [compact,setCompact]=useState(mobile);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setCompact(mobile||entry.contentRect.width<850));observer.observe(shell.current);return()=>observer.disconnect();},[mobile]);
 // Desktop restores its saved scale; every mobile opening starts at fitted 100%.
 const zoom=mobile?mobileZoom:record.zoom;
 const setZoom=value=>mobile?zoomController.current?.zoomTo(100):void update({zoom:value,...(value==='page'?{viewMode:'single'}:{})});
 const continuous=record.viewMode==='continuous',PageView=continuous?PdfContinuous:PdfPage;

 const metro=useEtudeMetronome(record.bpm,{beatsPerBar:record.meter[0],beatUnit:record.meter[1],audible:record.audible!==false,liveTempo:true,downbeatAt:tick=>{const r=current.current;if(!r.barMap?.length)return tick%r.meter[0]===0;const count=r.countIn?r.meter[0]:0;if(tick<count)return tick===0;const sequence=practiceOrder(r);return barAtTick(sequence,tick-count,Boolean(r.loop))?.beat===0;}});
 const update=useCallback(patch=>{
  const next={...current.current,...patch};current.current=next;setRecord(next);setSaveState(ko["pdf.saving"]);const version=++revision.current;
  queue.current=queue.current.catch(()=>{}).then(()=>patchPdf(initial.id,next)).then(()=>{saved.current=version;if(version===revision.current){setSaveState(ko["pdf.savedToDevice"]);setError('');}}).catch(e=>{setSaveState(ko["pdf.saveFailed"]);setError(storageError(e));});return queue.current;
 },[initial.id]);
 // Edit history stores only annotation fields. Page, BPM and the original PDF are independent.
 const applyEdit=useCallback(patch=>{
  resumeEditedBar.current=true;
  undo.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));
  if(undo.current.length>60)undo.current.shift();redo.current=[];setHistoryVersion(v=>v+1);void update(patch);
 },[update]);
 const travelHistory=direction=>{const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo,patch=from.current.pop();if(!patch)return;
  to.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));void update(patch);setHistoryVersion(v=>v+1);
  if('practiceOrder' in patch)setOrderText((patch.practiceOrder??[]).join(', '));setSelectedBar(null);setDraftRow(null);setCropDraft(null);setNoteDraft(null);
 };
 const editPage=(patch,pageNumber=current.current.lastPage)=>{const edits=current.current.pageEdits??{};applyEdit({pageEdits:{...edits,[pageNumber]:{crop:null,notes:[],...edits[pageNumber],...patch}}});};
 const saveNote=()=>{if(!noteDraft?.text.trim())return;const {page:notePage,...note}=noteDraft,notes=current.current.pageEdits?.[notePage]?.notes??[];
  if(notes.length>=200&&!notes.some(n=>n.id===note.id)){setNotice(ko["pdf.eachPageCanStoreUpTo200TextNotes"]);return;}
  editPage({notes:[...notes.filter(n=>n.id!==note.id),{...note,text:note.text.trim()}]},notePage);setNoteDraft(null);
 };
 const chooseTool=tool=>{if(noteDraft&&tool!=='text'){setNotice(ko["pdf.saveOrCancelTheNoteBeforeSwitchingTools"]);return;}metro.pause();setOriginal(false);setEditTool(tool);setMapping(tool==='bar');setDraftRow(null);setCropDraft(tool==='crop'?{page:current.current.lastPage,rect:pageCrop(current.current.pageEdits?.[current.current.lastPage])}:null);setSelectedBar(null);setNotice('');};
 const toggleEditing=()=>{if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeFinishingYourEdits"]);return;}const viewport=shell.current.querySelector('.pdfViewport');modeScroll.current={top:viewport?.scrollTop??0,left:viewport?.scrollLeft??0};metro.pause();if(!editing)resumeEditedBar.current=true;setEditing(!editing);setMapping(!editing&&editTool==='bar');setDraftRow(null);setCropDraft(null);setSelectedBar(null);};
 useLayoutEffect(()=>{const snapshot=modeScroll.current,viewport=shell.current?.querySelector('.pdfViewport');if(snapshot&&viewport){viewport.scrollTop=snapshot.top;viewport.scrollLeft=snapshot.left;modeScroll.current=null;}},[editing]);
 useEffect(()=>{void update({lastPracticedAt:new Date().toISOString()});},[update]);
 useEffect(()=>{const warn=e=>{if(saved.current<revision.current||noteDraft){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[noteDraft]);
 const bars=useMemo(()=>expandPdfBars(record.barMap??emptyBars),[record.barMap]),order=useMemo(()=>practiceOrder(record),[bars,record.practiceOrder,record.loop,record.loopStart,record.loopEnd]);
 const countTicks=record.countIn?record.meter[0]:0;
 useEffect(()=>{
  if(!metro.playing||metro.tick<countTicks||!order.length)return;
  const position=barAtTick(order,metro.tick-countTicks,Boolean(record.loop));
  if(position?.ended){metro.pause();return;}if(position){setActiveBar(position.bar.number);if(current.current.lastPage!==position.bar.page)void update({lastPage:position.bar.page});}
 },[metro.tick,metro.playing,countTicks,order,record.highlight,record.loop,update,metro.pause]);
 const getBarPosition=useCallback(()=>{
  if(!order.length)return null;
  const ticks=metro.getPosition()-countTicks;
  if(ticks<0)return null;
  const position=barAtTick(order,ticks,Boolean(record.loop));
  return position?{number:position.bar.number,progress:position.ended?1:position.beat/position.bar.beats}:null;
 },[record.highlight,record.loop,order,countTicks,metro.getPosition]);
 const removeBar=useCallback(number=>{
  metro.stop();const r=current.current;
  const removed=removePdfRow(r.barMap??[],number),nextOrder=(r.practiceOrder??[]).filter(n=>!removed.removed.includes(n));
  applyEdit({barMap:removed.barMap,practiceOrder:nextOrder});
  setOrderText(nextOrder.join(', '));setSelectedBar(null);setActiveBar(null);
 },[metro.stop,applyEdit]);
 const page=record.lastPage;
 const goPage=useCallback(n=>{if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeChangingPages"]);return;}const next=Math.max(1,Math.min(current.current.pageCount,n));void update({lastPage:next});},[update,noteDraft]);
 const selectBar=useCallback((number,progress=0)=>{const bar=bars.find(b=>b.number===number);if(!bar)return;
  if(editing)metro.pause();const index=order.findIndex(b=>b.number===number);if(index>=0)metro.seek(countTicks+order.slice(0,index).reduce((n,b)=>n+b.beats,0)+bar.beats*progress);
  setActiveBar(number);setSelectedBar(editing?number:null);goPage(bar.page);
 },[bars,order,countTicks,editing,metro.pause,metro.seek,goPage]);
 const addBar=useCallback(rect=>{const aligned=alignBarRow(rect,current.current.barMap??[],snapRows);setDraftRow(aligned);},[snapRows]);
 useEffect(()=>{setDraftRow(null);setCropDraft(editTool==='crop'?{page,rect:pageCrop(current.current.pageEdits?.[page])}:null);},[page]);
 useEffect(()=>{setDraftRow(null);},[mapping]);
 const commitRow=count=>{if(!draftRow)return;const number=Math.max(0,...bars.map(b=>b.number))+1;
  applyEdit({barMap:[...(current.current.barMap??[]),{...draftRow,number,count:Math.max(1,Math.min(4,count)),beats:current.current.meter[0],meter:[...current.current.meter]}],highlight:true});setDraftRow(null);setSelectedBar(null);chooseTool('select');setToast({text:formatMessage(ko["pdf.addedBarsValue1Value2"], { value1: number, value2: number+count-1 })});
 };
 const fitCrop=()=>{if(mobile)setMobileZoom(100);else void update({zoom:'fit'});};
 const cutGap=(start,end,pageNumber)=>{
  const edit=current.current.pageEdits?.[pageNumber]??{},cuts=normalizeGapCuts([...(edit.cuts??[]),{start,end}]);
  if(!cuts.length||pageVisibleHeight({...pageCrop(edit),cuts})<.05||(edit.cuts?.length??0)>=200){setNotice(ko["pdf.cutGapTooLarge"]);return;}
  if((current.current.barMap??[]).some(b=>b.page===pageNumber&&start<b.y+b.height&&end>b.y)){setNotice(ko["pdf.cutGapTouchesBar"]);return;}
  editPage({cuts},pageNumber);setNotice('');
 };
 const commitCrop=()=>{if(!cropDraft)return;editPage({crop:null,margins:cropMargins(cropDraft.rect)},cropDraft.page);fitCrop();chooseTool('select');};

 const changeBpm=value=>void update({bpm:Math.max(30,Math.min(240,Number(value)||30))});
 const toggle=()=>{if(metro.playing){metro.pause();return;}if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeStartingPractice"]);return;}setEditing(false);setMapping(false);setDraftRow(null);setSelectedBar(null);
  const held=metro.getPosition(),ended=barAtTick(order,held-countTicks,Boolean(record.loop))?.ended;const beatOffset=resumeEditedBar.current?pdfEditResumePosition(order,held,countTicks,Boolean(record.loop)):ended?0:Math.max(0,held);resumeEditedBar.current=false;void metro.start({beatOffset});
 };
 const stepBar=delta=>{const i=bars.findIndex(b=>b.number===activeBar),next=bars[Math.max(0,Math.min(bars.length-1,i+delta))];if(next)selectBar(next.number);};
 const close=async(after)=>{metro.stop();if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteYouReEditing"]);return;}await queue.current;if(saved.current<revision.current){setError(ko["pdf.youHaveUnsavedSettingsSaveAgainOrDiscardChangesBeforeLeaving"]);return;}onClose();if(typeof after==='function')after();};
 if(closeController)closeController.current=close;
 const exportPractice=async()=>{
  if(noteDraft||draftRow||cropDraft){setNotice(ko["pdf.finishDraftBeforeExport"]);return;}
  const pendingOrder=orderText.trim()?orderText.trim().split(/[,\s→]+/).map(Number):[];
  if(JSON.stringify(pendingOrder)!==JSON.stringify(current.current.practiceOrder??[])){setNotice(ko["pdf.applyOrderBeforeExport"]);return;}
  try{await queue.current;downloadBlob(exportPdfPractice(current.current,blob),pdfPracticeFilename(current.current.title));}catch(e){setNotice(e.message);}
 };
 const exportButton=<button type="button" onClick={()=>void exportPractice()}><Translation id="pdf.exportPracticeFile" /></button>;
 const settings=<>
  <h2><Translation id="pdf.practiceSettings" /></h2>
  {onInfo&&<button type="button" onClick={()=>{metro.stop();onInfo(current.current,update);}}><Translation id="pdf.editScoreDetails" /></button>}
  <label className="pdfCheck"><input type="checkbox" aria-label={translateUi("pdf.continuousPdfScroll")} checked={continuous} onChange={e=>void update({viewMode:e.target.checked?'continuous':'single',...(e.target.checked?(mobile?{mobileZoom:'fit'}:{zoom:'fit'}):{})})}/><Translation id="pdf.viewAllPagesContinuously" /></label>
  {!mobile&&<label><Translation id="pdf.bpmQuarterNoteBeat" /><input aria-label={translateUi("originalUi.pdfBpm")} type="number" min="30" max="240" value={record.bpm} onChange={e=>changeBpm(e.target.value)}/></label>}
  <label><Translation id="app.meter" /><select aria-label={translateUi("pdf.pdfMeter")} value={record.meter.join('/')} onChange={e=>{metro.stop();void update({meter:e.target.value.split('/').map(Number)});}}>{['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label className="pdfCheck"><input type="checkbox" checked={record.audible!==false} onChange={e=>void update({audible:e.target.checked})}/><Translation id="pdf.metronomeSound" /></label>
  <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.countIn)} onChange={e=>{metro.stop();void update({countIn:e.target.checked});}}/><Translation id="pdf.1BarCountIn" /></label>
  <label><Translation id="pdf.sharedMetronomeVolume" />{Math.round(volume*100)}%<input aria-label={translateUi("pdf.pdfMetronomeVolume")} type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setMetronomeVolume(e.target.value)}/></label>
  <details><summary><Translation id="pdf.barPositionsLoopPractice" /></summary><p><Translation id="pdf.printedBarsAreNotDetectedAutomaticallyPracticeFollowsTheOrderYouMark" /></p>
   <label className="pdfCheck"><input type="checkbox" disabled={!bars.length} checked={Boolean(record.highlight)} onChange={e=>void update({highlight:e.target.checked})}/><Translation id="pdf.highlightCurrentLineBackground" /></label>
   {bars.length>0&&<><label><Translation id="pdf.selectedBar" /><select aria-label={translateUi("pdf.selectedPdfBar")} value={activeBar??''} onChange={e=>selectBar(Number(e.target.value))}><option value=""><Translation id="app.select" /></option>{bars.map(b=><option key={b.number} value={b.number}>{b.number}<Translation id="app.barApp" />{b.page}<Translation id="pdf.page" /></option>)}</select></label>
    {activeBar&&<><label><Translation id="pdf.beatsInThisBarBasedOnTheTimeSignatureDenominator" /><input aria-label={translateUi("pdf.beatsPerBar")} type="number" min="1" max="32" value={bars.find(b=>b.number===activeBar)?.beats??4} onChange={e=>{metro.stop();void update({barMap:setPdfBarBeats(current.current.barMap,activeBar,Math.max(1,Math.min(32,Number(e.target.value)||1)))});}}/></label><button type="button" onClick={()=>removeBar(activeBar)}><Translation id="pdf.deleteSelectedLineRegion" /></button></>}
    <label><Translation id="pdf.practiceOrderEG12123" /><input aria-label={translateUi("pdf.pdfPracticeOrder")} value={orderText} onChange={e=>setOrderText(e.target.value)}/></label><button type="button" onClick={()=>{const values=orderText.trim()?orderText.split(/[,\s→]+/).map(Number):[];if(values.some(n=>!bars.some(b=>b.number===n))||values.length>1000){setError(ko["pdf.enterMarkedBarNumbersSeparatedByCommas"]);return;}metro.stop();void update({practiceOrder:values,loopStart:1,loopEnd:values.length||bars.length});}}><Translation id="pdf.applyPracticeOrder" /></button>
    <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.loop)} onChange={e=>{metro.stop();void update({loop:e.target.checked});}}/><Translation id="audioStudio.loopSelection" /></label>
    {record.loop&&<div className="pdfPair">{[['loopStart',ko["pdf.startIndex"]],['loopEnd',ko["pdf.endIndex"]]].map(([key,title])=><label key={key}>{title}<input aria-label={title} type="number" min="1" max={record.practiceOrder?.length||bars.length} value={record[key]??(key==='loopStart'?1:record.practiceOrder?.length||bars.length)} onChange={e=>{metro.stop();void update({[key]:Math.max(1,Math.min(record.practiceOrder?.length||bars.length,Number(e.target.value)||1))});}}/></label>)}</div>}
   </>}
  </details>
  {record.memo&&<p className="pdfMemo">{record.memo}</p>}
  {exportButton}<small><Translation id="pdf.practiceFileHelp" /></small>
  <button type="button" onClick={()=>downloadBlob(blob,`${record.title}.pdf`)}><Translation id="app.exportOriginalPdf" /></button>
  <small><Translation id="pdf.addBarMarkersAndNotesOverThePdfExportOriginalPdfDoes" /></small>
 </>;
 const onMobileAction=action=>{
  if(action==='export'){void exportPractice();return;}
  if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeUsingTheMenu"]);return;}
  if(action==='info'){metro.stop();onInfo?.(current.current,update);}
  if(action==='fit')zoomController.current?.zoomTo(100);
  if(action==='reset'){editPage({crop:null,margins:null});fitCrop();chooseTool('select');}
  if(action==='original'){metro.stop();setOriginal(v=>!v);setMapping(false);setCropDraft(null);setEditTool('select');}
  if(action==='fullscreen')void fullscreen.enter();
 };
 const locateCurrent=()=>{const position=getBarPosition(),bar=bars.find(b=>b.number===(position?.number??activeBar))??order[0];if(!bar)return;setActiveBar(bar.number);goPage(bar.page);setFollowRequest(v=>v+1);};
 const controls=mobile?<MobilePdfTransport page={page} pageCount={record.pageCount} onPage={goPage} bpm={record.bpm} onBpm={changeBpm} settings={settings} paused={metro.paused} playing={metro.playing} onPlay={toggle} countIn={metro.playing&&metro.tick<countTicks}/>:<div className="pdfTransport"><button type="button" aria-label={translateUi("pdf.previousPdfPage")} disabled={page<=1} onClick={()=>goPage(page-1)}><Translation id="etudes.previousEtudeStudio" /></button><div className="pdfTransportCenter"><div className="pdfBeatDots" aria-label={metro.beat<0?translateUi("app.stopApp"):translateUi("app.beatValue1", { value1: metro.beat+1 })}>{Array.from({length:record.meter[0]},(_,i)=><i key={i} className={metro.beat===i?'is-on':''}/>)}</div><button type="button" className="pdfPrimary" aria-label={translateUi("pdf.startStopPdfPractice")} aria-pressed={metro.playing} onClick={toggle}>{metro.playing?translateUi("pdf.iiPause"):metro.paused?translateUi("pdf.resumePractice"):translateUi("pdf.startPractice")}</button><span>{metro.playing&&metro.tick<countTicks?translateUi("pdf.countIn"):`${record.bpm} BPM`}</span></div><button type="button" aria-label={translateUi("pdf.nextPdfPage")} disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}><Translation id="etudes.nextEtudeStudio" /></button></div>;
 const toolbar=editing&&!original&&<PdfAnnotationToolbar compact={mobile} tool={editTool} choose={chooseTool} {...{pen,setPen}} undo={()=>travelHistory('undo')} redo={()=>travelHistory('redo')} canUndo={Boolean(undo.current.length)&&!noteDraft} canRedo={Boolean(redo.current.length)&&!noteDraft}>
  {editTool==='cut'?<div className="pdfGapCutHint"><Translation id="pdf.cutGapHelp" /><button type="button" onClick={()=>editPage({cuts:[]})}><Translation id="pdf.resetGapCuts" /></button></div>:editTool==='crop'?<div className="pdfCropApply"><button type="button" aria-label={translateUi("pdf.resetMargins")} onClick={()=>{editPage({crop:null,margins:null});fitCrop();chooseTool('select');}}><Translation id="app.reset" /></button><button type="button" aria-label={translateUi("pdf.cancelCrop")} onClick={()=>chooseTool('select')}><Translation id="common.cancel" /></button><button type="button" aria-label={translateUi("pdf.applyMarginCrop")} onClick={commitCrop}><Translation id="app.apply" /></button></div>:mapping&&draftRow?<div className="pdfCompactBarTools"><PdfBarCount startNumber={Math.max(0,...bars.map(b=>b.number))+1} value={rowCount} onChange={setRowCount} onApply={commitRow} onCancel={()=>setDraftRow(null)}/></div>:null}
 </PdfAnnotationToolbar>;
 return <section ref={shell} className={`pdfPractice ${mobile?'pdfPractice--mobile':'pdfPractice--desktop'} ${compact?'pdfPractice--compact':''} ${editing?'pdfPractice--editing':''}`}>
  {mobile?<MobilePdfHeader title={record.title} editing={editing} onBack={close} onLocate={locateCurrent} canLocate={Boolean(bars.length)&&!editing} onDone={()=>{setOriginal(false);toggleEditing();}} onAction={onMobileAction} saveState={saveState} page={page} pageCount={record.pageCount} original={original}/>:<header className="pdfPracticeHeader"><button type="button" onClick={close}><Translation id="score.backToRoom" /></button><div><h1>{record.title}</h1><small>{record.artist}<Translation id="originalUi.pdf" /><span role="status">{localizeUi(saveState)}</span></small></div><button type="button" onClick={locateCurrent} disabled={!bars.length||editing} title={translateUi("pdf.goToCurrentPosition")} aria-label={translateUi("pdf.goToCurrentPosition")}><LocateFixed size={19}/></button>{exportButton}</header>}
  {error&&<div role="alert">{localizeUi(error)}<button type="button" onClick={()=>void update(current.current)}><Translation id="pdf.saveAgain" /></button><button type="button" onClick={onClose}><Translation id="pdf.discardUnsavedChangesAndLeave" /></button></div>}{metro.error&&<p role="alert">{localizeUi(metro.error)}</p>}
  <div className="pdfPracticeBody"><main className="pdfDocument">{!mobile&&<PdfViewToolbar {...{zoom,setZoom,mobile}} previewRoot={shell}><button type="button" className="pdfMappingQuick" aria-label={translateUi("pdf.quickPdfEdit")} aria-pressed={editing} onClick={toggleEditing}>{editing?translateUi("pdf.doneEditing"):translateUi("pdf.quickEdit")}</button><button type="button" className="pdfFullscreen" aria-label={translateUi("pdf.fullscreen")} title={translateUi("pdf.fullscreen")} onClick={()=>void fullscreen.enter()}>⛶</button></PdfViewToolbar>}

   {toast&&<div className="pdfEditToast" role="status">{localizeUi(toast.text)}</div>}
   {notice&&<p className="pdfEditNotice" role="alert">{localizeUi(notice)}<button type="button" onClick={()=>setNotice('')}><Translation id="common.close" /></button></p>}
   <div ref={fullscreen.ref} className={`pdfScoreStage ${fullscreen.active?'is-fullscreen':''}`} aria-label={translateUi("pdf.pdfScoreArea")}>
   {fullscreen.active&&<div className="pdfFullscreenControls" role="group" aria-label={translateUi("pdf.fullscreenScoreControls")}><button type="button" aria-label={translateUi("pdf.fullscreenPreviousPage")} disabled={page<=1} onClick={()=>goPage(page-1)}>‹</button><span>{page} / {record.pageCount}</span><button type="button" aria-label={translateUi("pdf.fullscreenNextPage")} disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>›</button><button type="button" aria-label={translateUi("pdf.closeFullscreenScore")} onClick={()=>void fullscreen.exit()}><Translation id="pdf.close" /></button></div>}
   <PageView onGapCut={cutGap} followRequest={followRequest} emphasize={Boolean(record.highlight)} documentId={`${record.id}:${record.fingerprint}`} thumbnail={record.thumbnail} mobile={mobile} onZoomChange={setMobileZoom} zoomController={zoomController} pageCount={record.pageCount} pageEdits={original?{}:record.pageEdits} onPageSeen={n=>{if(!metro.playing&&current.current.lastPage!==n)void update({lastPage:n});}} pageEdit={original?undefined:record.pageEdits?.[page]} editing={editing&&!original} editTool={editing&&!original?editTool:null} cropDraft={cropDraft} annotation={{pen,noteDraft,onNoteDraft:setNoteDraft,onSaveNote:saveNote,onUpdateNote:(note,n)=>editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).map(item=>item.id===note.id?note:item)},n),onCancelNote:()=>{setNoteDraft(null);setNotice('');},onDeleteNote:(id,n)=>{editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).filter(note=>note.id!==id)},n);setNoteDraft(null);},onStroke:(stroke,n)=>{const strokes=current.current.pageEdits?.[n]?.strokes??[];if(strokes.length>=1000){setNotice(ko["pdf.eachPageCanStoreUpTo1000StrokesRemoveUnnecessaryStrokes"]);return;}editPage({strokes:[...strokes,stroke]},n);},onUpdateStroke:(stroke,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).map(s=>s.id===stroke.id?stroke:s)},n),onDeleteStroke:(id,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).filter(s=>s.id!==id)},n),onCropDraft:(rect,n)=>setCropDraft({rect,page:n})}} onTextPoint={(point,n=page)=>{if(noteDraft&&noteDraft.page!==n){setNotice(ko["pdf.saveOrCancelTheCurrentNoteBeforeWritingOnAnotherPage"]);return;}setNoteDraft(d=>d??{id:crypto.randomUUID(),page:n,...point,text:'',size:.035,color:'brown'});}} onSelectNote={(note,n=page)=>{if(noteDraft&&noteDraft.id!==note.id){setNotice(ko["pdf.saveOrCancelTheNoteYouReEditing"]);return;}metro.stop();setMapping(false);setEditTool('select');setNoteDraft({...note,page:n});}} onUpdateBoundary={(number,index,value)=>applyEdit({barMap:setPdfBarBoundary(current.current.barMap,number,index,value)})} onUpdateRow={(number,rect)=>applyEdit({barMap:movePdfRow(current.current.barMap,number,rect)})} rowMap={original?emptyBars:record.barMap??emptyBars} {...{blob,mapping,barMap:bars,activeBar,selectedBar,getBarPosition,snapRows,draftRow,rowCount}} onCountPreview={setRowCount} onCommitRow={commitRow} onCancelRow={()=>setDraftRow(null)} playing={metro.playing} pageNumber={page} zoom={zoom} barMap={original?emptyBars:bars} onAdd={addBar} onSelect={selectBar} onRemove={removeBar} onDeselect={()=>setSelectedBar(null)}/>
   {fullscreen.active&&toolbar}</div>
   {!mobile&&bars.length>0&&<div className="pdfBarNav"><button type="button" onClick={()=>stepBar(-1)}><Translation id="pdf.previousBar" /></button><span>{activeBar?translateUi("etudes.barValue1", { value1: activeBar }):translateUi("pdf.chooseBar")}</span><button type="button" onClick={()=>stepBar(1)}><Translation id="pdf.nextBar" /></button></div>}
  {!mobile&&!fullscreen.active&&toolbar}</main>{!mobile&&(compact?<details className="pdfMobileSettings"><summary><Translation id="pdf.practiceSettingsPdfPractice" />{record.bpm}<Translation id="originalUi.bpmScoreeditor" />{record.meter.join('/')}</summary>{settings}</details>:<aside className="pdfSettings">{settings}</aside>)}</div>{mobile?<div className="pdfPracticeDock">{!fullscreen.active&&toolbar}{controls}</div>:controls}
 </section>;
}
