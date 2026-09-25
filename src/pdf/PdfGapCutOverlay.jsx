import {useEffect,useRef,useState} from 'react';
import {originalPoint} from './pdfAnnotations.js';
import {t} from '../i18n/core.js';
export default function PdfGapCutOverlay({crop,onCut}){
 const root=useRef(null),gesture=useRef(null),[preview,setPreview]=useState(null);
 const point=e=>{const r=e.currentTarget.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));};
 const cancel=()=>{gesture.current=null;setPreview(null);};
 useEffect(()=>{const viewport=root.current.closest('.pdfContinuous')??root.current.closest('.pdfViewport');viewport.addEventListener('scorepinchstart',cancel);return()=>viewport.removeEventListener('scorepinchstart',cancel);},[]);
 return <div ref={root} className="pdfGapCutOverlay" aria-label={t('pdf.cutGap')} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const y=point(e);gesture.current={y,id:e.pointerId,clientY:e.clientY};setPreview([y,y]);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.stopPropagation();setPreview([g.y,point(e)].sort((a,b)=>a-b));}} onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const [top,bottom]=[g.y,point(e)].sort((a,b)=>a-b);cancel();if(Math.abs(e.clientY-g.clientY)<5)return;onCut(originalPoint({x:0,y:top},crop).y,originalPoint({x:0,y:bottom},crop).y);}} onPointerCancel={cancel}>
  {preview&&<div className="pdfGapCutBand" style={{top:`${preview[0]*100}%`,height:`${(preview[1]-preview[0])*100}%`}}/>}
 </div>;
}
