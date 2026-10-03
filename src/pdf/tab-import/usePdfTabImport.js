import {useEffect,useRef,useState} from 'react';
import {importPdfTab} from './importPdfTab.js';
import {tabSourceKind} from './imageTabSource.js';
import {photoFilesToAdd,preparePhoto,importPhotoBatch} from './photoBatch.js';
import {analysisToDocument} from './scoreAdapter.js';
import {containModalTouch} from '../../ui/modalScrollLock.js';

// One controller owns jobs, page order and drafts across both layouts.
export default function usePdfTabImport({onClose,onOpen,active=true,layout}){
  const dialog=useRef(null),job=useRef(null),generation=useRef(0),generated=useRef(null),openingRef=useRef(false),busyRef=useRef(false);
  const [photos,setPhotos]=useState([]),[photoIndex,setPhotoIndex]=useState(0),[sourceMode,setSourceMode]=useState('staff');
  const [busy,setBusy]=useState(false),[opening,setOpening]=useState(false),[progress,setProgress]=useState({progress:0,message:''}),[result,setResult]=useState(null),[error,setError]=useState(''),[attempted,setAttempted]=useState(false);
  useEffect(()=>()=>{generation.current++;job.current?.abort();},[]);
  useEffect(()=>{const node=dialog.current,releaseTouch=containModalTouch(node);if(active&&!node.open)node.showModal();else if(!active&&node.open)node.close();return()=>{releaseTouch();node.close();};},[active,layout]);
  useEffect(()=>{if(error||result)dialog.current?.scrollTo({top:0});},[error,result]);
  const invalidate=()=>{generated.current=null;setResult(null);setError('');setAttempted(false);};
  const cancel=()=>{generation.current++;job.current?.abort();onClose();};
  const begin=()=>{job.current?.abort();const controller=new AbortController(),token=++generation.current;job.current=controller;busyRef.current=true;setBusy(true);invalidate();setProgress({progress:0,message:''});return {controller,token};};
  const end=token=>{if(token===generation.current){busyRef.current=false;setBusy(false);}};
  const select=async(e,append=false)=>{
    const files=[...(e.target.files??[])];e.target.value='';if(!files.length||busyRef.current||openingRef.current)return;
    let added,isPdf;
    try{
      isPdf=!append&&files.length===1&&tabSourceKind(files[0])==='pdf';
      if(!isPdf)added=photoFilesToAdd(append?photos.map(p=>p.file):[],files);
      if(!isPdf&&!added.length)return;
    }catch(e){setError(e.message);return;}
    const {controller,token}=begin();
    try{
      if(isPdf){setPhotos([]);setPhotoIndex(0);const analysis=await importPdfTab(files[0],{sourceMode,signal:controller.signal,onProgress:p=>{if(token===generation.current)setProgress(p);}});if(token===generation.current)setResult(analysis);}
      else{
        const prepared=[];
        for(const [index,file] of added.entries()){
          setProgress({progress:index/added.length,message:`${index+1} / ${added.length}장 · 사진 준비 중…`});
          prepared.push(await preparePhoto(file,{signal:controller.signal}));
        }
        if(token===generation.current){setPhotos(append?[...photos,...prepared]:prepared);setPhotoIndex(append?photos.length:0);}
      }
    }catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{end(token);}
  };
  const run=e=>select(e),addPhotos=e=>select(e,true);
  const rotatePhoto=()=>{if(busyRef.current||opening)return;setPhotos(list=>list.map((photo,index)=>index===photoIndex?{...photo,rotation:(photo.rotation+1)%4}:photo));invalidate();};
  const movePhoto=direction=>{if(busyRef.current||opening)return;const to=photoIndex+direction;if(to<0||to>=photos.length)return;setPhotos(list=>{const next=[...list];[next[to],next[photoIndex]]=[next[photoIndex],next[to]];return next;});setPhotoIndex(to);invalidate();};
  const removePhoto=()=>{if(busyRef.current||opening)return;setPhotos(list=>list.filter((_,index)=>index!==photoIndex));setPhotoIndex(Math.max(0,photoIndex-1));invalidate();};
  const changeSourceMode=value=>{setSourceMode(value);invalidate();};
  const analyzePhoto=async()=>{
    if(!photos.length||busyRef.current||openingRef.current)return;
    const {controller,token}=begin();setAttempted(true);
    try{const analysis=await importPhotoBatch(photos,{sourceMode,signal:controller.signal,onProgress:p=>{if(token===generation.current)setProgress(p);}});if(token===generation.current)setResult(analysis);}
    catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{end(token);}
  };
  const open=async()=>{
    if(openingRef.current||!result)return;
    openingRef.current=true;setOpening(true);setError('');const token=generation.current;
    try{
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      if(token!==generation.current)return;
      generated.current??=analysisToDocument(result);await onOpen(generated.current);
    }catch(e){if(token===generation.current)setError(e.message);}
    finally{openingRef.current=false;if(token===generation.current)setOpening(false);}
  };
  return {dialog,busy,opening,progress,result,error,cancel,run,addPhotos,open,photos,photo:photos[photoIndex],photoIndex,setPhotoIndex,rotation:photos[photoIndex]?.rotation??0,rotatePhoto,movePhoto,removePhoto,analyzePhoto,attempted,sourceMode,changeSourceMode};
}
