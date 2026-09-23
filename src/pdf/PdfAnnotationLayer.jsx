import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Hand,PenLine,Type,Crop,Undo2,Redo2,Check,X,Trash2,Move,Settings2,Columns4} from 'lucide-react';
import {ANNOTATION_COLORS,originalPoint,projectRect,resizeCrop,moveStroke} from './pdfAnnotations.js';
import './pdfAnnotationTools.css';

export function PdfAnnotationToolbar({tool,choose,pen,setPen,undo,redo,canUndo,canRedo,children,compact=false}){
  useLanguage();
 const [settings,setSettings]=useState(false),root=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setSettings(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 useEffect(()=>setSettings(tool==='pen'),[tool]);
 return <div className={`pdfAnnotationToolbar ${compact?'pdfAnnotationToolbar--compact':''}`} ref={root}>
  {(children||(!compact&&tool==='pen'))&&<div className={`pdfAnnotationContext ${compact?'pdfAnnotationContext--floating':''}`}>{children}{!compact&&tool==='pen'&&<button type="button" className="pdfPenSettingsButton" aria-label={translateUi("pdf.penSettings")} aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><i className="pdfCurrentPenColor" style={{background:ANNOTATION_COLORS[pen.color]}}/><Translation id="pdf.colorWidth" /></button>}</div>}
  {settings&&<div className="pdfPenPopover" role="group" aria-label={translateUi("pdf.penSettings")}>
   <div><span><Translation id="pdf.color" /></span>{Object.entries(ANNOTATION_COLORS).map(([color,value])=><button key={color} type="button" aria-label={translateUi("pdf.penColorValue1", { value1: color })} aria-pressed={pen.color===color} className="pdfColorChoice" style={{'--swatch':value}} onClick={()=>setPen({...pen,color})}/>)}</div>
   <div><span><Translation id="pdf.width" /></span>{[.0015,.003,.006,.01].map((width,i)=><button key={width} type="button" aria-label={translateUi("pdf.penWidthValue1", { value1: i+1 })} aria-pressed={pen.width===width} onClick={()=>setPen({...pen,width})}><i style={{width:4+i*3,height:4+i*3,borderRadius:'50%',background:'currentColor'}}/></button>)}</div>
   <label><Translation id="pdf.opacity" /><input aria-label={translateUi("pdf.penOpacity")} type="range" min=".1" max="1" step=".1" value={pen.opacity} onChange={e=>setPen({...pen,opacity:Number(e.target.value)})}/></label>
  </div>}
  <div className="pdfAnnotationIcons" role="toolbar" aria-label={translateUi("pdf.pdfEditingTools")}>
   {[["select",ko["pdf.moveSelect"],Hand],["pen",ko["pdf.pen"],PenLine],["text",ko["pdf.text"],Type],["crop",ko["pdf.cropMargins"],Crop],["bar",ko["pdf.setBars"],Columns4]].map(([key,label,Icon])=><button key={key} type="button" aria-label={localizeUi(label)} title={localizeUi(label)} aria-pressed={tool===key} onClick={()=>{if(key==='pen'&&tool==='pen'){setSettings(v=>!v);}else{choose(key);setSettings(key==='pen');}}}><Icon size={21}/></button>)}
   <button type="button" aria-label={translateUi("pdf.undoPdfEdit")} disabled={!canUndo} onClick={undo}><Undo2 size={21}/></button><button type="button" aria-label={translateUi("pdf.redoPdfEdit")} disabled={!canRedo} onClick={redo}><Redo2 size={21}/></button>
  </div>
 </div>;
}

const pathData=(points,h)=>points.map(([x,y],i)=>`${i?'L':'M'}${x*1000},${y*h}`).join(' ');
const handlePositions={nw:[0,0],n:[.5,0],ne:[1,0],e:[1,.5],se:[1,1],s:[.5,1],sw:[0,1],w:[0,.5]};
const handleNames={nw:ko["pdf.topLeft"],n:ko["etudes.above"],ne:ko["pdf.topRight"],e:ko["pdf.right"],se:ko["pdf.bottomRight"],s:ko["etudes.below"],sw:ko["pdf.bottomLeft"],w:ko["pdf.left"]};
export default function PdfAnnotationLayer({paperRef,size,crop,page,pageEdit,tool,editing,pen,onStroke,onUpdateStroke,onDeleteStroke,noteDraft,onNoteDraft,onSaveNote,onUpdateNote,onDeleteNote,onCancelNote,onTextPoint,onSelectNote,cropDraft,onCropDraft}){
  useLanguage();
 const livePath=useRef(null),gesture=useRef(null),frame=useRef(0),form=useRef(null),text=useRef(null);
 const [selected,setSelected]=useState(null),[properties,setProperties]=useState(false),[cropPreview,setCropPreview]=useState(null);
 const h=1000*(size.height/crop.height)/(size.width/crop.width),drawing=editing&&tool==='pen',cropping=editing&&tool==='crop';
 const draft=noteDraft?.page===page?noteDraft:null;
 const projection=r=>projectRect(r,crop);
 const toPoint=e=>{const r=paperRef.current.getBoundingClientRect();return originalPoint({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))},crop);};
 const cancelGesture=()=>{cancelAnimationFrame(frame.current);frame.current=0;const g=gesture.current;if(g?.node)g.node.style.transform=g.transform??'';gesture.current=null;livePath.current?.setAttribute('d','');setCropPreview(null);};
 useEffect(()=>{
  const viewport=paperRef.current.closest('.pdfContinuous')??paperRef.current.closest('.pdfViewport');
  const cancel=()=>cancelGesture();viewport.addEventListener('scorepinchstart',cancel);
  return()=>{cancelAnimationFrame(frame.current);viewport.removeEventListener('scorepinchstart',cancel);};
 },[]);
 useEffect(()=>{setSelected(null);setProperties(false);cancelGesture();},[page,tool,editing]);
 useLayoutEffect(()=>{
  if(!draft)return;const input=text.current;input?.focus({preventScroll:true});
  const reveal=()=>{if(!input)return;const r=input.getBoundingClientRect(),v=window.visualViewport;const bottom=(v?.offsetTop??0)+(v?.height??innerHeight)-12;if(r.bottom>bottom){const scroll=paperRef.current.closest('.pdfContinuous')??paperRef.current.closest('.pdfViewport');scroll.scrollTop+=r.bottom-bottom;}};
  window.visualViewport?.addEventListener('resize',reveal);return()=>window.visualViewport?.removeEventListener('resize',reveal);
 },[draft?.id]);
 const capture=(e,data)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();gesture.current={...data,id:e.pointerId,start:toPoint(e),client:{x:e.clientX,y:e.clientY},node:e.currentTarget,transform:e.currentTarget.style.transform};e.currentTarget.setPointerCapture(e.pointerId);};
 const beginPen=e=>{if(!drawing||e.button!==0)return;const point=toPoint(e);capture(e,{kind:'pen',points:[[point.x,point.y]],pen:{...pen}});livePath.current.setAttribute('d',pathData([[point.x,point.y],[point.x+.00001,point.y]],h));};
 const move=e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const p=toPoint(e);g.end=p;
  if(g.kind==='pen'){for(const event of e.nativeEvent?.getCoalescedEvents?.()??[e]){const pt=toPoint(event),last=g.points.at(-1);if(Math.hypot(pt.x-last[0],pt.y-last[1])>.0002)g.points.push([pt.x,pt.y]);}if(g.points.length>20000)g.points=g.points.filter((_,i)=>i%2===0);}
  if(frame.current)return;frame.current=requestAnimationFrame(()=>{frame.current=0;if(gesture.current!==g)return;
   if(g.kind==='pen')livePath.current?.setAttribute('d',pathData(g.points,h));
   if(g.kind==='crop')setCropPreview(resizeCrop(g.rect,g.handle,g.end,crop));
   if(['note','saved-note','stroke'].includes(g.kind))g.node.style.transform=`translate(${(g.end.x-g.start.x)/crop.width*size.width}px,${(g.end.y-g.start.y)/crop.height*size.height}px) ${g.transform??''}`;
  });
 };
 const end=e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();cancelAnimationFrame(frame.current);frame.current=0;gesture.current=null;g.node.style.transform=g.transform??'';const p=toPoint(e),distance=Math.hypot(e.clientX-g.client.x,e.clientY-g.client.y);
  if(g.kind==='pen'){livePath.current?.setAttribute('d','');onStroke({id:crypto.randomUUID(),points:g.points.length===1?[g.points[0],[Math.min(1,g.points[0][0]+.00001),g.points[0][1]]]:g.points,...g.pen},page);}
  if(g.kind==='crop'){setCropPreview(null);onCropDraft(resizeCrop(g.rect,g.handle,p,crop),page);}
  if(g.kind==='stroke'){setSelected(g.item.id);if(distance>4)onUpdateStroke(moveStroke(g.item,p.x-g.start.x,p.y-g.start.y),page);}
  if(g.kind==='saved-note'){if(distance>4){onUpdateNote({...g.item,x:Math.max(crop.x,Math.min(crop.x+crop.width-.02,g.item.x+p.x-g.start.x)),y:Math.max(crop.y,Math.min(crop.y+crop.height-.02,g.item.y+p.y-g.start.y))},page);}else onSelectNote(g.item,page);}
  if(g.kind==='note'&&distance>4)onNoteDraft({...draft,x:Math.max(0,Math.min(.98,draft.x+p.x-g.start.x)),y:Math.max(0,Math.min(.98,draft.y+p.y-g.start.y))});
 };
 const gestures={onPointerMove:move,onPointerUp:end,onPointerCancel:cancelGesture};
 const selectedStroke=pageEdit?.strokes?.find(s=>s.id===selected);
 const rect=cropPreview??(cropDraft?.page===page?cropDraft.rect:crop),r=projection(rect);
 const existingNote=Boolean(draft&&(pageEdit?.notes??[]).some(n=>n.id===draft.id));
 const notePos=draft?projection({...draft,width:0,height:0}):null;
 return <div className="pdfAnnotationLayer" data-tool={editing?tool:'view'}>
  <svg className="pdfInkLayer" viewBox={`${crop.x*1000} ${crop.y*h} ${crop.width*1000} ${crop.height*h}`} preserveAspectRatio="none" style={{pointerEvents:drawing?'auto':'none',touchAction:'none'}} onPointerDown={beginPen} {...gestures}>
   {(pageEdit?.strokes??[]).map(stroke=><g key={stroke.id} data-pdf-stroke={stroke.id}><path d={pathData(stroke.points,h)} fill="none" stroke={ANNOTATION_COLORS[stroke.color]??ANNOTATION_COLORS.brown} strokeWidth={stroke.width*1000} opacity={stroke.opacity} strokeLinecap="round" strokeLinejoin="round"/>{editing&&tool==='select'&&<path d={pathData(stroke.points,h)} fill="none" stroke="transparent" strokeWidth={Math.max(stroke.width*1000,18*1000/(size.width/crop.width))} pointerEvents="stroke" style={{touchAction:'none',cursor:'move'}} onPointerDown={e=>{capture(e,{kind:'stroke',item:stroke});if(gesture.current)gesture.current.node=e.currentTarget.parentNode;}} {...gestures}/>}</g>)}
   {selectedStroke&&tool==='select'&&<rect x={Math.min(...selectedStroke.points.map(p=>p[0]))*1000-5} y={Math.min(...selectedStroke.points.map(p=>p[1]))*h-5} width={(Math.max(...selectedStroke.points.map(p=>p[0]))-Math.min(...selectedStroke.points.map(p=>p[0])))*1000+10} height={(Math.max(...selectedStroke.points.map(p=>p[1]))-Math.min(...selectedStroke.points.map(p=>p[1])))*h+10} fill="none" stroke="#806346" strokeWidth={1.5*1000/(size.width/crop.width)} strokeDasharray="5 4" pointerEvents="none"/>}
   <path ref={livePath} fill="none" stroke={ANNOTATION_COLORS[pen.color]} strokeWidth={pen.width*1000} opacity={pen.opacity} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  {(pageEdit?.notes??[]).filter(n=>n.id!==draft?.id).map(note=>{const p=projection({...note,width:0,height:0});return <button key={note.id} type="button" tabIndex={editing?0:-1} data-pdf-note={note.id} className="pdfAnnotationText" style={{left:`${p.x*100}%`,top:`${p.y*100}%`,fontSize:size.width/crop.width*note.size,color:ANNOTATION_COLORS[note.color],transform:note.rotation?`rotate(${note.rotation}deg)`:undefined,pointerEvents:editing&&['select','text'].includes(tool)?'auto':'none',touchAction:'none',cursor:editing?'grab':undefined}} onPointerDown={e=>{if(editing&&!noteDraft)capture(e,{kind:'saved-note',item:note});else e.stopPropagation();}} {...gestures} onClick={e=>{e.stopPropagation();if(editing&&e.detail===0)onSelectNote(note,page);}}>{note.text}</button>;})}
  {editing&&tool==='text'&&!draft&&<div className="pdfTextTarget" onPointerDown={e=>{if(e.button===0)capture(e,{kind:'text'});}} onPointerUp={e=>{const g=gesture.current;gesture.current=null;if(g?.kind==='text'&&Math.hypot(e.clientX-g.client.x,e.clientY-g.client.y)<9){e.stopPropagation();onTextPoint(toPoint(e),page);}}} onPointerCancel={cancelGesture}/>}
  {draft&&<form ref={form} className="pdfInlineText" aria-label={translateUi("pdf.editPdfTextNote")} style={{left:Math.max(0,Math.min(notePos.x*size.width,size.width-190)),top:`${notePos.y*100}%`,maxWidth:Math.min(240,size.width)}} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();onSaveNote();setProperties(false);}}>
   <input ref={text} aria-label={translateUi("pdf.scoreNote")} enterKeyHint="done" maxLength={1000} style={{width:`${Math.max(70,Math.min(210,(draft.text.length+2)*size.width/crop.width*draft.size))}px`,fontSize:Math.max(16,size.width/crop.width*draft.size),color:ANNOTATION_COLORS[draft.color]}} value={draft.text} onChange={e=>onNoteDraft({...draft,text:e.target.value})} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onCancelNote();}}}/>
   <div className="pdfInlineActions">{existingNote&&<button aria-label={translateUi("pdf.moveNote")} type="button" title={translateUi("pdf.dragToMove")} style={{touchAction:'none'}} onPointerDown={e=>{capture(e,{kind:'note'});if(gesture.current)gesture.current.node=form.current;}} {...gestures}><Move size={16}/></button>}<button type="submit" aria-label={translateUi("pdf.saveNote")} disabled={!draft.text.trim()}><Check size={17}/></button><button type="button" aria-label={translateUi("pdf.cancelNote")} onClick={()=>{setProperties(false);onCancelNote();}}><X size={17}/></button>{existingNote&&<><button type="button" aria-label={translateUi("pdf.noteProperties")} onClick={()=>setProperties(v=>!v)}><Settings2 size={16}/></button><button type="button" aria-label={translateUi("pdf.deleteNote")} onClick={()=>onDeleteNote(draft.id,page)}><Trash2 size={16}/></button></>}</div>
   {properties&&<div className="pdfInlineProperties"><label><Translation id="pdf.size" /><input aria-label={translateUi("pdf.noteSize")} type="range" min=".015" max=".08" step=".005" value={draft.size} onChange={e=>onNoteDraft({...draft,size:Number(e.target.value)})}/></label><div>{Object.entries(ANNOTATION_COLORS).map(([color,value])=><button key={color} type="button" className="pdfColorChoice" aria-label={translateUi("pdf.noteColorValue1", { value1: color })} aria-pressed={draft.color===color} style={{'--swatch':value}} onClick={()=>onNoteDraft({...draft,color})}/>)}</div></div>}
  </form>}
  {selectedStroke&&editing&&tool==='select'&&<div className="pdfInkSelection" style={{left:`${Math.max(0,Math.min(.65,projection({x:selectedStroke.points[0][0],y:0,width:0,height:0}).x))*100}%`,top:`${Math.max(0,Math.min(.93,projection({x:0,y:selectedStroke.points[0][1],width:0,height:0}).y))*100}%`}}><button type="button" aria-label={translateUi("pdf.deleteSelectedDrawing")} onClick={()=>{onDeleteStroke(selectedStroke.id,page);setSelected(null);}}><Trash2 size={16}/></button><button type="button" aria-label={translateUi("pdf.selectedDrawingProperties")} onClick={()=>setProperties(v=>!v)}><Settings2 size={16}/></button><button type="button" aria-label={translateUi("pdf.deselectDrawing")} onClick={()=>{setSelected(null);setProperties(false);}}><X size={16}/></button>{properties&&<div className="pdfSelectedInkProperties"><div>{Object.entries(ANNOTATION_COLORS).map(([color,value])=><button type="button" key={color} className="pdfColorChoice" aria-label={translateUi("pdf.selectedDrawingColorValue1", { value1: color })} style={{'--swatch':value}} onClick={()=>onUpdateStroke({...selectedStroke,color},page)}/>)}</div><label><Translation id="pdf.width" /><input type="range" aria-label={translateUi("pdf.selectedDrawingWidth")} min=".001" max=".01" step=".001" value={selectedStroke.width} onChange={e=>onUpdateStroke({...selectedStroke,width:Number(e.target.value)},page)}/></label></div>}</div>}
  {cropping&&<div className="pdfCropFrameLayer">
   <svg className="pdfCropShade" viewBox="0 0 1 1" preserveAspectRatio="none"><path d={`M0 0H1V1H0Z M${r.x} ${r.y}V${r.y+r.height}H${r.x+r.width}V${r.y}Z`} fill="rgba(0,0,0,.48)" fillRule="evenodd"/></svg>
   <div className="pdfCropFrame" aria-label={translateUi("pdf.pdfAreaToKeep")} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`}}/>
   {Object.entries(handlePositions).map(([handle,[x,y]])=><button key={handle} type="button" className="pdfCropHandle" aria-label={translateUi("pdf.cropValue1Handle", { value1: handleNames[handle] })} style={{left:`${(r.x+x*r.width)*100}%`,top:`${(r.y+y*r.height)*100}%`,touchAction:'none'}} onPointerDown={e=>capture(e,{kind:'crop',rect,handle})} {...gestures} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();onCropDraft(resizeCrop(rect,handle,{x:rect.x+x*rect.width+(e.key==='ArrowLeft'?-.01:e.key==='ArrowRight'?.01:0),y:rect.y+y*rect.height+(e.key==='ArrowUp'?-.01:e.key==='ArrowDown'?.01:0)},crop),page);}}><i/></button>)}
  </div>}
 </div>;
}
