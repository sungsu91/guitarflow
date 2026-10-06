import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ORIGINAL_PHOTO_SCAN,usePhotoScanCanvas} from './usePhotoScanCanvas.js';
import {t} from '../../i18n/core.js';
import './photoScanViewer.css';
import './desktopPhotoScanViewer.css';
import './mobilePhotoScanViewer.css';

export default function PhotoScanViewer({photo,rotation,original:initialOriginal,mobile,onClose}){
 const dialog=useRef(null),viewport=useRef(null),[original,setOriginal]=useState(initialOriginal||!photo.scan?.enabled),[zoom,setZoom]=useState(1),[size,setSize]=useState({width:0,height:0});
 const {canvas,status,ratio}=usePhotoScanCanvas(photo,rotation,original?ORIGINAL_PHOTO_SCAN:photo.scan,{maxSide:3000,renderWidth:2600,fullResolution:true});
 useEffect(()=>{
  const node=dialog.current,opener=document.activeElement;node.showModal();
  return()=>{node.close();if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{
  const node=viewport.current,observer=new ResizeObserver(()=>setSize({width:node.clientWidth,height:node.clientHeight}));observer.observe(node);return()=>observer.disconnect();
 },[]);
 const fit=Math.max(1,Math.min(size.width-32,(size.height-32)*ratio)),width=Math.round(fit*zoom),height=Math.round(width/ratio);
 const compare=<div className="photoViewerCompare" role="group" aria-label={t('editor.photoScanCompare')}>
  <button type="button" aria-pressed={original} onClick={()=>setOriginal(true)}>{t('editor.photoScanOriginal')}</button>
  <button type="button" aria-pressed={!original} disabled={!photo.scan?.enabled} onClick={()=>setOriginal(false)}>{t('editor.photoScanResult')}</button>
 </div>;
 const scaling=<div className="photoViewerScaling" role="group" aria-label={t('editor.photoPreviewZoom')}>
  <button type="button" aria-label={t('audioStudio.zoomOut')} disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.5))}>−</button>
  <output>{Math.round(zoom*100)}%</output>
  <button type="button" aria-label={t('audioStudio.zoomIn')} disabled={zoom>=4} onClick={()=>setZoom(v=>Math.min(4,v+.5))}>+</button>
  <button type="button" onClick={()=>{setZoom(1);viewport.current?.scrollTo(0,0);}}>{t('pdf.fitPage')}</button>
 </div>;
 const heading=<><div><h2>{t('editor.photoScanCompare')}</h2><p>{photo.fileName}</p></div><button autoFocus type="button" className="photoViewerClose" aria-label={t('common.close')} onClick={onClose}>×</button></>;
 const sheet=<div className="photoViewerViewport" ref={viewport} tabIndex={0} aria-label={t('editor.photoPreview')}>
  <div className="photoViewerSheet" style={{width:Math.max(size.width,width+32),height:Math.max(size.height,height+32)}}>
   <canvas ref={canvas} role="img" aria-label={t(original?'editor.photoScanOriginal':'editor.photoScanResult')} style={{width,height,visibility:status?'hidden':'visible'}}/>
  </div>
  {status&&<p className="photoViewerStatus" role="status">{t(status==='error'?'editor.photoPreviewFailed':'editor.photoScanPreparing')}</p>}
 </div>;
 const content=mobile?<MobilePhotoViewer {...{heading,compare,scaling,sheet}}/>:<DesktopPhotoViewer {...{heading,compare,scaling,sheet}}/>;
 return createPortal(<dialog ref={dialog} className={`photoScanViewer ${mobile?'mobilePhotoScanViewer':'desktopPhotoScanViewer'}`} aria-label={t('editor.photoScanCompare')} aria-busy={Boolean(status)} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onKeyDown={e=>e.stopPropagation()}>{content}</dialog>,document.body);
}

function DesktopPhotoViewer({heading,compare,scaling,sheet}){
 return <><header>{heading}</header><div className="desktopPhotoViewerToolbar">{compare}{scaling}</div>{sheet}</>;
}
function MobilePhotoViewer({heading,compare,scaling,sheet}){
 return <><header>{heading}</header>{compare}{sheet}<footer>{scaling}</footer></>;
}
