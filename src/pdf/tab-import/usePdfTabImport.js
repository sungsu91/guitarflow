import {useEffect,useRef,useState} from 'react';
import {importPdfTab} from './importPdfTab.js';
import {tabSourceKind} from './imageTabSource.js';
import {photoFilesToAdd,preparePhoto,importPhotoBatch} from './photoBatch.js';
import {prepareInstrumentOutput,recognitionTarget,automaticBassSourcePitch} from './instrumentOutput.js';
import {analysisPartOptions} from './photoParts.js';
import {resolveImportTarget,withImportPitchDefault} from './importTarget.js';
import {importTargetOptions,selectImportInstrument,selectImportTuning} from './importTargetOptions.js';
import {containModalTouch} from '../../ui/modalScrollLock.js';
import {IMPORT_PAGE_BATCH,retainImportPages} from './importCheckpoint.js';
import {detectPhotoPaper} from './paperScan.js';
import {loadTabImage} from './imageTabSource.js';

// One controller owns jobs, page order and drafts across both layouts.
export default function usePdfTabImport({onClose,onOpen,active=true,layout,target:requestedTarget}){
  const notationPitchOverride=useRef(requestedTarget?.notationPitch);
  const [targetState,setTargetState]=useState(()=>{try{return {target:withImportPitchDefault(requestedTarget,notationPitchOverride.current)};}catch(e){return {targetError:e.message};}});
  const {target,targetError}=targetState;
  const dialog=useRef(null),job=useRef(null),generation=useRef(0),generated=useRef(null),openingRef=useRef(false),busyRef=useRef(false);
  const [pdfFile,setPdfFile]=useState(null),[photos,setPhotos]=useState([]),[photoIndex,setPhotoIndex]=useState(0),[sourceMode,setSourceMode]=useState(requestedTarget?.instrument==='piano'?'grand':'staff'),[verifyNotation,setVerifyNotation]=useState(false);
  const [preparing,setPreparing]=useState(false);
  const [busy,setBusy]=useState(false),[opening,setOpening]=useState(false),[progress,setProgress]=useState({progress:0,message:''}),[result,setResult]=useState(null),[error,setError]=useState(''),[attempted,setAttempted]=useState(false);
  const [checkpoint,setCheckpoint]=useState(null),checkpointRef=useRef(null),[paused,setPaused]=useState(false);
  const saveCheckpoint=value=>{checkpointRef.current=value;setCheckpoint(value);};
  const [selectedPart,setSelectedPart]=useState(null),partOptions=analysisPartOptions(result??checkpoint);
  const [elapsedSeconds,setElapsedSeconds]=useState(0),startedAt=useRef(null);
  const [arrangementDocument,setArrangementDocument]=useState(null),[arrangementReview,setArrangementReview]=useState(null);
  useEffect(()=>{if(!busy)return;const tick=()=>setElapsedSeconds(Math.floor((performance.now()-startedAt.current)/1000));tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[busy]);
  const changePart=value=>{if(openingRef.current)return;setSelectedPart(Number(value)||null);generated.current=null;setError('');};
  useEffect(()=>()=>{generation.current++;job.current?.abort();},[]);
  useEffect(()=>{const node=dialog.current,releaseTouch=containModalTouch(node),visible=active&&!arrangementDocument;if(visible&&!node.open)node.showModal();else if(!visible&&node.open)node.close();return()=>{releaseTouch();node.close();};},[active,layout,arrangementDocument]);
  useEffect(()=>{if(error||result)dialog.current?.querySelector('.mobilePdfTabBody,.desktopPdfTabBody')?.scrollTo({top:0});},[error,result]);
  const invalidate=(fromPage=0,totalPages)=>{generated.current=null;setResult(null);setSelectedPart(null);setError('');setAttempted(false);setPaused(false);saveCheckpoint(fromPage?retainImportPages(checkpointRef.current,fromPage,totalPages):null);};
  // Keep choices local to this import. Cancelling must not retune the editor.
  // An in-flight analysis and its completed result retain their captured target.
  const changeTarget=(select,value)=>{
    if(busyRef.current||openingRef.current||result)return;
    try{setTargetState({target:select(target,value)});invalidate();return true;}
    catch(e){setError(e.message);}
  };
  const changeTargetInstrument=value=>{
    if(busyRef.current||openingRef.current||result)return;
    if(sourceMode==='grand'&&value!=='piano:0'&&!value.startsWith('bass:'))setSourceMode('staff');
    if(changeTarget((current,id)=>withImportPitchDefault(selectImportInstrument(current,id),notationPitchOverride.current),value)){
      if(value==='piano:0')setSourceMode('grand');
    }
  };
  const changeTargetTuning=value=>changeTarget(selectImportTuning,value);
  const changeNotationPitch=value=>changeTarget((current,notationPitch)=>{
    const next=resolveImportTarget({...current,notationPitch});notationPitchOverride.current=notationPitch;return next;
  },value);
  const changeVerifyNotation=value=>{if(busyRef.current||openingRef.current||result)return;setVerifyNotation(value);invalidate();};
  const cancel=()=>{if(busyRef.current&&!preparing){setPaused(true);job.current?.abort();return;}generation.current++;job.current?.abort();onClose();};
  const begin=(preparation=false)=>{job.current?.abort();const controller=new AbortController(),token=++generation.current;job.current=controller;busyRef.current=true;if(!preparation){startedAt.current=performance.now();setElapsedSeconds(0);}setBusy(!preparation);setPreparing(preparation);setError('');setPaused(false);setProgress({progress:checkpointRef.current?checkpointRef.current.completed/checkpointRef.current.totalPages:0,message:''});return {controller,token};};
  const end=token=>{if(token===generation.current){busyRef.current=false;setBusy(false);setPreparing(false);}};
  const select=async(e,append=false)=>{
    const files=[...(e.target.files??[])];e.target.value='';if(!files.length||busyRef.current||openingRef.current||targetError)return;
    let added,isPdf;
    try{
      isPdf=!append&&files.length===1&&tabSourceKind(files[0])==='pdf';
      if(!isPdf)added=photoFilesToAdd(append?photos.map(p=>p.file):[],files);
      if(!isPdf&&!added.length)return;
    }catch(e){setError(e.message);return;}
    // Selection only stages input. PDF parsing, paper detection and OCR wait
    // for the explicit analyze action, using the settings chosen at that time.
    if(isPdf){invalidate();setPdfFile(files[0]);setPhotos([]);setPhotoIndex(0);return;}
    const {controller,token}=begin(true);
    try{
      const prepared=[];
      for(const file of added){
        prepared.push(await preparePhoto(file,{signal:controller.signal}));
      }
      if(token===generation.current){invalidate(append?photos.length:0,append?photos.length+prepared.length:prepared.length);setPdfFile(null);setPhotos(append?[...photos,...prepared]:prepared);setPhotoIndex(append?photos.length:0);}
    }catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{end(token);}
  };
  const run=e=>select(e),addPhotos=e=>select(e,true);
  const removePdf=()=>{if(busyRef.current||openingRef.current)return;setPdfFile(null);invalidate();};
  const updatePhotoScan=scan=>{if(busyRef.current||openingRef.current)return;setPhotos(list=>list.map((photo,index)=>index===photoIndex?{...photo,scan,scanError:null}:photo));invalidate(photoIndex);};
  const previewPhotoScan=async()=>{
    if(busyRef.current||openingRef.current||!photos[photoIndex])return;
    const photo=photos[photoIndex],{controller,token}=begin(true);let source;
    try{source=await loadTabImage(photo.file,{signal:controller.signal});const scan=await detectPhotoPaper(source,{signal:controller.signal});
      if(token===generation.current){setPhotos(list=>list.map(p=>p.id===photo.id?{...p,scan,scanError:null}:p));invalidate(photoIndex);}
    }catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{source?.close();end(token);}
  };
  const rotatePhoto=()=>{if(busyRef.current||opening)return;setPhotos(list=>list.map((photo,index)=>index===photoIndex?{...photo,rotation:(photo.rotation+1)%4}:photo));invalidate(photoIndex);};
  const movePhoto=direction=>{if(busyRef.current||opening)return;const to=photoIndex+direction;if(to<0||to>=photos.length)return;setPhotos(list=>{const next=[...list];[next[to],next[photoIndex]]=[next[photoIndex],next[to]];return next;});setPhotoIndex(to);invalidate(Math.min(to,photoIndex));};
  const removePhoto=()=>{if(busyRef.current||opening)return;setPhotos(list=>list.filter((_,index)=>index!==photoIndex));setPhotoIndex(Math.max(0,photoIndex-1));invalidate(photoIndex,photos.length-1);};
  const changeSourceMode=value=>{
    if(busyRef.current||openingRef.current||result)return;
    if(value==='grand'&&target?.instrument!=='bass')setTargetState({target:withImportPitchDefault({instrument:'piano'},notationPitchOverride.current)});
    else if(value==='tab'&&target?.instrument==='piano')setTargetState({target:withImportPitchDefault({instrument:'guitar'},notationPitchOverride.current)});
    setSourceMode(value);invalidate();
  };
  const analyze=async()=>{
    if((!pdfFile&&!photos.length)||busyRef.current||openingRef.current||targetError||result)return;
    const {controller,token}=begin();generated.current=null;setAttempted(true);
    try{
      const options={sourceMode,target:recognitionTarget(target,sourceMode),verifyNotation,resume:checkpointRef.current,pageLimit:IMPORT_PAGE_BATCH,onCheckpoint:value=>{if(token===generation.current)saveCheckpoint(value);},includeSourcePreview:true,signal:controller.signal,onProgress:p=>{if(token===generation.current)setProgress(p);}};
      const analysis=pdfFile?await importPdfTab(pdfFile,options):await importPhotoBatch(photos,{...options,autoScan:true});
      if(token===generation.current){saveCheckpoint(analysis);if(analysis.complete)setResult(analysis);else if(photos.length)setPhotoIndex(Math.min(analysis.completed,photos.length-1));}
    }
    catch(e){if(token===generation.current){if(e.partialAnalysis){saveCheckpoint(e.partialAnalysis);if(photos.length)setPhotoIndex(Math.min(e.partialAnalysis.completed,photos.length-1));}if(e.name!=='AbortError')setError(e.message);else setPaused(true);}}
    finally{end(token);}
  };
  const open=async(arrange=false,partial=false)=>{
    const analysis=partial?checkpointRef.current:result;
    if(openingRef.current||!analysis||busyRef.current)return;
    openingRef.current=true;setOpening(true);setError('');const token=generation.current;
    try{
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      if(token!==generation.current)return;
      generated.current??=prepareInstrumentOutput(analysis,{target,sourceMode,part:selectedPart,allowPartial:partial});
      const output=generated.current;
      if(output.reviewInstrument){setArrangementReview(output);setArrangementDocument(output.document);}
      else if(arrange===true&&output.document.instrument==='piano'){setArrangementReview(null);setArrangementDocument(output.document);}
      else await onOpen(output.document);
    }catch(e){if(token===generation.current)setError(e.message);}
    finally{openingRef.current=false;if(token===generation.current)setOpening(false);}
  };
  const applyArrangement=async document=>{
    if(openingRef.current)return;
    openingRef.current=true;setOpening(true);setArrangementDocument(null);const token=generation.current;
    try{if(arrangementReview?.reviewInstrument==='bass'&&document.bassArrangement){document.bassArrangement.automatic=true;document.bassArrangement.importCoverage=arrangementReview.document.pdfTabImport?.pageCoverage??null;}await onOpen(document);}catch(e){if(token===generation.current)setError(e.message);}
    finally{openingRef.current=false;if(token===generation.current)setOpening(false);}
  };
  return {automaticSourcePitch:automaticBassSourcePitch(target,sourceMode),checkpoint,paused,batchSize:IMPORT_PAGE_BATCH,openPartial:()=>open(false,true),previewPhotoScan,dialog,busy,preparing,opening,progress,elapsedSeconds,result,selectedPart,partOptions,changePart,target,targetError,targetOptions:importTargetOptions(target),changeTargetInstrument,changeTargetTuning,changeNotationPitch,verifyNotation,changeVerifyNotation,error:targetError||error,cancel,run,addPhotos,open,arrange:()=>open(true),arrangementDocument,arrangementReview,closeArrangement:()=>setArrangementDocument(null),applyArrangement,pdfFile,removePdf,photos,photo:photos[photoIndex],photoIndex,setPhotoIndex,rotation:photos[photoIndex]?.rotation??0,rotatePhoto,movePhoto,removePhoto,updatePhotoScan,analyze,attempted,sourceMode,changeSourceMode};
}
