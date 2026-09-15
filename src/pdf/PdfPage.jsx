import PdfAnnotationLayer from './PdfAnnotationLayer.jsx';
import PdfBarCount from './PdfBarCount.jsx';
import useScorePinch from '../hooks/useScorePinch.js';
import {pageCrop,projectRect,originalPoint} from './pdfAnnotations.js';
import {memo,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {loadPdfTask} from './pdfRenderer.js';
import {canvasSize,normalizedRect,splitBarRow} from './pdfModel.js';
export const pdfRenderStats={started:0,completed:0,cancelled:0,maxPixels:0};
// Only this overlay moves per frame. PDF canvases are unchanged during playback.
function BarPlayhead({bar,playing,getBarPosition}) {
 const line=useRef(null);
 useEffect(()=>{
  let frame;
  const paint=()=>{const position=getBarPosition?.(),node=line.current;
   if(node){const visible=playing&&position?.number===bar.number;
    node.hidden=!visible;
    if(visible){node.style.left=`${(bar.x+bar.width*position.progress)*100}%`;node.dataset.progress=String(position.progress);}
   }
   if(playing)frame=requestAnimationFrame(paint);
  };paint();return()=>cancelAnimationFrame(frame);
 },[bar,playing,getBarPosition]);
 return <div ref={line} hidden className="pdfPlayhead" aria-hidden="true" style={{top:`${bar.y*100}%`,height:`${bar.height*100}%`}}/>;
}
export default memo(function PdfPage({mobile=false,onZoomChange,zoomController,blob,pageNumber,zoom,barMap,activeBar,selectedBar,mapping,onAdd,onSelect,onRemove,onDeselect,playing,getBarPosition,snapRows,draftRow,rowCount,onCountPreview,onCommitRow,onCancelRow,copiedBar,onCopy,onPaste,onCancelCopy,pageEdit,editTool,cropDraft,onCrop,onTextPoint,onSelectNote,editing=false,annotation,sharedPdf=null,embedded=false}) {
 const boundsRef=useRef(null),viewportRef=useRef(null),paperRef=useRef(null),canvasRef=useRef(null),deleteRef=useRef(null),pickerRef=useRef(null),anchor=useRef(null),press=useRef(null),suppressClick=useRef(false);
 const [pdf,setPdf]=useState(null),[width,setWidth]=useState(600),[viewportHeight,setViewportHeight]=useState(600),[size,setSize]=useState({width:600,height:800}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[preview,setPreview]=useState(null),[firstPoint,setFirstPoint]=useState(null);
 const cropping=editTool==='crop',texting=editTool==='text',inking=editTool==='pen',interactive=mapping;
 const crop=useMemo(()=>pageCrop(pageEdit),[pageEdit?.crop,pageEdit?.margins]);
 useScorePinch({enabled:mobile&&!embedded,viewport:viewportRef,content:paperRef,bounds:boundsRef,zoom:Number(zoom)||100,onZoom:onZoomChange,controller:embedded?null:zoomController});
 const project=rect=>projectRect(rect,crop);
 const resetPoints=()=>{anchor.current=null;press.current=null;setFirstPoint(null);setPreview(null);};
 useEffect(()=>{if(sharedPdf){setPdf(sharedPdf);return;}let live=true,task;setPdf(null);setError('');setBusy(true);blob.arrayBuffer().then(data=>{if(!live)return;task=loadPdfTask(new Uint8Array(data));return task.promise;}).then(doc=>{if(live&&doc)setPdf(doc);}).catch(e=>{if(live){setError(e.name==='PasswordException'?'암호가 걸린 PDF입니다. 기기에서 암호를 해제한 사본을 불러오세요.':`PDF를 열지 못했습니다: ${e.message}`);setBusy(false);}});return()=>{live=false;void task?.destroy();};},[blob,sharedPdf]);
 useLayoutEffect(()=>{const node=viewportRef.current;const observer=new ResizeObserver(entries=>{setWidth(Math.max(160,entries[0].contentRect.width));setViewportHeight(entries[0].contentRect.height);});observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(!pdf)return;let live=true,render,page,finished=false;setBusy(true);setError('');
  (async()=>{try{page=await pdf.getPage(pageNumber);if(!live){page.cleanup();return;}const base=page.getViewport({scale:1}),scale=mobile?width/(base.width*crop.width)*(Number(zoom)||100)/100:zoom==='page'?Math.min(width/(base.width*crop.width),Math.max(100,viewportHeight)/(base.height*crop.height)):zoom==='fit'?width/(base.width*crop.width):Number(zoom)/100;const viewport=page.getViewport({scale});const dimensions=canvasSize(viewport.width*crop.width,viewport.height*crop.height,devicePixelRatio);const canvas=canvasRef.current;
    // A new canvas per job prevents overlapping PDF.js render tasks sharing it.
    const target=document.createElement('canvas');target.width=dimensions.width;target.height=dimensions.height;target.setAttribute('aria-label',`PDF ${pageNumber}페이지`);canvas.replaceChildren(target);setSize({width:viewport.width*crop.width,height:viewport.height*crop.height});
    pdfRenderStats.started++;pdfRenderStats.maxPixels=Math.max(pdfRenderStats.maxPixels,target.width*target.height);
    render=page.render({canvasContext:target.getContext('2d'),viewport,transform:[dimensions.ratio,0,0,dimensions.ratio,-crop.x*viewport.width*dimensions.ratio,-crop.y*viewport.height*dimensions.ratio]});await render.promise;finished=true;
    if(live){pdfRenderStats.completed++;setBusy(false);canvas.dataset.page=String(pageNumber);canvas.dataset.renderCount=String(Number(canvas.dataset.renderCount??0)+1);}
  }catch(e){if(live&&e.name!=='RenderingCancelledException'){setError(`페이지 표시 실패: ${e.message}`);setBusy(false);}}finally{page?.cleanup();}})();
  return()=>{live=false;if(render&&!finished){render.cancel();pdfRenderStats.cancelled++;}};
 },[pdf,pageNumber,zoom,width,zoom==='page'?viewportHeight:0,crop,mobile]);
 useEffect(()=>{viewportRef.current.scrollTop=0;viewportRef.current.scrollLeft=0;},[pageNumber]);
 useEffect(()=>{if(activeBar&&!interactive&&!viewportRef.current.closest('[data-pinching=true]'))paperRef.current.querySelector(`[data-pdf-bar="${activeBar}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});},[activeBar,interactive]);
 const point=e=>{const box=paperRef.current.getBoundingClientRect();return originalPoint({x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))},crop);};
 const inside=(node,e)=>{const r=node.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;};
 // Touch browsers may retarget a nearby blank-space touch to a small bar button.
 // Only the actual rectangle owns selection; adjacent whitespace can still start a new bar.
 const down=e=>{const button=e.target.closest('button');if(button&&(!button.matches('.pdfBar')||inside(button,e)))return;if(busy||draftRow||cropDraft?.page===pageNumber||e.button!==0)return;
  press.current={x:e.clientX,y:e.clientY,id:e.pointerId};
 };
 const up=e=>{const start=press.current;press.current=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>9)return;
  onDeselect?.();if(!interactive)return;
  suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},0);paperRef.current.focus({preventScroll:true});const end=point(e);
  if(copiedBar){resetPoints();onPaste({...copiedBar,page:pageNumber,x:Math.min(end.x,1-copiedBar.width),y:Math.min(end.y,1-copiedBar.height)});return;}
  if(!anchor.current){anchor.current=end;setFirstPoint(end);return;}
  const rect=normalizedRect(anchor.current,end);
  const minimum=.015;
  if(rect.width<=minimum||rect.height<=minimum)return;
  resetPoints();onAdd({...rect,page:pageNumber});
 };
 useEffect(()=>{resetPoints();},[pageNumber,mapping,editTool,draftRow,copiedBar]);
 const commit=count=>{paperRef.current.focus({preventScroll:true});onCommitRow(count);};
 const cancel=()=>{resetPoints();onCancelRow?.();onCancelCopy?.();paperRef.current.focus({preventScroll:true});};
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
 const selectedOriginal=barMap.find(b=>b.number===selectedBar&&b.page===pageNumber);
 const selected=selectedOriginal&&!cropping&&!texting&&!inking?project(selectedOriginal):null;
 const currentOriginal=barMap.find(b=>b.number===activeBar&&b.page===pageNumber);
 const currentBar=currentOriginal?project(currentOriginal):null;
 useLayoutEffect(()=>{
  if(!selected||busy)return;
  const viewport=embedded?viewportRef.current.closest('.pdfContinuous'):viewportRef.current;let frame;
  const place=()=>{const node=deleteRef.current;if(!node)return;const p=paperRef.current.getBoundingClientRect(),v=viewport.getBoundingClientRect();
   const x=(selected.x+selected.width)*p.width+4;
   node.style.top=`${Math.max(0,Math.min(p.height-node.offsetHeight,Math.max(Math.max(v.top,0)-p.top+4,Math.min(selected.y*p.height,Math.min(v.bottom,innerHeight-80)-p.top-node.offsetHeight-4))))}px`;
   node.style.left=`${Math.max(0,Math.min(p.width-48,Math.max(v.left-p.left+4,Math.min(x,v.right-p.left-52))))}px`;
  };
  const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();viewport.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);
  return()=>{cancelAnimationFrame(frame);viewport.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);};
 },[selected,size,busy]);
 return <div className={`pdfViewport ${embedded?'pdfEmbeddedPage':''}`} ref={viewportRef} data-document-pinch={mobile&&!embedded} aria-busy={busy}>
  {busy&&<p className="pdfPageStatus" role="status">페이지 준비 중…</p>}{error&&<p role="alert">{error}</p>}
  <div ref={boundsRef} className="pdfZoomBounds" style={size}><div ref={paperRef} data-pinch-anchor className={`pdfPaper ${interactive?'is-mapping':''} ${cropping?'is-cropping':''}`} style={size} tabIndex={0} onClickCapture={e=>{if(suppressClick.current){suppressClick.current=false;e.preventDefault();e.stopPropagation();}}} aria-label={mapping?"PDF 마디 영역 지정":"PDF 악보 페이지"} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancel();}else if(draftRow&&/^[1-4]$/.test(e.key)&&!e.target.matches('input,select,textarea')){e.preventDefault();commit(Number(e.key));}}} data-pointer-interaction-scope={interactive?'pdf-mapping':undefined} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{press.current=null;}}>
   <div className="pdfCanvas" ref={canvasRef}/>
   {!busy&&!cropping&&barMap.filter(b=>b.page===pageNumber).map(original=>{const b=project(original);return <button type="button" data-pdf-bar={b.number} key={b.number} ref={node=>{if(node){node.style.setProperty('background',activeBar===b.number?'rgba(217,163,60,.045)':'rgba(188,139,52,.012)','important');node.style.setProperty('box-shadow','none','important');}}} className={`pdfBar ${activeBar===b.number?'is-active':''} ${selectedBar===b.number?'is-selected':''}`} style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`,pointerEvents:texting||inking?'none':undefined}} aria-label={`${b.number}마디 선택`} onPointerDown={e=>{if(inside(e.currentTarget,e))e.stopPropagation();}} onClick={e=>{e.stopPropagation();resetPoints();onCancelRow?.();onSelect(b.number);}}><span>{b.number}</span></button>;})}
   {!busy&&selected&&<div ref={deleteRef} className="pdfBarActions" style={{left:Math.max(0,Math.min(size.width-48,(selected.x+selected.width)*size.width+4)),top:Math.max(0,selected.y*size.height)}} onPointerDown={e=>e.stopPropagation()}>
    <button type="button" className="pdfBarCopy" aria-label={`${selected.number}마디 설정 복사`} onClick={e=>{e.stopPropagation();resetPoints();onCopy(selectedOriginal);}}>복사</button>
    <button type="button" className="pdfBarDelete" aria-label={`${selected.number}마디 영역 삭제`} onClick={e=>{e.stopPropagation();onRemove(selected.number);}}>삭제</button>
   </div>}
   {!busy&&currentBar&&<BarPlayhead bar={currentBar} playing={playing} getBarPosition={getBarPosition}/>}
   {!busy&&draftRow?.page===pageNumber&&splitBarRow(draftRow,rowCount).map(project).map((b,i)=><div key={i} className="pdfRowDraft" style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`}}><span>{i+1}</span></div>)}
   {!mobile&&!busy&&draftRow?.page===pageNumber&&<div className="pdfQuickCount" ref={pickerRef} role="group" aria-label="마디 수 선택" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
    <PdfBarCount value={rowCount} onChange={onCountPreview} onApply={commit} onCancel={cancel}/>
   </div>}
   {!busy&&annotation&&<PdfAnnotationLayer {...annotation} {...{paperRef,size,crop,pageEdit,editing}} page={pageNumber} tool={editTool} cropDraft={cropDraft} onTextPoint={onTextPoint} onSelectNote={onSelectNote}/>}
   {firstPoint&&<div className="pdfFirstPoint" style={{left:`${project({...firstPoint,width:0,height:0}).x*100}%`,top:`${project({...firstPoint,width:0,height:0}).y*100}%`}}><span>오른쪽 아래를 누르세요</span></div>}
   {preview&&<div className="pdfBarPreview" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`,width:`${preview.width*100}%`,height:`${preview.height*100}%`}}/>}
  </div></div>
 </div>;
});
