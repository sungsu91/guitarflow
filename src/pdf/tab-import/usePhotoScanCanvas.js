import {useEffect,useRef,useState} from 'react';
import {drawTabImage} from './imageTabSource.js';
import {scanPhotoSource} from './paperScan.js';
import {fullPaperQuad} from './paperScanGeometry.js';

export const ORIGINAL_PHOTO_SCAN={enabled:false,enhance:true,quad:fullPaperQuad(),version:1};

// Both preview sizes use the same crop, lighting and rotation as photo import.
export function usePhotoScanCanvas(photo,rotation,scan,{maxSide=700,renderWidth=560,fullResolution=false}={}){
 const canvas=useRef(null),[status,setStatus]=useState('loading'),[ratio,setRatio]=useState(photo.width/photo.height);
 useEffect(()=>{
  const controller=new AbortController(),image=new Image(),url=fullResolution&&photo.file?URL.createObjectURL(photo.file):null;let rendered,processed;
  setStatus('loading');
  image.onload=async()=>{
   const source={image,width:image.naturalWidth,height:image.naturalHeight};
   try{
    processed=await scanPhotoSource(source,scan,{signal:controller.signal,maxSide});
    if(controller.signal.aborted)return;
    const rotatedWidth=rotation%2?processed.height:processed.width;
    rendered=drawTabImage(processed,rotation,Math.min(renderWidth,rotatedWidth));
    const node=canvas.current;if(!node)return;
    node.width=rendered.width;node.height=rendered.height;
    node.getContext('2d').drawImage(rendered,0,0);setRatio(rendered.width/rendered.height);setStatus('');
   }catch(e){if(!controller.signal.aborted&&e.name!=='AbortError')setStatus('error');}
   finally{if(processed!==source)processed?.close();if(rendered)rendered.width=rendered.height=0;}
  };
  image.onerror=()=>{if(!controller.signal.aborted)setStatus('error');};image.src=url??photo.preview;
  return()=>{controller.abort();image.onload=image.onerror=null;image.src='';if(url)URL.revokeObjectURL(url);};
 },[photo.preview,photo.file,rotation,scan,maxSide,renderWidth,fullResolution]);
 return {canvas,status,ratio};
}
