import React,{useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import PrintPageNavigation from './PrintPageNavigation.jsx';
import {exportPreviewPdf} from './exportPreviewPdf.js';
import {pdfFilename,savePdf} from './savePdf.js';

export default function PrintWorkspace({mobile,root,title,description,showDescription,pageNumbers,spacing,onChange,pageCount,children,selector,controls,ready=true,previewError='',contentKey}) {
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState('');
 const [saveOpen,setSaveOpen]=useState(false),[filename,setFilename]=useState(''),[prepared,setPrepared]=useState(null);
 const operation=useRef(),[zoom,setZoom]=useState(.38),[page,setPage]=useState(0),[positioning,setPositioning]=useState(false);
 useEffect(()=>()=>operation.current?.abort(),[]);
 useEffect(()=>{setPage(old=>Math.max(0,Math.min(old,pageCount-1)));},[pageCount]);
 useEffect(()=>{const el=root.current;const resize=()=>setZoom(Math.min(1,Math.max(.1,(el.clientWidth-24)/794)));resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[root]);
 // Discard a prepared file when its content or filename changes.
 useEffect(()=>{setPrepared(null);},[title,description,showDescription,pageNumbers,spacing,pageCount,filename,contentKey]);
 const goToPage=index=>{const next=Math.max(0,Math.min(pageCount-1,index));setPage(next);const el=root.current,frame=el.querySelectorAll('[data-print-frame]')[next];if(frame)el.scrollTo({top:frame.offsetTop-12,behavior:'instant'});el.parentElement.scrollIntoView({block:'nearest',behavior:'instant'});};
 const syncPage=()=>{const el=root.current,threshold=el.scrollTop+Math.min(80,el.clientHeight*.25);const index=[...el.querySelectorAll('[data-print-frame]')].findIndex(frame=>frame.offsetTop+frame.offsetHeight>threshold);if(index>=0)setPage(index);};
 async function generate(){
  const controller=new AbortController();operation.current=controller;setBusy(true);setError('');setPrepared(null);
  try{
   const blob=await exportPreviewPdf(root.current,{signal:controller.signal,onProgress:(n,total)=>setProgress(t(`PDF 생성 중 · ${n} / ${total}페이지`,`Creating PDF · ${n} / ${total} pages`))});
   if(mobile)setPrepared({blob,name:pdfFilename(filename)});
   else{await savePdf(blob,pdfFilename(filename));setSaveOpen(false);}
  }catch(error){if(error.name!=='AbortError')setError(t('PDF를 만들지 못했습니다. 다시 시도해 주세요.','Could not create the PDF. Please try again.'));}
  finally{if(operation.current===controller){operation.current=null;setBusy(false);setProgress('');}}
 }
 async function save(){
  setBusy(true);setError('');
  try{if(await savePdf(prepared.blob,prepared.name,{mobile})){setPrepared(null);setSaveOpen(false);}}
  catch{setError(t('저장·공유를 완료하지 못했습니다. 다시 시도해 주세요.','Could not save or share. Please try again.'));}
  finally{setBusy(false);}
 }
 const disabled=busy||!ready;
 return <>
  <div className="rt-print-controls" data-html2canvas-ignore="true">{controls?.(disabled)}{!mobile&&<button disabled={disabled} onClick={()=>window.print()}>{t('인쇄','Print')}</button>}<button disabled={disabled} onClick={()=>{setFilename(title||'FRETIVA LAB');setSaveOpen(true);setPrepared(null);}}>{t('PDF 저장','Save PDF')}</button>{mobile&&<p className="rt-print-mobile-hint">{t('미리보기에서 위치를 조절한 뒤 PDF를 저장하거나 공유하세요.','Adjust the preview, then save or share the PDF.')}</p>}</div>
  {saveOpen&&<form className="rt-pdf-filename" data-html2canvas-ignore="true" onSubmit={event=>{event.preventDefault();prepared?save():generate();}}><label>{t('PDF 파일명','PDF filename')} <input autoFocus value={filename} maxLength={120} disabled={busy} onChange={event=>setFilename(event.target.value)} onFocus={event=>event.target.select()}/><span>.pdf</span></label><button type="button" onClick={()=>{operation.current?.abort();setSaveOpen(false);setPrepared(null);}}>{t('취소','Cancel')}</button><button type="submit" disabled={disabled||!filename.trim()}>{busy?t('생성 중…','Creating…'):prepared?t('저장·공유','Save or share'):mobile?t('PDF 만들기','Create PDF'):t('이 이름으로 저장','Save with this name')}</button>{prepared&&<p role="status">{t('PDF가 준비되었습니다. 저장·공유를 눌러 파일에 저장할 수 있습니다.','Your PDF is ready. Tap Save or share to save it to Files.')}</p>}{progress&&<p role="status" aria-live="polite">{progress}</p>}</form>}
  <div className="rt-print-edit" data-html2canvas-ignore="true">{selector?.(disabled)}<label>{t('출력 제목','Print title')} <input value={title} maxLength={200} disabled={disabled} onChange={event=>onChange({title:event.target.value})}/></label><label>{t('출력 설명','Print description')} <textarea rows={2} value={description} maxLength={500} disabled={disabled} onChange={event=>onChange({description:event.target.value})}/></label><details className="rt-print-options"><summary>{t('표시 · 여백 설정','Display and spacing')}</summary><label>{t('설명 표시','Show description')} <input type="checkbox" checked={showDescription} disabled={disabled} onChange={event=>onChange({showDescription:event.target.checked})}/></label><label>{t('페이지 번호','Page numbers')} <input type="checkbox" checked={pageNumbers} disabled={disabled} onChange={event=>onChange({pageNumbers:event.target.checked})}/></label><label>{t('위쪽 여백','Top spacing')} <input type="range" min="0" max="240" value={spacing} disabled={disabled} onChange={event=>onChange({spacing:Number(event.target.value)})}/><span>{Math.round(spacing*25.4/96)} mm</span></label><small>{t('위쪽 여백이나 악보 끌기로 위치를 조절할 수 있습니다. 원본 악보는 바뀌지 않습니다.','Adjust spacing or drag the score to reposition it. Your original score is preserved.')}</small></details></div>
  {(error||previewError)&&<p role="alert">{error||previewError}</p>}
  <div className={`rt-print-preview rt-print-preview--${mobile?'mobile':'desktop'}${positioning?' is-positioning':''}`}><PrintPageNavigation mobile={mobile} page={Math.min(page,Math.max(0,pageCount-1))} count={Math.max(1,pageCount)} busy={disabled} positioning={positioning} onPositioning={setPositioning} onPage={goToPage} language={language}/><div className="rt-print-scroll" ref={root} onScroll={syncPage} style={{'--print-zoom':zoom}}>{!ready&&!previewError&&<p role="status">{t('미리보기 준비 중…','Preparing preview…')}</p>}{children({zoom,positioning,busy:disabled})}</div></div>
 </>;
}
