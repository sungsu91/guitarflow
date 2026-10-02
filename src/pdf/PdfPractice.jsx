import DesktopPdfTools from './DesktopPdfTools.jsx';
import MobilePdfMeasureSettings from './MobilePdfMeasureSettings.jsx';
import {analysePracticePdf} from './analysePracticePdf.js';
import PracticeSheet from '../etudes/PracticeSheet.jsx';
import PracticeFloatingTools from '../etudes/PracticeFloatingTools.jsx';
import PracticeCountInControl from '../etudes/PracticeCountInControl.jsx';
import {practiceCountIn} from '../etudes/practiceCountIn.js';
import ScoreWorkspaceActions from '../etudes/ScoreWorkspaceActions.jsx';
import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
import {getMetronomeSubdivisionOption} from '../metronome/subdivision.js';
import {DesktopPdfAutoMeasures,MobilePdfAutoMeasures,PdfMeasureConfirmation} from './PdfAutoMeasureControls.jsx';
import {practiceMeasureMap} from './autoMeasures.js';
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
import {patchPdf,storageError,downloadBlob} from './pdfLibrary.js';
import {exportEditedPdf,pdfExportFilename} from './exportEditedPdf.js';
import {expandPdfBars,removePdfRow,movePdfRow,setPdfBarBoundary} from './pdfBarRows.js';
import {practiceOrder,barAtTick,alignBarRow,pdfEditResumePosition} from './pdfModel.js';
const emptyBars=[];
export default function PdfPractice({initial,blob,mobile,onClose,onInfo,closeController,initialEditing=false,embedded=false,roomModel,desktopPicker,desktopStorage}) {
  useLanguage();
 const fullscreen=usePdfFullscreen(),zoomController=useRef(null);
 const [mobileZoom,setMobileZoom]=useState(100);
 const [followRequest,setFollowRequest]=useState(0);
 const [record,setRecord]=useState(initial),[saveState,setSaveState]=useState(ko["pdf.saved"]),[error,setError]=useState(''),[mapping,setMapping]=useState(false),[activeBar,setActiveBar]=useState(null),[selectedBar,setSelectedBar]=useState(null);
 const [analysis,setAnalysis]=useState(null),[analysisProgress,setAnalysisProgress]=useState(''),[measureConfirmation,setMeasureConfirmation]=useState(null);
 const analysisController=useRef(null);
 // Vite preserves this component's state when the detector changes. Discard
 // a preview produced by the previous detector rather than offering stale boxes.
 useEffect(()=>{setAnalysis(null);setAnalysisProgress('');return()=>analysisController.current?.abort();},[practiceMeasureMap,analysePracticePdf]);
 const snapRows=true;
 const [toast,setToast]=useState(null);
 const [exporting,setExporting]=useState(false),exportLock=useRef(false);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),2000);return()=>clearTimeout(timer);},[toast]);
 const [rowCount,setRowCount]=useState(4),[draftRow,setDraftRow]=useState(null);
 const [editing,setEditing]=useState(initialEditing),[editTool,setEditTool]=useState('select'),[noteDraft,setNoteDraft]=useState(null),[,setHistoryVersion]=useState(0),[notice,setNotice]=useState('');
 const [original,setOriginal]=useState(false);
 const [pen,setPen]=useState({color:'brown',width:.003,opacity:1});
 const undo=useRef([]),redo=useRef([]),resumeEditedBar=useRef(initialEditing);
 const [cropDraft,setCropDraft]=useState(null);
 const current=useRef(initial),queue=useRef(Promise.resolve()),revision=useRef(0),saved=useRef(0),shell=useRef(null),modeScroll=useRef(null);
 useEffect(()=>{if(!mobile||embedded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[mobile,embedded]);
 const [localCountIn,setLocalCountIn]=useState(true),pausedByUser=useRef(false);
 const countIn=roomModel?.countIn??localCountIn;
 const [compact,setCompact]=useState(mobile);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setCompact(mobile||entry.contentRect.width<850));observer.observe(shell.current);return()=>observer.disconnect();},[mobile]);
 // Desktop restores its saved scale; every mobile opening starts at fitted 100%.
 const [desktopZoom,setDesktopZoom]=useState('auto');
 const zoom=mobile?mobileZoom:embedded?desktopZoom:record.zoom;
 const setZoom=value=>mobile?zoomController.current?.zoomTo(100):embedded?setDesktopZoom(value):void update({zoom:value,...(value==='page'?{viewMode:'single'}:{})});
 const continuous=(embedded&&!mobile&&zoom==='auto')||(record.viewMode==='continuous'&&!(embedded&&!mobile&&zoom==='page')),PageView=continuous?PdfContinuous:PdfPage;

 const metro=useEtudeMetronome(record.bpm,{beatsPerBar:record.meter[0],beatUnit:record.meter[1],audible:record.audible!==false,liveTempo:true,clicksPerBeat:getMetronomeSubdivisionOption(roomModel?.subdivision??'quarter').clicksPerBeat,toneSrc:METRONOME_TONE_OPTIONS.find(o=>o.id===roomModel?.tone)?.src,downbeatAt:tick=>{const r=current.current;if(!r.barMap?.length)return tick%r.meter[0]===0;const sequence=practiceOrder(r);return barAtTick(sequence,tick,Boolean(r.loop))?.beat===0;}});
 const saveTimer=useRef(null);
 useEffect(()=>()=>clearTimeout(saveTimer.current),[]);
 const update=useCallback(patch=>{
  if(Object.entries(patch).every(([key,value])=>Object.is(current.current[key],value)))return queue.current;
  const next={...current.current,...patch};current.current=next;setRecord(next);if(!saveTimer.current)saveTimer.current=setTimeout(()=>{saveTimer.current=null;setSaveState(ko["pdf.saving"]);},600);const version=++revision.current;
  queue.current=queue.current.catch(()=>{}).then(()=>patchPdf(initial.id,next)).then(()=>{saved.current=version;if(version===revision.current){clearTimeout(saveTimer.current);saveTimer.current=null;setSaveState(ko["pdf.savedToDevice"]);setError('');}}).catch(e=>{clearTimeout(saveTimer.current);saveTimer.current=null;setSaveState(ko["pdf.saveFailed"]);setError(storageError(e));});return queue.current;
 },[initial.id]);
 // Edit history stores only annotation fields. Page, BPM and the original PDF are independent.
 const applyEdit=useCallback(patch=>{
  resumeEditedBar.current=true;
  undo.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));
  if(undo.current.length>60)undo.current.shift();redo.current=[];setHistoryVersion(v=>v+1);void update(patch);
 },[update]);
 const travelHistory=direction=>{const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo,patch=from.current.pop();if(!patch)return;
  to.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));void update(patch);setHistoryVersion(v=>v+1);
  setSelectedBar(null);setDraftRow(null);setCropDraft(null);setNoteDraft(null);
 };
 const resetAnalysis=()=>{
  analysisController.current?.abort();analysisController.current=null;
  setAnalysis(null);setAnalysisProgress('');setNotice('');
  setSelectedBar(null);setDraftRow(null);
 };
 const resetMeasureAreas=()=>{
  if(noteDraft)return;
  resetAnalysis();metro.stop();
  if(current.current.barMap?.length){
   applyEdit({barMap:[],practiceOrder:[],loopStart:1,loopEnd:1});
  }
  setActiveBar(null);setEditing(false);setMapping(false);setEditTool('select');setOriginal(false);
 };
 const runAnalysis=async()=>{
  if(noteDraft)return;
  resetAnalysis();
  metro.pause();setOriginal(false);setEditing(false);setMapping(false);setDraftRow(null);setSelectedBar(null);setAnalysis(null);
  const controller=new AbortController();analysisController.current=controller;setAnalysisProgress(translateUi('pdf.autoAnalysing'));
  try{const result=await analysePracticePdf(blob,{signal:controller.signal,onProgress:value=>{if(analysisController.current===controller&&!controller.signal.aborted)setAnalysisProgress(value);}});if(analysisController.current===controller&&!controller.signal.aborted)setAnalysis(result);}
  catch(e){if(!controller.signal.aborted)setNotice(e.message);}
  finally{if(analysisController.current===controller){analysisController.current=null;setAnalysisProgress('');}}
 };
 const applyAnalysis=()=>{
  if(!analysis?.summary.measures)return;
  const barMap=practiceMeasureMap(analysis.pages,current.current.meter);
  metro.stop();applyEdit({barMap,practiceOrder:[],loopStart:1,loopEnd:barMap.length,highlight:true});setActiveBar(1);void update({lastPage:barMap[0].page});
  setAnalysis(null);setEditing(false);setMapping(false);setEditTool('select');setOriginal(false);resumeEditedBar.current=false;pausedByUser.current=false;
  roomModel?.setToolsVisible(true);roomModel?.setMetroMinimized(false);
  // Applying the map leaves playback stopped at the first measure.
  // The transport's Start button is the only action that starts practice.
 };
 const editPage=(patch,pageNumber=current.current.lastPage)=>{const edits=current.current.pageEdits??{};applyEdit({pageEdits:{...edits,[pageNumber]:{crop:null,notes:[],...edits[pageNumber],...patch}}});};
 const saveNote=()=>{if(!noteDraft?.text.trim())return;const {page:notePage,...note}=noteDraft,notes=current.current.pageEdits?.[notePage]?.notes??[];
  if(notes.length>=200&&!notes.some(n=>n.id===note.id)){setNotice(ko["pdf.eachPageCanStoreUpTo200TextNotes"]);return;}
  editPage({notes:[...notes.filter(n=>n.id!==note.id),{...note,text:note.text.trim()}]},notePage);setNoteDraft(null);
 };
 const chooseTool=tool=>{if(noteDraft&&tool!=='text'){setNotice(ko["pdf.saveOrCancelTheNoteBeforeSwitchingTools"]);return;}metro.pause();setOriginal(false);setEditTool(tool);setMapping(tool==='bar');setDraftRow(null);setCropDraft(tool==='crop'?{page:current.current.lastPage,rect:pageCrop(current.current.pageEdits?.[current.current.lastPage])}:null);setSelectedBar(null);setNotice('');};
 const toggleEditing=()=>{if(analysis||analysisProgress)return;if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeFinishingYourEdits"]);return;}const viewport=shell.current.querySelector('.pdfViewport');modeScroll.current={top:viewport?.scrollTop??0,left:viewport?.scrollLeft??0};metro.pause();if(!editing)resumeEditedBar.current=true;setEditing(!editing);setMapping(!editing&&editTool==='bar');setDraftRow(null);setCropDraft(null);setSelectedBar(null);};
 useLayoutEffect(()=>{const snapshot=modeScroll.current,viewport=shell.current?.querySelector('.pdfViewport');if(snapshot&&viewport){viewport.scrollTop=snapshot.top;viewport.scrollLeft=snapshot.left;modeScroll.current=null;}},[editing]);
 useEffect(()=>{void update({lastPracticedAt:new Date().toISOString()});},[update]);
 useEffect(()=>{const warn=e=>{if(saved.current<revision.current||noteDraft){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[noteDraft]);
 const bars=useMemo(()=>expandPdfBars(record.barMap??emptyBars),[record.barMap]),order=useMemo(()=>practiceOrder(record),[bars,record.practiceOrder,record.loop,record.loopStart,record.loopEnd]);

 useEffect(()=>{
  if(!metro.playing||metro.countingIn||metro.tick<0||!order.length)return;
  const position=barAtTick(order,metro.tick,Boolean(record.loop));
  if(position?.ended){metro.pause();return;}if(position){setActiveBar(position.bar.number);if(current.current.lastPage!==position.bar.page)void update({lastPage:position.bar.page});}
 },[metro.tick,metro.playing,metro.countingIn,order,record.highlight,record.loop,update,metro.pause]);
 const getBarPosition=useCallback(()=>{
  if(!order.length||metro.countingIn)return null;
  const ticks=metro.getPosition();
  if(ticks<0)return null;
  const position=barAtTick(order,ticks,Boolean(record.loop));
  return position?{number:position.bar.number,progress:position.ended?1:position.beat/position.bar.beats}:null;
 },[record.highlight,record.loop,order,metro.countingIn,metro.getPosition]);
 const removeBar=useCallback(number=>{
  metro.stop();const r=current.current;
  const removed=removePdfRow(r.barMap??[],number),nextOrder=(r.practiceOrder??[]).filter(n=>!removed.removed.includes(n));
  applyEdit({barMap:removed.barMap,practiceOrder:nextOrder});
  setSelectedBar(null);setActiveBar(null);
 },[metro.stop,applyEdit]);
 const page=record.lastPage;
 const goPage=useCallback(n=>{if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeChangingPages"]);return;}const next=Math.max(1,Math.min(current.current.pageCount,n));void update({lastPage:next});},[update,noteDraft]);
 const selectBar=useCallback((number,progress=0)=>{const bar=bars.find(b=>b.number===number);if(!bar)return;
  if(editing)metro.pause();const index=order.findIndex(b=>b.number===number);if(index>=0)metro.seek(order.slice(0,index).reduce((n,b)=>n+b.beats,0)+(metro.playing?bar.beats*progress:0));
  setActiveBar(number);setSelectedBar(editing?number:null);goPage(bar.page);
 },[bars,order,metro.countingIn,editing,metro.pause,metro.seek,goPage]);
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
 const pausePractice=()=>{pausedByUser.current=true;metro.pause();};
 const changeCountIn=value=>{metro.stop();pausedByUser.current=false;(roomModel?.setCountIn??setLocalCountIn)(value);};
 const toggle=()=>{if(analysis||analysisProgress)return;if(metro.playing){pausePractice();return;}if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeStartingPractice"]);return;}setEditing(false);setMapping(false);setDraftRow(null);setSelectedBar(null);
  const held=metro.getPosition(),ended=barAtTick(order,held,Boolean(record.loop))?.ended;const beatOffset=resumeEditedBar.current?pdfEditResumePosition(order,held,0,Boolean(record.loop)):ended?0:Math.max(0,held);resumeEditedBar.current=false;const leadIn=practiceCountIn(countIn&&!pausedByUser.current,record.meter,record.bpm);pausedByUser.current=false;void metro.start({beatOffset,leadIn});
 };
 const resetPractice=()=>{metro.stop();pausedByUser.current=false;resumeEditedBar.current=false;const first=order[0]??bars[0];setActiveBar(first?.number??1);goPage(first?.page??1);};
 const stepBar=delta=>{const i=bars.findIndex(b=>b.number===activeBar),next=bars[Math.max(0,Math.min(bars.length-1,i+delta))];if(next)selectBar(next.number);};
 const close=async(after)=>{metro.stop();if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteYouReEditing"]);return;}await queue.current;if(saved.current<revision.current){setError(ko["pdf.youHaveUnsavedSettingsSaveAgainOrDiscardChangesBeforeLeaving"]);return;}onClose();if(typeof after==='function')after();};
 if(closeController)closeController.current=close;
 const savePdf=async()=>{
  if(exportLock.current)return;
  if(noteDraft||cropDraft){setNotice(ko["pdf.finishEditsBeforeSave"]);return;}
  exportLock.current=true;setExporting(true);setNotice('');
  const snapshot=current.current;
  try{downloadBlob(await exportEditedPdf(snapshot,blob),pdfExportFilename(snapshot.title));}catch(e){setNotice(e.message);}
  finally{exportLock.current=false;setExporting(false);}
 };
 const exportButton=<button type="button" className="pdfSaveButton" disabled={exporting} aria-busy={exporting} title={translateUi("pdf.savePdfHelp")} onClick={()=>void savePdf()}><Translation id={exporting?"pdf.savingPdf":"pdf.savePdf"} /></button>;
 const settings=<PracticeCountInControl checked={countIn} onChange={changeCountIn}/>;
 const onMobileAction=action=>{
  if(action==='export'){void savePdf();return;}
  if(noteDraft){setNotice(ko["pdf.saveOrCancelTheNoteBeforeUsingTheMenu"]);return;}
  if(action==='info'){metro.stop();onInfo?.(current.current,update);}
  if(action==='fit')zoomController.current?.zoomTo(100);
  if(action==='reset'){editPage({crop:null,margins:null});fitCrop();chooseTool('select');}
  if(action==='original'){metro.stop();setOriginal(v=>!v);setMapping(false);setCropDraft(null);setEditTool('select');}
  if(action==='fullscreen')void fullscreen.enter();
 };
 const locateCurrent=()=>{const position=getBarPosition(),bar=bars.find(b=>b.number===(position?.number??activeBar))??order[0];if(!bar)return;setActiveBar(bar.number);goPage(bar.page);setFollowRequest(v=>v+1);};
 const controls=mobile?<MobilePdfTransport page={page} pageCount={record.pageCount} onPage={goPage} bpm={record.bpm} onBpm={changeBpm} settings={settings} paused={metro.paused} playing={metro.playing} onPlay={toggle} onReset={resetPractice} countIn={metro.countingIn}/>:<div className="pdfTransport"><button type="button" aria-label={translateUi("pdf.previousPdfPage")} disabled={page<=1} onClick={()=>goPage(page-1)}><Translation id="etudes.previousEtudeStudio" /></button><div className="pdfTransportCenter"><div className="pdfBeatDots" aria-label={metro.beat<0?translateUi("app.stopApp"):translateUi("app.beatValue1", { value1: metro.beat+1 })}>{Array.from({length:record.meter[0]},(_,i)=><i key={i} className={metro.beat===i?'is-on':''}/>)}</div><button type="button" className="pdfPrimary" aria-label={translateUi("pdf.startStopPdfPractice")} aria-pressed={metro.playing} onClick={toggle}>{metro.playing?translateUi("pdf.iiPause"):metro.paused?translateUi("pdf.resumePractice"):translateUi("pdf.startPractice")}</button><button type="button" onClick={resetPractice}>{translateUi("pdf.resetPractice")}</button><span>{metro.countingIn?translateUi("pdf.countIn"):`${record.bpm} BPM`}</span></div><button type="button" aria-label={translateUi("pdf.nextPdfPage")} disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}><Translation id="etudes.nextEtudeStudio" /></button></div>;
 const toolbar=editing&&!original&&<PdfAnnotationToolbar compact={mobile} tool={editTool} choose={chooseTool} {...{pen,setPen}} undo={()=>travelHistory('undo')} redo={()=>travelHistory('redo')} canUndo={Boolean(undo.current.length)&&!noteDraft} canRedo={Boolean(redo.current.length)&&!noteDraft}>
  {editTool==='cut'?<div className="pdfGapCutHint"><Translation id="pdf.cutGapHelp" /><button type="button" onClick={()=>editPage({cuts:[]})}><Translation id="pdf.resetGapCuts" /></button></div>:editTool==='crop'?<div className="pdfCropApply"><button type="button" aria-label={translateUi("pdf.resetMargins")} onClick={()=>{editPage({crop:null,margins:null});fitCrop();chooseTool('select');}}><Translation id="app.reset" /></button><button type="button" aria-label={translateUi("pdf.cancelCrop")} onClick={()=>chooseTool('select')}><Translation id="common.cancel" /></button><button type="button" aria-label={translateUi("pdf.applyMarginCrop")} onClick={commitCrop}><Translation id="app.apply" /></button></div>:mapping&&draftRow?<div className="pdfCompactBarTools"><PdfBarCount startNumber={Math.max(0,...bars.map(b=>b.number))+1} value={rowCount} onChange={setRowCount} onApply={commitRow} onCancel={()=>setDraftRow(null)}/></div>:null}
 </PdfAnnotationToolbar>;
 const requestAnalysis=()=>{if(!noteDraft&&!analysisProgress)setMeasureConfirmation('analyse');};
 const requestReset=()=>{if(!noteDraft)setMeasureConfirmation('reset');};
 const autoMeasureControls={analysis,progress:analysisProgress,hasBars:Boolean(bars.length),disabled:Boolean(noteDraft),onAnalyse:requestAnalysis,onCancel:resetAnalysis,onApply:applyAnalysis};
 const document=<section ref={shell} className={`pdfPractice ${mobile?'pdfPractice--mobile':'pdfPractice--desktop'} ${compact?'pdfPractice--compact':''} ${editing?'pdfPractice--editing':''} ${embedded?'pdfPractice--embedded':''}`}>
  {measureConfirmation&&<PdfMeasureConfirmation action={measureConfirmation} hasBars={Boolean(bars.length)} onCancel={()=>setMeasureConfirmation(null)} onConfirm={()=>{const action=measureConfirmation;setMeasureConfirmation(null);if(action==='reset')resetMeasureAreas();else void runAnalysis();}}/>}
  {!roomModel&&(mobile?<MobilePdfHeader saveButton={exportButton} title={record.title} editing={editing} onBack={embedded?undefined:close} onLocate={locateCurrent} canLocate={Boolean(bars.length)&&!editing} onDone={()=>{setOriginal(false);toggleEditing();}} onAction={onMobileAction} saveState={saveState} page={page} pageCount={record.pageCount} original={original}/>:<header className="pdfPracticeHeader">{!embedded&&<button type="button" onClick={close}><Translation id="score.backToRoom" /></button>}<div><h1>{record.title}</h1><small>{record.artist}<Translation id="originalUi.pdf" /><span role="status">{localizeUi(saveState)}</span></small></div>{exportButton}</header>)}
  {error&&<div role="alert">{localizeUi(error)}<button type="button" onClick={()=>void update(current.current)}><Translation id="pdf.saveAgain" /></button><button type="button" onClick={onClose}><Translation id="pdf.discardUnsavedChangesAndLeave" /></button></div>}{metro.error&&<p role="alert">{localizeUi(metro.error)}</p>}
  <div className="pdfPracticeBody"><main className="pdfDocument">{!roomModel&&!mobile&&<PdfViewToolbar {...{zoom,setZoom,mobile}} previewRoot={shell}><button type="button" className="pdfMappingQuick" aria-label={translateUi("pdf.quickPdfEdit")} aria-pressed={editing} onClick={toggleEditing}>{editing?translateUi("pdf.doneEditing"):translateUi("pdf.quickEdit")}</button><button type="button" className="pdfFullscreen" aria-label={translateUi("pdf.fullscreen")} title={translateUi("pdf.fullscreen")} onClick={()=>void fullscreen.enter()}>⛶</button></PdfViewToolbar>}

   {(!roomModel||analysis||analysisProgress)&&(mobile?<MobilePdfAutoMeasures {...autoMeasureControls}/>:<DesktopPdfAutoMeasures {...autoMeasureControls}/>)}
   {toast&&<div className="pdfEditToast" role="status">{localizeUi(toast.text)}</div>}
   {notice&&<p className="pdfEditNotice" role="alert">{localizeUi(notice)}<button type="button" onClick={()=>setNotice('')}><Translation id="common.close" /></button></p>}
   <div ref={fullscreen.ref} className={`pdfScoreStage ${fullscreen.active?'is-fullscreen':''}`} aria-label={translateUi("pdf.pdfScoreArea")}>
   <button className="pdfLocateOverlay" type="button" onClick={locateCurrent} disabled={!bars.length||editing} title={translateUi("pdf.goToCurrentPosition")} aria-label={translateUi("pdf.goToCurrentPosition")}><LocateFixed size={19}/></button>
   {fullscreen.active&&<div className="pdfFullscreenControls" role="group" aria-label={translateUi("pdf.fullscreenScoreControls")}><button type="button" aria-label={translateUi("pdf.fullscreenPreviousPage")} disabled={page<=1} onClick={()=>goPage(page-1)}>‹</button><span>{page} / {record.pageCount}</span><button type="button" aria-label={translateUi("pdf.fullscreenNextPage")} disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>›</button><button type="button" aria-label={translateUi("pdf.closeFullscreenScore")} onClick={()=>void fullscreen.exit()}><Translation id="pdf.close" /></button></div>}
   <PageView detectionOverlay={analysis} detectionDebug={false} onGapCut={cutGap} followRequest={followRequest} emphasize={Boolean(record.highlight)} documentId={`${record.id}:${record.fingerprint}`} thumbnail={record.thumbnail} mobile={mobile} onZoomChange={setMobileZoom} zoomController={zoomController} pageCount={record.pageCount} pageEdits={original?{}:record.pageEdits} onPageSeen={n=>{if(!metro.playing&&current.current.lastPage!==n)void update({lastPage:n});}} pageEdit={original?undefined:record.pageEdits?.[page]} editing={editing&&!original} editTool={editing&&!original?editTool:null} cropDraft={cropDraft} annotation={{pen,noteDraft,onNoteDraft:setNoteDraft,onSaveNote:saveNote,onUpdateNote:(note,n)=>editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).map(item=>item.id===note.id?note:item)},n),onCancelNote:()=>{setNoteDraft(null);setNotice('');},onDeleteNote:(id,n)=>{editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).filter(note=>note.id!==id)},n);setNoteDraft(null);},onStroke:(stroke,n)=>{const strokes=current.current.pageEdits?.[n]?.strokes??[];if(strokes.length>=1000){setNotice(ko["pdf.eachPageCanStoreUpTo1000StrokesRemoveUnnecessaryStrokes"]);return;}editPage({strokes:[...strokes,stroke]},n);},onUpdateStroke:(stroke,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).map(s=>s.id===stroke.id?stroke:s)},n),onDeleteStroke:(id,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).filter(s=>s.id!==id)},n),onCropDraft:(rect,n)=>setCropDraft({rect,page:n})}} onTextPoint={(point,n=page)=>{if(noteDraft&&noteDraft.page!==n){setNotice(ko["pdf.saveOrCancelTheCurrentNoteBeforeWritingOnAnotherPage"]);return;}setNoteDraft(d=>d??{id:crypto.randomUUID(),page:n,...point,text:'',size:.035,color:'brown'});}} onSelectNote={(note,n=page)=>{if(noteDraft&&noteDraft.id!==note.id){setNotice(ko["pdf.saveOrCancelTheNoteYouReEditing"]);return;}metro.stop();setMapping(false);setEditTool('select');setNoteDraft({...note,page:n});}} onUpdateBoundary={(number,index,value)=>applyEdit({barMap:setPdfBarBoundary(current.current.barMap,number,index,value)})} onUpdateRow={(number,rect)=>applyEdit({barMap:movePdfRow(current.current.barMap,number,rect)})} rowMap={original||analysis||analysisProgress?emptyBars:record.barMap??emptyBars} {...{blob,mapping,barMap:bars,activeBar,selectedBar,getBarPosition,snapRows,draftRow,rowCount}} onCountPreview={setRowCount} onCommitRow={commitRow} onCancelRow={()=>setDraftRow(null)} playing={metro.playing} pageNumber={page} zoom={zoom} barMap={original||analysis||analysisProgress?emptyBars:bars} onAdd={addBar} onSelect={analysis?()=>{}:selectBar} onRemove={removeBar} onDeselect={()=>setSelectedBar(null)}/>
   {fullscreen.active&&toolbar}</div>
   {!mobile&&bars.length>0&&<div className="pdfBarNav"><button type="button" onClick={()=>stepBar(-1)}><Translation id="pdf.previousBar" /></button><span>{activeBar?translateUi("etudes.barValue1", { value1: activeBar }):translateUi("pdf.chooseBar")}</span><button type="button" onClick={()=>stepBar(1)}><Translation id="pdf.nextBar" /></button></div>}
  {!roomModel&&!mobile&&!fullscreen.active&&toolbar}</main>{!roomModel&&!mobile&&<aside className="pdfSettings">{settings}</aside>}</div>{roomModel?(!fullscreen.active&&toolbar):mobile?<div className="pdfPracticeDock">{!fullscreen.active&&toolbar}{controls}</div>:controls}
 </section>;
 if(!roomModel)return document;
 const setMeter=meter=>{metro.stop();void update({meter,barMap:current.current.barMap.map(b=>b.autoGenerated&&b.beats===current.current.meter[0]?{...b,beats:meter[0],meter:[...meter]}:b)});};
 const pdfTools=<ScoreWorkspaceActions mobile={mobile} onCreate={()=>{metro.pause();roomModel.createScore();}} onImport={()=>{metro.pause();roomModel.importPdf();}} importBusy={roomModel.importBusy} onEdit={toggleEditing}><button type="button" role="menuitem" onClick={()=>onMobileAction('info')}><Translation id="pdf.editScoreDetails"/></button>{!mobile&&<button type="button" role="menuitem" onClick={requestReset} disabled={Boolean(noteDraft)}><Translation id="pdf.resetMeasureAreas"/></button>}<button type="button" role="menuitem" onClick={()=>onMobileAction('fit')}><Translation id="components.fitWidth"/></button><button type="button" role="menuitem" onClick={()=>onMobileAction('reset')}><Translation id="pdf.resetCrop"/></button><button type="button" role="menuitem" onClick={()=>setOriginal(v=>!v)}><Translation id={original?'pdf.editedView':'pdf.originalView'}/></button><button type="button" role="menuitem" onClick={roomModel.layout.enter}><Translation id="pdf.fullscreen"/></button></ScoreWorkspaceActions>;
 const pdfModel={...roomModel,pdfMode:true,pdfTools,selected:{...roomModel.selected,measures:bars.length?bars:[{}]},bpm:record.bpm,setBpm:changeBpm,startBar:Math.max(0,bars.findIndex(b=>b.number===activeBar)),playPosition:{bar:Math.max(0,bars.findIndex(b=>b.number===activeBar)),playing:metro.playing},setMeterOverride:setMeter,toggleMetro:()=>{if(roomModel.toolsVisible||roomModel.metroMinimized)metro.pause();roomModel.setToolsVisible(!roomModel.toolsVisible);roomModel.setMetroMinimized(false);}};
 const pageTools=<>{editing&&<button type="button" onClick={toggleEditing}><Translation id="pdf.doneEditing"/></button>}<div className="pdfRoomPageNav"><button type="button" aria-label={translateUi('pdf.previousPdfPage')} disabled={page<=1} onClick={()=>goPage(page-1)}>‹</button><span>{page}/{record.pageCount}</span><button type="button" aria-label={translateUi('pdf.nextPdfPage')} disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>›</button></div><div className="pdfMobileMeasureTools"><MobilePdfMeasureSettings hasBars={Boolean(record.barMap?.length)} disabled={Boolean(noteDraft)} busy={Boolean(analysisProgress)||Boolean(analysis)} onAnalyse={requestAnalysis} onReset={requestReset}/>{exportButton}{pdfTools}</div></>;
 const desktopTools=<DesktopPdfTools {...{zoom,setZoom,page,editing,original}} previewRoot={shell} pageCount={record.pageCount} onPage={goPage} onEdit={toggleEditing} onOriginal={()=>onMobileAction('original')} onFullscreen={()=>void fullscreen.enter()} onAnalyse={requestAnalysis} onReset={requestReset} hasBars={Boolean(record.barMap?.length)} busy={Boolean(analysisProgress)||Boolean(analysis)} hasDraft={Boolean(noteDraft)||Boolean(draftRow)||Boolean(cropDraft)} onCreate={()=>{metro.pause();roomModel.createScore();}} onImport={()=>{metro.pause();roomModel.importPdf();}} importBusy={roomModel.importBusy} onSave={savePdf} saving={exporting}/>;
 pdfModel.pdfTools=mobile?pageTools:desktopTools;
 const practiceControls={countIn,onCountInChange:changeCountIn,countingIn:metro.countingIn,bpm:record.bpm,onBpm:changeBpm,meter:record.meter,beat:metro.playing?metro.beat:-1,playing:metro.playing,paused:metro.paused,disabled:editing||Boolean(analysis)||Boolean(analysisProgress),onStart:toggle,onPause:pausePractice,onResume:toggle,onStop:resetPractice,click:record.audible!==false,onClickSound:()=>void update({audible:record.audible===false}),sound:false,onSound:()=>{},error:metro.error};
 return <><PracticeSheet model={pdfModel} mobile={mobile} desktopPicker={desktopPicker} desktopStorage={desktopStorage} externalContent={document} externalTools={mobile?pageTools:desktopTools}/><div className="etudeFloatingTheme"><PracticeFloatingTools model={pdfModel} mobile={mobile} practiceControls={practiceControls}/></div></>;
}
