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
function BarPlayhead({bar,playing,getBarPosition}) {
 const line=useRef(null);
 useEffect(()=>{
  let frame;
  const paint=()=>{const position=getBarPosition?.(),node=line.current;
   if(node){const visible=position?.number===bar.number;
    node.hidden=!visible;
    if(visible){node.style.left=`${(bar.x+bar.width*position.progress)*100}%`;node.dataset.progress=String(position.progress);}
   }
   if(playing)frame=requestAnimationFrame(paint);
  };paint();return()=>cancelAnimationFrame(frame);
 },[bar,playing,getBarPosition]);
 return <div ref={line} hidden className="pdfPlayhead" aria-hidden="true" style={{top:`${bar.y*100}%`,height:`${bar.height*100}%`}}/>;
}
export default memo(function PdfPage({mobile=false,onZoomChange,zoomController,blob,documentId,thumbnail,pageEdits,pageCount,onPageReady,pageNumber,zoom,barMap,rowMap,onUpdateRow,activeBar,selectedBar,emphasize=false,mapping,onAdd,onSelect,onRemove,onDeselect,playing,getBarPosition,snapRows,draftRow,rowCount,onCountPreview,onCommitRow,onCancelRow,pageEdit,editTool,cropDraft,onCrop,onTextPoint,onSelectNote,editing=false,annotation,sharedPdf=null,embedded=false}) {
 const boundsRef=useRef(null),viewportRef=useRef(null),paperRef=useRef(null),canvasRef=useRef(null),deleteRef=useRef(null),pickerRef=useRef(null),anchor=useRef(null),press=useRef(null),suppressClick=useRef(false),rowDrag=useRef(null);
 const [pdf,setPdf]=useState(null),[width,setWidth]=useState(0),[viewportHeight,setViewportHeight]=useState(600),[size,setSize]=useState({width:600,height:800}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[preview,setPreview]=useState(null),[firstPoint,setFirstPoint]=useState(null);
 const [showLoading,setShowLoading]=useState(false),[hasCanvas,setHasCanvas]=useState(false);
 const documentKey=pdfDocumentKey(blob,documentId);
 const cropping=editTool==='crop',texting=editTool==='text',inking=editTool==='pen',interactive=mapping;
 const crop=useMemo(()=>pageCrop(pageEdit),[pageEdit?.crop,pageEdit?.margins]);
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
  lease.promise.then(doc=>{if(live)setPdf(doc);}).catch(e=>{if(live){setError(e.name==='PasswordException'?'암호가 걸린 PDF입니다. 기기에서 암호를 해제한 사본을 불러오세요.':`PDF를 열지 못했습니다: ${e.message}`);setBusy(false);}});
  return()=>{live=false;lease.release();};
 },[documentKey,blob,sharedPdf]);
 useLayoutEffect(()=>{const node=viewportRef.current;const observer=new ResizeObserver(entries=>{setWidth(Math.max(160,entries[0].contentRect.width));setViewportHeight(entries[0].contentRect.height);});observer.observe(node);return()=>observer.disconnect();},[]);
 // Paint the retained bitmap before waiting for the worker. Never erase the old canvas.
 useLayoutEffect(()=>{
  if(!width)return;const cached=pdfPageCache.preview(documentKey,pageNumber,JSON.stringify(crop));
  const targetWidth=mobile?width*(Number(zoom)||100)/100:zoom==='fit'||zoom==='page'?width:cached?.size.width??width;
  if(cached){canvasRef.current.replaceChildren(copyPdfCanvas(cached));canvasRef.current.dataset.previewPage=String(pageNumber);setHasCanvas(true);setSize({width:targetWidth,height:targetWidth*cached.size.height/cached.size.width});}
  else if(!canvasRef.current.childElementCount)setSize({width:targetWidth,height:targetWidth*1.414*crop.height/crop.width});
 },[documentKey,pageNumber,width,crop,mobile,zoom]);
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
  }catch(e){if(live&&e.name!=='RenderingCancelledException'&&e.name!=='AbortError'){setError(`페이지 표시 실패: ${e.message}`);setBusy(false);}}})();
  return()=>{live=false;cancelIdle();controller.abort();if(!finished)pdfRenderStats.cancelled++;};
 },[pdf,documentKey,pageNumber,zoom,width,zoom==='page'?viewportHeight:0,crop,mobile,embedded,pageCount]);
 useEffect(()=>{viewportRef.current.scrollTop=0;viewportRef.current.scrollLeft=0;},[pageNumber]);
 useEffect(()=>{if(activeBar&&!interactive&&!viewportRef.current.closest('[data-pinching=true]'))paperRef.current.querySelector('.pdfBarRow.is-active')?.scrollIntoView({block:'nearest',inline:'nearest'});},[activeBar]);
 const point=e=>{const box=paperRef.current.getBoundingClientRect();return originalPoint({x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))},crop);};
 const paintRow=(node,rect)=>{const r=project(rect);Object.assign(node.style,{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`});};
 const startRowDrag=(e,row,selected)=>{e.stopPropagation();if(!mapping||!editing||!selected||e.button!==0)return;
  rowDrag.current={row,start:point(e),rect:row,node:e.currentTarget,resize:Boolean(e.target.closest('[data-row-resize]')),moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const moveRowDrag=e=>{const d=rowDrag.current;if(!d)return;const p=point(e),dx=p.x-d.start.x,dy=p.y-d.start.y;
  d.moved ||= Math.hypot(dx*size.width,dy*size.height)>4;
  d.rect=d.resize?{...d.row,width:Math.max(.03,Math.min(1-d.row.x,d.row.width+dx)),height:Math.max(.02,Math.min(1-d.row.y,d.row.height+dy))}:{...d.row,x:Math.max(0,Math.min(1-d.row.width,d.row.x+dx)),y:Math.max(0,Math.min(1-d.row.height,d.row.y+dy))};paintRow(d.node,d.rect);
 };
 const finishRowDrag=(e,cancelled=false)=>{const d=rowDrag.current;if(!d)return;rowDrag.current=null;
  if(d.node.hasPointerCapture(e.pointerId))d.node.releasePointerCapture(e.pointerId);
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
 return <div className={`pdfViewport ${embedded?'pdfEmbeddedPage':''}`} ref={viewportRef} data-document-pinch={mobile&&!embedded} aria-busy={busy}>
  {busy&&showLoading&&<p className="pdfPageStatus" role="status">불러오는 중…</p>}{error&&<p role="alert">{error}</p>}
  <div ref={boundsRef} className="pdfZoomBounds" style={size}><div ref={paperRef} data-pinch-anchor className={`pdfPaper ${interactive?'is-mapping':''} ${cropping?'is-cropping':''}`} style={size} tabIndex={0} onClickCapture={e=>{if(suppressClick.current){suppressClick.current=false;e.preventDefault();e.stopPropagation();}}} aria-label={mapping?"PDF 마디 영역 지정":"PDF 악보 페이지"} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancel();}else if(draftRow&&/^[1-4]$/.test(e.key)&&!e.target.matches('input,select,textarea')){e.preventDefault();onCountPreview(Number(e.key));}}} data-pointer-interaction-scope={interactive?'pdf-mapping':undefined} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{press.current=null;}}>
   {!hasCanvas&&thumbnail&&<div className="pdfThumbnailPreview" aria-label="저장된 첫 페이지 미리보기"><img src={thumbnail} alt="" style={{width:`${100/crop.width}%`,height:`${100/crop.height}%`,left:`${-crop.x/crop.width*100}%`,top:`${-crop.y/crop.height*100}%`}}/></div>}
   <div className="pdfCanvas" ref={canvasRef}/>
   {!busy&&!cropping&&rows.filter(r=>r.page===pageNumber).map(row=>{const r=project(row),active=row.bars.some(b=>b.number===activeBar),selected=row.bars.some(b=>b.number===selectedBar);return <button type="button" key={row.number} data-pdf-row={row.number} data-row-count={row.count} className={`pdfBarRow ${active?'is-active':''} ${active&&emphasize?'is-emphasized':''} ${selected&&editing?'is-selected':''}`} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`,pointerEvents:texting||inking?'none':undefined,touchAction:mapping&&selected?'none':undefined}} aria-label={`${row.number}마디부터 ${row.count}마디 줄 선택`} onPointerDown={e=>startRowDrag(e,row,selected)} onPointerMove={moveRowDrag} onPointerUp={e=>finishRowDrag(e)} onPointerCancel={e=>finishRowDrag(e,true)} onClick={e=>{e.stopPropagation();resetPoints();onCancelRow?.();const p=point(e),bar=row.bars.find(b=>p.x>=b.x&&p.x<b.x+b.width)??row.bars.at(-1);onSelect(bar.number,editing?0:Math.max(0,Math.min(.999,(p.x-bar.x)/bar.width)));}}>
    {r.x>.035&&<small className="pdfRowStartNumber" aria-hidden="true">{row.number}~{row.number+row.count-1}마디</small>}
    {mapping&&selected&&<i data-row-resize className="pdfRowResize" aria-label="줄 영역 크기 조절"/>}
    {mapping&&row.bars.slice(1).map(b=><i key={b.number} className="pdfRowGuide" style={{left:`${(b.x-row.x)/row.width*100}%`}}/>)}
   </button>;})}
   {!busy&&selected&&<div ref={deleteRef} className="pdfBarActions" style={{left:Math.max(0,Math.min(size.width-48,(selected.x+selected.width)*size.width+4)),top:Math.max(0,selected.y*size.height)}} onPointerDown={e=>e.stopPropagation()}>

    <button type="button" className="pdfBarDelete" aria-label={`${selected.number}마디부터 줄 영역 삭제`} onClick={e=>{e.stopPropagation();onRemove(selected.number);}}>삭제</button>
   </div>}
   {!busy&&currentBar&&<div className="pdfCurrentMeasure" aria-hidden="true" style={{left:`${currentBar.x*100}%`,top:`${currentBar.y*100}%`,width:`${currentBar.width*100}%`,height:`${currentBar.height*100}%`}}/>}
   {!busy&&currentBar&&<BarPlayhead bar={currentBar} playing={playing} getBarPosition={getBarPosition}/>}
   {!busy&&draftRow?.page===pageNumber&&<div className="pdfRowDraft pdfUnifiedRowDraft" style={{left:`${project(draftRow).x*100}%`,top:`${project(draftRow).y*100}%`,width:`${project(draftRow).width*100}%`,height:`${project(draftRow).height*100}%`}}/>}
   {!mobile&&!busy&&draftRow?.page===pageNumber&&<div className="pdfQuickCount" ref={pickerRef} role="group" aria-label="마디 수 선택" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
    <PdfBarCount startNumber={Math.max(0,...barMap.map(b=>b.number))+1} value={rowCount} onChange={onCountPreview} onApply={commit} onCancel={cancel}/>
   </div>}
   {!busy&&annotation&&<PdfAnnotationLayer {...annotation} {...{paperRef,size,crop,pageEdit,editing}} page={pageNumber} tool={editTool} cropDraft={cropDraft} onTextPoint={onTextPoint} onSelectNote={onSelectNote}/>}
   {firstPoint&&<div className="pdfFirstPoint" style={{left:`${project({...firstPoint,width:0,height:0}).x*100}%`,top:`${project({...firstPoint,width:0,height:0}).y*100}%`}}><span>오른쪽 아래를 누르세요</span></div>}
   {preview&&<div className="pdfBarPreview" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`,width:`${preview.width*100}%`,height:`${preview.height*100}%`}}/>}
  </div></div>
 </div>;
});
