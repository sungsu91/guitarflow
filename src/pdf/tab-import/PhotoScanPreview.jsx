import {useEffect,useRef,useState} from 'react';
import {fullPaperQuad,validPaperQuad} from './paperScanGeometry.js';
import {ORIGINAL_PHOTO_SCAN as DEFAULT_SCAN,usePhotoScanCanvas} from './usePhotoScanCanvas.js';
import PhotoScanViewer from './PhotoScanViewer.jsx';
import {t} from '../../i18n/core.js';

const turn=(p,n)=>{for(let i=0;i<(n+4)%4;i++)p={x:1-p.y,y:p.x};return p;};
export default function PhotoScanPreview({photo,rotation,updatePhotoScan,previewPhotoScan,opening,mobile}){
 const frame=useRef(null),drag=useRef(null),[editing,setEditing]=useState(false),[original,setOriginal]=useState(false),[expanded,setExpanded]=useState(false);
 const automatic=!photo.scan,scan=photo.scan??DEFAULT_SCAN,q=scan.quad,shown=editing||original?DEFAULT_SCAN:scan;
 const {canvas,status,ratio}=usePhotoScanCanvas(photo,rotation,shown);
 useEffect(()=>{setEditing(false);setOriginal(false);setExpanded(false);},[photo.id]);
 useEffect(()=>{
  if(!editing||status)return;
  const id=requestAnimationFrame(()=>frame.current?.scrollIntoView({block:'center',inline:'nearest'}));
  return()=>cancelAnimationFrame(id);
 },[editing,status,photo.id]);
 const update=patch=>updatePhotoScan({...scan,...patch,manual:true});
 const move=(index,point)=>{const next=q.map((p,i)=>i===index?point:p);if(validPaperQuad(next))update({enabled:true,quad:next,manual:true});};
 const dragMove=e=>{
  if(drag.current===null)return;
  const r=frame.current.getBoundingClientRect(),p={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
  move(drag.current,turn(p,-rotation));
 };
 const controls=<>
  <label><input type="checkbox" checked={automatic||scan.enabled} disabled={opening} onChange={e=>update({enabled:e.target.checked})}/>{t(automatic?'editor.photoScanAuto':'editor.photoScanUse')}</label>
  <button type="button" disabled={opening} onClick={()=>{setEditing(false);setOriginal(false);previewPhotoScan();}}>{t('editor.photoScanPreviewAction')}</button>
  <label><input type="checkbox" checked={scan.enhance} disabled={opening||automatic||!scan.enabled} onChange={e=>update({enhance:e.target.checked})}/>{t('editor.photoScanLight')}</label>
  <button type="button" disabled={opening} aria-pressed={editing} onClick={()=>{setOriginal(false);setEditing(v=>!v);}}>{t(editing?'editor.photoScanDone':'editor.photoScanCorners')}</button>
 </>;
 return <div className="photoScanPreview">
  {mobile?<div className="mobilePhotoScanControls">{controls}</div>:<div className="desktopPhotoScanControls">{controls}</div>}
  <div className="photoScanTabs" role="group" aria-label={t('editor.photoScanCompare')}>
   <button type="button" disabled={opening||editing} aria-pressed={original||!scan.enabled} onClick={()=>setOriginal(true)}>{t('editor.photoScanOriginal')}</button>
   <button type="button" disabled={opening||editing||!scan.enabled} aria-pressed={!original&&scan.enabled} onClick={()=>setOriginal(false)}>{t('editor.photoScanResult')}</button>
  </div>
  <div className="photoScanFrame" ref={frame} style={{width:`min(100%, ${Math.min(500,(editing?310:190)*ratio)}px)`}}>
   <canvas ref={canvas} role="img" aria-label={t('editor.photoPreview')}/>
   {!editing&&<button type="button" className="photoScanEnlarge" disabled={opening||Boolean(status)} aria-label={t('editor.photoPreviewEnlarge')} onClick={()=>setExpanded(true)}><span>{t('editor.photoPreviewEnlarge')}</span></button>}
   {editing&&<>
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polygon points={q.map(p=>turn(p,rotation)).map(p=>`${p.x*1000},${p.y*1000}`).join(' ')}/></svg>
    {q.map((p,index)=>{const v=turn(p,rotation);return <button key={index} disabled={opening} type="button" className="photoScanCorner" aria-label={t('editor.photoScanCorner',{value1:index+1})} style={{left:`${v.x*100}%`,top:`${v.y*100}%`}}
     onPointerDown={e=>{drag.current=index;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}}
     onPointerMove={dragMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
     onKeyDown={e=>{const delta={ArrowLeft:[-.005,0],ArrowRight:[.005,0],ArrowUp:[0,-.005],ArrowDown:[0,.005]}[e.key];if(delta){e.preventDefault();move(index,turn({x:Math.max(0,Math.min(1,v.x+delta[0])),y:Math.max(0,Math.min(1,v.y+delta[1]))},-rotation));}}}>{index+1}</button>;})}
   </>}
  </div>
  {editing&&<p>{t('editor.photoScanDrag')} <button type="button" disabled={opening} onClick={()=>update({enabled:true,quad:fullPaperQuad(),manual:true})}>{t('editor.photoScanReset')}</button></p>}
  <p role="status">{status==='loading'?t('editor.photoScanPreparing'):status==='error'?t('editor.photoPreviewFailed'):photo.scanError?t('editor.photoScanFailed'):t(automatic?'editor.photoScanAutoHint':!scan.enabled?'editor.photoScanDisabled':scan.manual?'editor.photoScanApplied':'editor.photoScanCandidate')}</p>
  {expanded&&<PhotoScanViewer {...{photo,rotation,original,mobile}} onClose={()=>setExpanded(false)}/>}
 </div>;
}
