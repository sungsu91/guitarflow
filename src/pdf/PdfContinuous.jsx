import {pageCrop} from './pdfAnnotations.js';
import useScorePinch from '../hooks/useScorePinch.js';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import PdfPage from './PdfPage.jsx';
import {pdfPageCache,pdfDocumentKey} from './pdfRenderer.js';
import {idleWork} from './pdfPageCache.js';

// One PDF document, lightweight page placeholders, and only the visible page's neighbors rendered.
export default function PdfContinuous({pageCount,pageEdits,onPageSeen,...props}) {
 const bounds=useRef(null),content=useRef(null),root=useRef(null),slots=useRef([]),reported=useRef(props.pageNumber),seen=useRef(onPageSeen),activePage=useRef(props.pageNumber);
 const documentKey=pdfDocumentKey(props.blob,props.documentId);
 const [neighbors,setNeighbors]=useState(false),[readyPage,setReadyPage]=useState(null);
 const [pdf,setPdf]=useState(null),[ratios,setRatios]=useState({}),[width,setWidth]=useState(0),[active,setActive]=useState(props.pageNumber),[error,setError]=useState('');
 useScorePinch({enabled:props.mobile,viewport:root,content,bounds,zoom:Number(props.zoom)||100,onZoom:props.onZoomChange,controller:props.zoomController});
 seen.current=onPageSeen;activePage.current=active;
 const pageReady=useCallback(n=>{if(n===activePage.current)setReadyPage(n);},[]);
 useEffect(()=>{let live=true;setError('');const lease=pdfPageCache.acquire(documentKey,props.blob);
  lease.promise.then(doc=>{if(live)setPdf(doc);}).catch(e=>{if(live)setError(e.name==='PasswordException'?'암호를 해제한 PDF를 불러오세요.':`PDF를 열지 못했습니다: ${e.message}`);});
  return()=>{live=false;lease.release();};
 },[documentKey,props.blob]);
 useEffect(()=>{let live=true;setNeighbors(false);if(readyPage!==active)return;const cancel=idleWork(()=>{if(live)setNeighbors(true);});return()=>{live=false;cancel();};},[active,readyPage]);
 useEffect(()=>{if(!pdf)return;let live=true;
  (async()=>{const sizes={};for(const n of [active,...(neighbors?[active-1,active+1]:[])]){if(n<1||n>pdf.numPages||!live)continue;const page=await pdf.getPage(n),v=page.getViewport({scale:1});sizes[n]={ratio:v.height/v.width,width:v.width};}if(live)setRatios(old=>({...old,...sizes}));})().catch(e=>{if(live)setError(`페이지 크기 확인 실패: ${e.message}`);});return()=>{live=false;};
 },[pdf,active,neighbors]);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([e])=>setWidth(e.contentRect.width));observer.observe(root.current);return()=>observer.disconnect();},[]);
 useLayoutEffect(()=>{
  // Updates reported by scrolling must never scroll the document back to a page boundary.
  if(reported.current===props.pageNumber&&root.current.dataset.initialized)return;
  if(!Object.keys(ratios).length)return;
  root.current.dataset.initialized='true';reported.current=props.pageNumber;setActive(props.pageNumber);
  const slot=slots.current[props.pageNumber];if(slot)root.current.scrollTop+=slot.getBoundingClientRect().top-root.current.getBoundingClientRect().top-12;
 },[props.pageNumber,ratios,width]);
 useEffect(()=>{const node=root.current;let frame,timer;
  const read=()=>{if(root.current.dataset.pinching)return;const top=node.getBoundingClientRect().top+Math.min(80,node.clientHeight*.2);let closest=1;
   for(let n=1;n<=pageCount;n++){const slot=slots.current[n];if(slot&&slot.getBoundingClientRect().top<=top)closest=n;else break;}
   // A short last page cannot align to the viewport top; keep the actual final page selected.
   if(node.scrollHeight>node.clientHeight&&node.scrollHeight-node.scrollTop-node.clientHeight<=2)closest=pageCount;
   setActive(closest);clearTimeout(timer);timer=setTimeout(()=>{if(reported.current!==closest){reported.current=closest;seen.current(closest);}},220);
  };const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(read);};node.addEventListener('scroll',scroll,{passive:true});
  return()=>{node.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);clearTimeout(timer);};
 },[pageCount]);
 return <div ref={root} data-document-pinch={props.mobile} className="pdfViewport pdfContinuous" aria-label="전체 PDF 페이지 세로 보기">
  {error&&<p role="alert">{error}</p>}
  <div ref={bounds} className="pdfContinuousBounds" style={props.mobile?{width:width*(Number(props.zoom)||100)/100}:undefined}><div ref={content} className="pdfContinuousPages">
  {Array.from({length:pageCount},(_,i)=>{const n=i+1,edit=pageEdits?.[n],crop=pageCrop(edit),fitted=props.zoom==='fit'||props.zoom==='page',pageWidth=props.mobile?width*(Number(props.zoom)||100)/100:fitted?width:(ratios[n]?.width??595)*Number(props.zoom)/100*(crop?.width??1),height=pageWidth*(ratios[n]?.ratio??1.414)*(crop?crop.height/crop.width:1);
   return <section key={n} ref={el=>slots.current[n]=el} className="pdfContinuousSlot" data-pdf-page-slot={n} style={{height:height+30,width:props.mobile?pageWidth:Math.max(width,pageWidth)}} aria-label={`${n}페이지`}>
    <div className="pdfPageNumber">{n} / {pageCount}</div>
    {pdf&&width>0&&(n===active||(neighbors&&Math.abs(n-active)<=1))?<PdfPage {...props} onPageReady={pageReady} pageEdits={pageEdits} pageCount={pageCount} sharedPdf={pdf} embedded pageNumber={n} zoom={props.mobile?100:props.zoom==='page'?'fit':props.zoom} pageEdit={edit} draftRow={props.draftRow?.page===n?props.draftRow:null}/>:<div className="pdfPagePlaceholder" style={{height}}>{n===active&&props.thumbnail?<img src={props.thumbnail} alt="저장된 첫 페이지 미리보기" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:`${n}페이지`}</div>}
   </section>;
  })}
 </div></div></div>;
}
