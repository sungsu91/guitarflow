import {memo,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {loadPdfTask} from './pdfRenderer.js';
import {canvasSize,normalizedRect,alignBarRow,splitBarRow} from './pdfModel.js';
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
export default memo(function PdfPage({blob,pageNumber,zoom,barMap,activeBar,selectedBar,mapping,onAdd,onSelect,onRemove,onDeselect,playing,getBarPosition,snapRows,draftRow,rowCount}) {
 const viewportRef=useRef(null),paperRef=useRef(null),canvasRef=useRef(null),deleteRef=useRef(null),drag=useRef(null);
 const [pdf,setPdf]=useState(null),[width,setWidth]=useState(600),[size,setSize]=useState({width:600,height:800}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[preview,setPreview]=useState(null);
 useEffect(()=>{let live=true,task;setPdf(null);setError('');setBusy(true);blob.arrayBuffer().then(data=>{if(!live)return;task=loadPdfTask(new Uint8Array(data));return task.promise;}).then(doc=>{if(live&&doc)setPdf(doc);}).catch(e=>{if(live){setError(e.name==='PasswordException'?'암호가 걸린 PDF입니다. 기기에서 암호를 해제한 사본을 불러오세요.':`PDF를 열지 못했습니다: ${e.message}`);setBusy(false);}});return()=>{live=false;void task?.destroy();};},[blob]);
 useLayoutEffect(()=>{const node=viewportRef.current;const observer=new ResizeObserver(entries=>setWidth(Math.max(160,entries[0].contentRect.width)));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(!pdf)return;let live=true,render,page,finished=false;setBusy(true);setError('');
  (async()=>{try{page=await pdf.getPage(pageNumber);if(!live){page.cleanup();return;}const base=page.getViewport({scale:1}),scale=zoom==='fit'?width/base.width:Number(zoom)/100;const viewport=page.getViewport({scale});const dimensions=canvasSize(viewport.width,viewport.height,devicePixelRatio);const canvas=canvasRef.current;
    // A new canvas per job prevents overlapping PDF.js render tasks sharing it.
    const target=document.createElement('canvas');target.width=dimensions.width;target.height=dimensions.height;target.setAttribute('aria-label',`PDF ${pageNumber}페이지`);canvas.replaceChildren(target);setSize({width:viewport.width,height:viewport.height});
    pdfRenderStats.started++;pdfRenderStats.maxPixels=Math.max(pdfRenderStats.maxPixels,target.width*target.height);
    render=page.render({canvasContext:target.getContext('2d'),viewport,transform:[dimensions.ratio,0,0,dimensions.ratio,0,0]});await render.promise;finished=true;
    if(live){pdfRenderStats.completed++;setBusy(false);canvas.dataset.page=String(pageNumber);canvas.dataset.renderCount=String(Number(canvas.dataset.renderCount??0)+1);}
  }catch(e){if(live&&e.name!=='RenderingCancelledException'){setError(`페이지 표시 실패: ${e.message}`);setBusy(false);}}finally{page?.cleanup();}})();
  return()=>{live=false;if(render&&!finished){render.cancel();pdfRenderStats.cancelled++;}};
 },[pdf,pageNumber,zoom,width]);
 useEffect(()=>{viewportRef.current.scrollTop=0;viewportRef.current.scrollLeft=0;},[pageNumber]);
 useEffect(()=>{if(activeBar&&!mapping)paperRef.current.querySelector(`[data-pdf-bar="${activeBar}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});},[activeBar,mapping,size]);
 const point=e=>{const box=paperRef.current.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))};};
 const inside=(node,e)=>{const r=node.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;};
 // Touch browsers may retarget a nearby blank-space touch to a small bar button.
 // Only the actual rectangle owns selection; adjacent whitespace can still start a new bar.
 const down=e=>{const button=e.target.closest('button');if(button&&(!button.matches('.pdfBar')||inside(button,e)))return;onDeselect?.();if(!mapping||busy||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current=point(e);setPreview({...drag.current,width:0,height:0});};
 const up=e=>{if(!drag.current)return;const rect=normalizedRect(drag.current,point(e));drag.current=null;setPreview(null);if(rect.width>.015&&rect.height>.015)onAdd({...rect,page:pageNumber});};
 useEffect(()=>{drag.current=null;setPreview(null);},[pageNumber,zoom,mapping]);
 const selected=barMap.find(b=>b.number===selectedBar&&b.page===pageNumber);
 const currentBar=barMap.find(b=>b.number===activeBar&&b.page===pageNumber);
 useLayoutEffect(()=>{
  if(!selected||busy)return;
  const viewport=viewportRef.current;let frame;
  const place=()=>{const node=deleteRef.current;if(!node)return;const p=paperRef.current.getBoundingClientRect(),v=viewport.getBoundingClientRect();
   const x=(selected.x+selected.width)*p.width+4;
   node.style.left=`${Math.max(0,Math.min(p.width-48,Math.max(v.left-p.left+4,Math.min(x,v.right-p.left-52))))}px`;
  };
  const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();viewport.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);
  return()=>{cancelAnimationFrame(frame);viewport.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);};
 },[selected,size,busy]);
 return <div className="pdfViewport" ref={viewportRef} aria-busy={busy}>
  {busy&&<p className="pdfPageStatus" role="status">페이지 준비 중…</p>}{error&&<p role="alert">{error}</p>}
  <div ref={paperRef} className={`pdfPaper ${mapping?'is-mapping':''}`} style={size} data-pointer-interaction-scope={mapping?'pdf-mapping':undefined} onPointerDown={down} onPointerMove={e=>{if(drag.current)setPreview(alignBarRow({...normalizedRect(drag.current,point(e)),page:pageNumber},barMap,snapRows));}} onPointerUp={up} onPointerCancel={()=>{drag.current=null;setPreview(null);}}>
   <div className="pdfCanvas" ref={canvasRef}/>
   {!busy&&barMap.filter(b=>b.page===pageNumber).map(b=><button type="button" data-pdf-bar={b.number} key={b.number} ref={node=>{if(node){node.style.setProperty('background',activeBar===b.number?'rgba(217,163,60,.16)':'rgba(188,139,52,.035)','important');node.style.setProperty('box-shadow','none','important');}}} className={`pdfBar ${activeBar===b.number?'is-active':''} ${selectedBar===b.number?'is-selected':''}`} style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`}} aria-label={`${b.number}마디 선택`} onPointerDown={e=>{if(inside(e.currentTarget,e))e.stopPropagation();}} onClick={e=>{e.stopPropagation();onSelect(b.number);}}><span>{b.number}</span></button>)}
   {!busy&&selected&&<button ref={deleteRef} type="button" className="pdfBarDelete" aria-label={`${selected.number}마디 영역 삭제`} style={{left:Math.max(0,Math.min(size.width-48,(selected.x+selected.width)*size.width+4)),top:Math.max(0,selected.y*size.height)}} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onRemove(selected.number);}}>삭제</button>}
   {!busy&&currentBar&&<BarPlayhead bar={currentBar} playing={playing} getBarPosition={getBarPosition}/>}
   {!busy&&draftRow?.page===pageNumber&&splitBarRow(draftRow,rowCount).map((b,i)=><div key={i} className="pdfRowDraft" style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`}}><span>{i+1}</span></div>)}
   {preview&&<div className="pdfBarPreview" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`,width:`${preview.width*100}%`,height:`${preview.height*100}%`}}/>}
  </div>
 </div>;
});
