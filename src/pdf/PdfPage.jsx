import PdfGapCutOverlay from './PdfGapCutOverlay.jsx';
import {pageVisibleHeight} from './pdfGapCuts.js';
import ko from "./../i18n/locales/ko.js";
import { formatMessage } from "./../i18n/core.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import PdfAnnotationLayer from './PdfAnnotationLayer.jsx';
import PdfBarCount from './PdfBarCount.jsx';
import useScorePinch from '../hooks/useScorePinch.js';
import {pageCrop,projectRect,originalPoint} from './pdfAnnotations.js';
import {memo,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {pdfPageCache,pdfDocumentKey,renderPdfPage,copyPdfCanvas} from './pdfRenderer.js';
import {idleWork} from './pdfPageCache.js';
import {pdfBarRows} from './pdfBarRows.js';
import {normalizedRect} from './pdfModel.js';
export const pdfRenderStats={started:0,completed:0,cancelled:0,maxPixels:0};
// Only this overlay moves per frame. PDF canvases are unchanged during playback.
function BarPlayhead({bars,pageNumber,crop,playing,getBarPosition}) {
 const line=useRef(null);
 useLayoutEffect(()=>{
  let frame;const byNumber=new Map(bars.map(b=>[b.number,b]));
  const paint=()=>{const position=getBarPosition?.(),node=line.current,bar=byNumber.get(position?.number);
   if(node){const visible=bar?.page===pageNumber;node.hidden=!visible;
    if(visible){const r=projectRect(bar,crop);node.style.left=`${(r.x+r.width*position.progress)*100}%`;node.style.top=`${r.y*100}%`;node.style.height=`${r.height*100}%`;node.dataset.progress=String(position.progress);node.dataset.bar=String(bar.number);}
   }
   if(playing)frame=requestAnimationFrame(paint);
  };paint();return()=>cancelAnimationFrame(frame);
 },[bars,pageNumber,crop,playing,getBarPosition]);
 return <div ref={line} hidden className="pdfPlayhead" aria-hidden="true"/>;
}
export default memo(function PdfPage({mobile=false,onZoomChange,zoomController,blob,documentId,thumbnail,pageEdits,pageCount,onPageReady,pageNumber,zoom,barMap,rowMap,onUpdateRow,onUpdateBoundary,activeBar,selectedBar,followRequest=0,emphasize=false,mapping,onAdd,onSelect,onRemove,onDeselect,playing,getBarPosition,snapRows,draftRow,rowCount,onCountPreview,onCommitRow,onCancelRow,pageEdit,editTool,onGapCut,cropDraft,onCrop,onTextPoint,onSelectNote,editing=false,annotation,sharedPdf=null,embedded=false}) {
  useLanguage();
 const boundsRef=useRef(null),viewportRef=useRef(null),paperRef=useRef(null),canvasRef=useRef(null),deleteRef=useRef(null),pickerRef=useRef(null),anchor=useRef(null),press=useRef(null),suppressClick=useRef(false),rowDrag=useRef(null);
 const [pdf,setPdf]=useState(null),[width,setWidth]=useState(0),[viewportHeight,setViewportHeight]=useState(600),[size,setSize]=useState({width:600,height:800}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[preview,setPreview]=useState(null),[firstPoint,setFirstPoint]=useState(null);
 const [showLoading,setShowLoading]=useState(false),[hasCanvas,setHasCanvas]=useState(false);
 const documentKey=pdfDocumentKey(blob,documentId);
 const cropping=editTool==='crop',texting=editTool==='text',inking=editTool==='pen',interactive=mapping;
 const crop=useMemo(()=>pageCrop(pageEdit),[pageEdit?.crop,pageEdit?.margins,pageEdit?.cuts]);
 useScorePinch({enabled:mobile&&!embedded,viewport:viewportRef,content:paperRef,bounds:boundsRef,zoom:Number(zoom)||100,onZoom:onZoomChange,controller:embedded?null:zoomController});
 const rows=useMemo(()=>pdfBarRows(rowMap??barMap),[rowMap,barMap]);
 const project=rect=>projectRect(rect,crop);
 const resetPoints=()=>{anchor.current=null;press.current=null;setFirstPoint(null);setPreview(null);};
 useEffect(()=>{
  setShowLoading(false);if(!busy)return;
  const timer=setTimeout(()=>setShowLoading(true),200);return()=>clearTimeout(timer);
 },[busy,pageNumber,zoom,width,crop]);
 useEffect(()=>{if(sharedPdf){setPdf(sharedPdf);return;}let live=true;setError('');
  const lease=pdfPageCache.acquire(documentKey,blob);
  lease.promise.then(doc=>{if(live)setPdf(doc);}).catch(e=>{if(live){setError(e.name==='PasswordException'?ko["pdf.thisPdfIsPasswordProtectedImportAnUnlockedCopyFromYourDevice"]:formatMessage(ko["pdf.couldnTOpenPdfValue1"], { value1: e.message }));setBusy(false);}});
  return()=>{live=false;lease.release();};
 },[documentKey,blob,sharedPdf]);
 useLayoutEffect(()=>{const node=viewportRef.current;const observer=new ResizeObserver(entries=>{setWidth(Math.max(160,entries[0].contentRect.width));setViewportHeight(entries[0].contentRect.height);});observer.observe(node);return()=>observer.disconnect();},[]);
 // Paint the retained bitmap before waiting for the worker. Never erase the old canvas.
 useLayoutEffect(()=>{
  if(!width)return;const cached=pdfPageCache.preview(documentKey,pageNumber,JSON.stringify(crop));
  const targetWidth=mobile?width*(Number(zoom)||100)/100:zoom==='page'?Math.min(width,viewportHeight/(cached?cached.size.height/cached.size.width:1.414*pageVisibleHeight(crop)/crop.width)):zoom==='fit'?width:cached?.size.width??width;
  if(cached){canvasRef.current.replaceChildren(copyPdfCanvas(cached));canvasRef.current.dataset.previewPage=String(pageNumber);setHasCanvas(true);setSize({width:targetWidth,height:targetWidth*cached.size.height/cached.size.width});}
  else if(!canvasRef.current.childElementCount)setSize({width:targetWidth,height:targetWidth*1.414*pageVisibleHeight(crop)/crop.width});
 },[documentKey,pageNumber,width,crop,mobile,zoom,viewportHeight]);
 useEffect(()=>{
  if(!pdf||!width)return;let live=true,finished=false,cancelIdle=()=>{};const controller=new AbortController();setBusy(true);setError('');
  const options={width,height:viewportHeight,zoom,mobile,crop,dpr:devicePixelRatio};
  (async()=>{try{
   pdfRenderStats.started++;const result=await renderPdfPage(pdf,documentKey,pageNumber,options,controller.signal);if(!live)return;finished=true;
   const canvas=canvasRef.current;canvas.replaceChildren(copyPdfCanvas(result));setHasCanvas(true);setSize(result.size);setBusy(false);
   pdfRenderStats.completed++;pdfRenderStats.maxPixels=Math.max(pdfRenderStats.maxPixels,result.canvas.width*result.canvas.height);
   canvas.dataset.page=String(pageNumber);canvas.dataset.cacheHit=String(Boolean(result.cacheHit));canvas.dataset.renderCount=String(Number(canvas.dataset.renderCount??0)+1);onPageReady?.(pageNumber);
   if(!embedded)cancelIdle=idleWork(async()=>{
    for(const n of [pageNumber+1,pageNumber-1]){if(!live||controller.signal.aborted)return;if(n<1||n>(pageCount??pdf.numPages))continue;
     try{const result=await renderPdfPage(pdf,documentKey,n,{...options,crop:pageCrop(pageEdits?.[n])},controller.signal);if(!result.cacheHit)pdfPageCache.stats.prefetched++;}catch(e){if(controller.signal.aborted)return;/* Optional prefetch failure never obscures the current page. */}
    }
   });
  }catch(e){if(live&&e.name!=='RenderingCancelledException'&&e.name!=='AbortError'){setError(formatMessage(ko["pdf.couldnTDisplayPageValue1"], { value1: e.message }));setBusy(false);}}})();
  return()=>{live=false;cancelIdle();controller.abort();if(!finished)pdfRenderStats.cancelled++;};
 },[pdf,documentKey,pageNumber,zoom,width,zoom==='page'?viewportHeight:0,crop,mobile,embedded,pageCount]);
 useEffect(()=>{viewportRef.current.scrollTop=0;viewportRef.current.scrollLeft=0;},[pageNumber]);
 useEffect(()=>{
  if(!activeBar||interactive||editing||busy||viewportRef.current.closest('[data-pinching=true]'))return;
  const row=paperRef.current.querySelector('.pdfBarRow.is-active');if(!row)return;
  const viewport=embedded?viewportRef.current.closest('.pdfContinuous'):viewportRef.current;
  const follow=()=>{
   const r=row.getBoundingClientRect(),v=viewport.getBoundingClientRect(),stage=viewport.closest('.pdfScoreStage').getBoundingClientRect();
   const dock=viewport.closest('.pdfPractice')?.querySelector('.pdfPracticeDock')?.getBoundingClientRect();
   const top=Math.max(v.top,stage.top,0),bottom=Math.min(v.bottom,stage.bottom,innerHeight,dock?.top??Infinity),height=bottom-top;
   if(height<=0)return;
   // Reserve room for beams below a user-drawn region and the upcoming line.
   if(followRequest||r.bottom+Math.max(24,r.height*.5)>top+height*.65||r.top<top+12)viewport.scrollTop+=r.top-top-Math.max(16,height*.22);
  };
  follow();const observer=new ResizeObserver(follow);observer.observe(viewport);const stage=viewport.closest('.pdfScoreStage');if(stage!==viewport)observer.observe(stage);
  return()=>observer.disconnect();
 },[activeBar,busy,editing,interactive,embedded,followRequest]);
 const point=e=>{const box=paperRef.current.getBoundingClientRect();return originalPoint({x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))},crop);};
 const paintRow=(node,rect)=>{const r=project(rect);Object.assign(node.style,{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`});};
 const startRowDrag=(e,row,selected)=>{e.stopPropagation();if(!editing||!selected||!['select','bar'].includes(editTool)||e.button!==0)return;
  rowDrag.current={row,start:point(e),rect:row,node:e.currentTarget,resize:Boolean(e.target.closest('[data-row-resize]')),edge:e.target.closest('[data-row-edge]')?.dataset.rowEdge,boundary:e.target.closest('[data-bar-boundary]'),moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const moveRowDrag=e=>{const d=rowDrag.current;if(!d)return;const p=point(e),dx=p.x-d.start.x,dy=p.y-d.start.y;
  d.moved ||= Math.hypot(dx*size.width,dy*size.height)>4;
  if(d.boundary){const index=Number(d.boundary.dataset.barBoundary),left=d.row.bars[index-1],right=d.row.bars[index];d.value=Math.max((left.x-d.row.x)/d.row.width+.01,Math.min((right.x+right.width-d.row.x)/d.row.width-.01,(p.x-d.row.x)/d.row.width));d.boundary.style.left=`${d.value*100}%`;return;}
  if(d.edge){const end=d.row.x+d.row.width,x=d.edge==='left'?Math.max(0,Math.min(end-.03,d.row.x+dx)):d.row.x;d.rect={...d.row,x,width:d.edge==='left'?end-x:Math.max(.03,Math.min(1-x,d.row.width+dx))};paintRow(d.node,d.rect);return;}
  d.rect=d.resize?{...d.row,width:Math.max(.03,Math.min(1-d.row.x,d.row.width+dx)),height:Math.max(.02,Math.min(1-d.row.y,d.row.height+dy))}:{...d.row,x:Math.max(0,Math.min(1-d.row.width,d.row.x+dx)),y:Math.max(0,Math.min(1-d.row.height,d.row.y+dy))};paintRow(d.node,d.rect);
 };
 const finishRowDrag=(e,cancelled=false)=>{const d=rowDrag.current;if(!d)return;rowDrag.current=null;
  if(d.node.hasPointerCapture(e.pointerId))d.node.releasePointerCapture(e.pointerId);
  if(d.boundary){d.boundary.style.left=`${(d.row.bars[Number(d.boundary.dataset.barBoundary)].x-d.row.x)/d.row.width*100}%`;if(!cancelled&&d.moved){suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},0);onUpdateBoundary?.(d.row.number,Number(d.boundary.dataset.barBoundary),d.value);}return;}
  paintRow(d.node,d.row);if(!cancelled&&d.moved){suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},0);onUpdateRow?.(d.row.number,{x:d.rect.x,y:d.rect.y,width:d.rect.width,height:d.rect.height});}
 };
 const inside=(node,e)=>{const r=node.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;};
 // Touch browsers may retarget a nearby blank-space touch to a small bar button.
 // Only the actual rectangle owns selection; adjacent whitespace can still start a new bar.
 const down=e=>{const button=e.target.closest('button');if(button&&(!button.matches('.pdfBar')||inside(button,e)))return;if(busy||draftRow||cropDraft?.page===pageNumber||e.button!==0)return;
  press.current={x:e.clientX,y:e.clientY,id:e.pointerId};
 };
 const up=e=>{const start=press.current;press.current=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>9)return;
  onDeselect?.();if(!interactive)return;
  suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},0);paperRef.current.focus({preventScroll:true});const end=point(e);

  if(!anchor.current){anchor.current=end;setFirstPoint(end);return;}
  const rect=normalizedRect(anchor.current,end);
  const minimum=.015;
  if(rect.width<=minimum||rect.height<=minimum)return;
  resetPoints();onAdd({...rect,page:pageNumber});
 };
 useEffect(()=>{resetPoints();},[pageNumber,mapping,editTool,draftRow]);
 const commit=count=>{paperRef.current.focus({preventScroll:true});onCommitRow(count);};
 const cancel=()=>{resetPoints();onCancelRow?.();paperRef.current.focus({preventScroll:true});};
 useLayoutEffect(()=>{
  if(mobile||!draftRow||busy)return;let frame;const viewport=embedded?viewportRef.current.closest('.pdfContinuous'):viewportRef.current;
  const place=()=>{const node=pickerRef.current;if(!node)return;const p=paperRef.current.getBoundingClientRect(),v=viewport.getBoundingClientRect(),w=node.offsetWidth,h=node.offsetHeight;
   const left=Math.max(v.left,0)-p.left+4,right=Math.min(v.right,innerWidth)-p.left-w-4;
   const top=Math.max(v.top,0)-p.top+4,bottom=Math.min(v.bottom,innerHeight-80)-p.top-h-4;
   node.style.left=`${Math.max(0,Math.min(p.width-w,Math.max(left,Math.min((project(draftRow).x+project(draftRow).width/2)*p.width-w/2,right))))}px`;
   node.style.top=`${Math.max(0,Math.max(top,Math.min((project(draftRow).y+project(draftRow).height/2)*p.height-h/2,bottom)))}px`;
  };const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();pickerRef.current?.querySelector('button')?.focus({preventScroll:true});
  viewport.addEventListener('scroll',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  const resize=new ResizeObserver(schedule);resize.observe(pickerRef.current);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();viewport.removeEventListener('scroll',schedule);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[draftRow,size,busy,mobile]);
 const selectedOriginal=editing?rows.find(r=>r.page===pageNumber&&r.bars.some(b=>b.number===selectedBar)):null;
 const selected=selectedOriginal&&!cropping&&!texting&&!inking?project(selectedOriginal):null;
 const currentOriginal=barMap.find(b=>b.number===activeBar&&b.page===pageNumber);
 const currentBar=currentOriginal?project(currentOriginal):null;
 useLayoutEffect(()=>{
  if(!selected||busy)return;
  const viewport=embedded?viewportRef.current.closest('.pdfContinuous'):viewportRef.current;let frame;
  const place=()=>{const node=deleteRef.current;if(!node)return;const p=paperRef.current.getBoundingClientRect(),v=viewport.getBoundingClientRect();
   const x=(selected.x+selected.width)*p.width+4;
   const y=x+p.left+48>v.right?selected.y*p.height-node.offsetHeight-8:selected.y*p.height;
   node.style.top=`${Math.max(0,Math.min(p.height-node.offsetHeight,Math.max(Math.max(v.top,0)-p.top+4,Math.min(y,Math.min(v.bottom,innerHeight-80)-p.top-node.offsetHeight-4))))}px`;
   node.style.left=`${Math.max(0,Math.min(p.width-48,Math.max(v.left-p.left+4,Math.min(x,v.right-p.left-52))))}px`;
  };
  const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();viewport.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);
  return()=>{cancelAnimationFrame(frame);viewport.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);};
 },[selected,size,busy]);
 return <div className={`pdfViewport ${embedded?'pdfEmbeddedPage':''} ${!mobile&&!embedded&&zoom==='page'?'pdfViewport--pageFit':''}`} ref={viewportRef} data-document-pinch={mobile&&!embedded} aria-busy={busy}>
  {busy&&showLoading&&<p className="pdfPageStatus" role="status"><Translation id="pdf.loading" /></p>}{error&&<p role="alert">{localizeUi(error)}</p>}
  <div ref={boundsRef} className="pdfZoomBounds" style={size}><div ref={paperRef} data-pinch-anchor className={`pdfPaper ${interactive?'is-mapping':''} ${cropping?'is-cropping':''}`} style={size} tabIndex={0} onClickCapture={e=>{if(suppressClick.current){suppressClick.current=false;e.preventDefault();e.stopPropagation();}}} aria-label={mapping?translateUi("pdf.markPdfBars"):translateUi("pdf.pdfScorePage")} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancel();}else if(draftRow&&/^[1-4]$/.test(e.key)&&!e.target.matches('input,select,textarea')){e.preventDefault();onCountPreview(Number(e.key));}}} data-pointer-interaction-scope={interactive?'pdf-mapping':undefined} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{press.current=null;}}>
   {!hasCanvas&&thumbnail&&!crop.cuts?.length&&<div className="pdfThumbnailPreview" aria-label={translateUi("pdf.savedFirstPagePreview")}><img src={thumbnail} alt="" style={{width:`${100/crop.width}%`,height:`${100/crop.height}%`,left:`${-crop.x/crop.width*100}%`,top:`${-crop.y/crop.height*100}%`}}/></div>}
   <div className="pdfCanvas" ref={canvasRef}/>
   {!busy&&!cropping&&rows.filter(r=>r.page===pageNumber).map(row=>{const r=project(row),active=row.bars.some(b=>b.number===activeBar),selected=row.bars.some(b=>b.number===selectedBar);return <button type="button" key={row.number} data-pdf-row={row.number} data-row-count={row.count} className={`pdfBarRow ${active?'is-active':''} ${active&&emphasize?'is-emphasized':''} ${selected&&editing?'is-selected':''}`} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`,pointerEvents:texting||inking?'none':undefined,touchAction:editing&&selected?'none':undefined}} aria-label={translateUi("pdf.selectLineBarsValue1Value2", { value1: row.number, value2: row.count })} onPointerDown={e=>startRowDrag(e,row,selected)} onPointerMove={moveRowDrag} onPointerUp={e=>finishRowDrag(e)} onPointerCancel={e=>finishRowDrag(e,true)} onClick={e=>{e.stopPropagation();resetPoints();onCancelRow?.();const p=point(e),bar=row.bars.find(b=>p.x>=b.x&&p.x<b.x+b.width)??row.bars.at(-1);onSelect(bar.number,editing?0:Math.max(0,Math.min(.999,(p.x-bar.x)/bar.width)));}}>
    {r.x>.035&&<small className="pdfRowStartNumber" aria-hidden="true">{row.number}~{row.number+row.count-1}<Translation id="app.bar" /></small>}
    {editing&&selected&&<i data-row-resize className="pdfRowResize" aria-label={translateUi("pdf.resizeLineRegion")}/>}
    {editing&&selected&&['left','right'].map(edge=><i key={edge} data-row-edge={edge} className={`pdfRowEdge pdfRowEdge--${edge}`} title={translateUi("pdf.dragBarEdge")}/>)}
    {editing&&row.bars.slice(1).map((b,i)=><i key={b.number} data-bar-boundary={selected?i+1:undefined} className={`pdfRowGuide ${selected?'pdfBarBoundary':''}`} style={{left:`${(b.x-row.x)/row.width*100}%`}} title={translateUi("pdf.dragBarBoundary")} role={selected?'slider':undefined} tabIndex={selected?0:undefined} aria-label={translateUi("pdf.dragBarBoundary")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((b.x-row.x)/row.width*100)} onKeyDown={e=>{if(selected&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();onUpdateBoundary?.(row.number,i+1,(b.x-row.x)/row.width+(e.key==='ArrowRight'?.01:-.01));}}} />)}
   </button>;})}
   {!busy&&selected&&<div ref={deleteRef} className="pdfBarActions" style={{left:Math.max(0,Math.min(size.width-48,(selected.x+selected.width)*size.width+4)),top:Math.max(0,selected.y*size.height)}} onPointerDown={e=>e.stopPropagation()}>

    <button type="button" className="pdfBarDelete" aria-label={translateUi("pdf.deleteLineRegionFromBarValue1", { value1: selected.number })} onClick={e=>{e.stopPropagation();onRemove(selected.number);}}><Translation id="common.delete" /></button>
   </div>}
   {!busy&&currentBar&&<div className="pdfCurrentMeasure" aria-hidden="true" style={{left:`${currentBar.x*100}%`,top:`${currentBar.y*100}%`,width:`${currentBar.width*100}%`,height:`${currentBar.height*100}%`}}/>}
   {!busy&&<BarPlayhead bars={barMap} pageNumber={pageNumber} crop={crop} playing={playing} getBarPosition={getBarPosition}/>}
   {!busy&&draftRow?.page===pageNumber&&<div className="pdfRowDraft pdfUnifiedRowDraft" style={{left:`${project(draftRow).x*100}%`,top:`${project(draftRow).y*100}%`,width:`${project(draftRow).width*100}%`,height:`${project(draftRow).height*100}%`}}/>}
   {!mobile&&!busy&&draftRow?.page===pageNumber&&<div className="pdfQuickCount" ref={pickerRef} role="group" aria-label={translateUi("app.chooseTheBarCount")} onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
    <PdfBarCount startNumber={Math.max(0,...barMap.map(b=>b.number))+1} value={rowCount} onChange={onCountPreview} onApply={commit} onCancel={cancel}/>
   </div>}
   {!busy&&editing&&editTool==='cut'&&<PdfGapCutOverlay crop={crop} onCut={(start,end)=>onGapCut(start,end,pageNumber)}/>}
   {!busy&&annotation&&<PdfAnnotationLayer {...annotation} {...{paperRef,size,crop,pageEdit,editing}} page={pageNumber} tool={editTool} cropDraft={cropDraft} onTextPoint={onTextPoint} onSelectNote={onSelectNote}/>}
   {firstPoint&&<div className="pdfFirstPoint" style={{left:`${project({...firstPoint,width:0,height:0}).x*100}%`,top:`${project({...firstPoint,width:0,height:0}).y*100}%`}}><span><Translation id="pdf.tapTheLowerRightCorner" /></span></div>}
   {preview&&<div className="pdfBarPreview" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`,width:`${preview.width*100}%`,height:`${preview.height*100}%`}}/>}
  </div></div>
 </div>;
});
