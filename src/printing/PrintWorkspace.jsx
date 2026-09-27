import React,{useEffect,useId,useRef,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import PrintPageNavigation from './PrintPageNavigation.jsx';
import {exportPreviewPdf} from './exportPreviewPdf.js';
import {pdfFilename,savePdf} from './savePdf.js';

export default function PrintWorkspace({mobile,root,title,description,description2='',showDescription=true,showDescription2=true,pageNumbers,onChange,pageCount,children,selector,controls,previewControls,positionControls,onPreviewPage,requestedPage,ready=true,previewError='',contentKey,interactionActive=false,positioningHint,positioningEnabled=true}) {
 const fieldId=useId(),language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState('');
 const [saveOpen,setSaveOpen]=useState(false),[filename,setFilename]=useState(''),[prepared,setPrepared]=useState(null);
 const operation=useRef(),[zoom,setZoom]=useState(.38),[page,setPage]=useState(0),[positioning,setPositioning]=useState(false);
 useEffect(()=>()=>operation.current?.abort(),[]);
 useEffect(()=>{setPage(old=>Math.max(0,Math.min(old,pageCount-1)));},[pageCount]);
 useEffect(()=>{const el=root.current;const resize=()=>setZoom(Math.min(1,Math.max(.1,(el.clientWidth-24)/794)));resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[root]);
 // Discard a prepared file when its content or filename changes.
 useEffect(()=>{setPrepared(null);},[title,description,description2,showDescription,showDescription2,pageNumbers,pageCount,filename,contentKey]);
 const goToPage=index=>{const next=Math.max(0,Math.min(pageCount-1,index));setPage(next);const el=root.current,frame=el.querySelectorAll('[data-print-frame]')[next];if(frame)el.scrollTo({top:frame.offsetTop-12,behavior:'instant'});el.parentElement.scrollIntoView({block:'nearest',behavior:'instant'});};
 const syncPage=()=>{const el=root.current,threshold=el.scrollTop+Math.min(80,el.clientHeight*.25);const index=[...el.querySelectorAll('[data-print-frame]')].findIndex(frame=>frame.offsetTop+frame.offsetHeight>threshold);if(index>=0)setPage(index);};
 useEffect(()=>{onPreviewPage?.(Math.min(page,Math.max(0,pageCount-1)));},[page,pageCount,onPreviewPage]);
 useEffect(()=>{if(requestedPage)goToPage(requestedPage.index);},[requestedPage]);
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
 const disabled=busy||!ready||interactionActive;
 return <>
  <div className="rt-print-controls" data-html2canvas-ignore="true">{controls?.(disabled)}{!mobile&&<button disabled={disabled} onClick={()=>window.print()}>{t('인쇄','Print')}</button>}<button disabled={disabled} onClick={()=>{setFilename(title||'FRETIVA LAB');setSaveOpen(true);setPrepared(null);}}>{t('PDF 저장','Save PDF')}</button>{mobile&&<p className="rt-print-mobile-hint">{positioningEnabled?t('미리보기에서 위치를 조절한 뒤 PDF를 저장하거나 공유하세요.','Adjust the preview, then save or share the PDF.'):t('미리보기를 확인한 뒤 PDF를 저장하거나 공유하세요.','Review the preview, then save or share the PDF.')}</p>}</div>
  {saveOpen&&<form className="rt-pdf-filename" data-html2canvas-ignore="true" onSubmit={event=>{event.preventDefault();prepared?save():generate();}}><label>{t('PDF 파일명','PDF filename')} <input autoFocus value={filename} maxLength={120} disabled={busy} onChange={event=>setFilename(event.target.value)} onFocus={event=>event.target.select()}/><span>.pdf</span></label><button type="button" onClick={()=>{operation.current?.abort();setSaveOpen(false);setPrepared(null);}}>{t('취소','Cancel')}</button><button type="submit" disabled={disabled||!filename.trim()}>{busy?t('생성 중…','Creating…'):prepared?t('저장·공유','Save or share'):mobile?t('PDF 만들기','Create PDF'):t('이 이름으로 저장','Save with this name')}</button>{prepared&&<p role="status">{t('PDF가 준비되었습니다. 저장·공유를 눌러 파일에 저장할 수 있습니다.','Your PDF is ready. Tap Save or share to save it to Files.')}</p>}{progress&&<p role="status" aria-live="polite">{progress}</p>}</form>}
  <div className="rt-print-edit" data-html2canvas-ignore="true">
   <div className="rt-print-field"><div className="rt-print-field-heading"><label htmlFor={fieldId+'-title'}>{t('출력 제목','Print title')}</label>{selector?.(disabled)}</div><input id={fieldId+'-title'} value={title} maxLength={200} disabled={disabled} onChange={event=>onChange({title:event.target.value})}/></div>
   <div className="rt-print-field"><div className="rt-print-field-heading"><label htmlFor={fieldId+'-description1'}>{t('출력 설명 1 · 왼쪽','Print description 1 · Left')}</label><input type="checkbox" aria-label={t('설명 1 표시','Show description 1')} checked={showDescription} disabled={disabled} onChange={event=>onChange({showDescription:event.target.checked})}/></div><textarea id={fieldId+'-description1'} rows={2} value={description} maxLength={500} disabled={disabled||!showDescription} onChange={event=>onChange({description:event.target.value})}/></div>
   <div className="rt-print-field"><div className="rt-print-field-heading"><label htmlFor={fieldId+'-description2'}>{t('출력 설명 2 · 오른쪽','Print description 2 · Right')}</label><input type="checkbox" aria-label={t('설명 2 표시','Show description 2')} checked={showDescription2} disabled={disabled} onChange={event=>onChange({showDescription2:event.target.checked})}/></div><textarea id={fieldId+'-description2'} rows={2} value={description2} maxLength={500} placeholder={t('작성자, 편곡자 등','Author, arranger, etc.')} disabled={disabled||!showDescription2} onChange={event=>onChange({description2:event.target.value})}/></div>
   <div className="rt-print-display-actions"><label>{t('페이지 번호','Page numbers')} <input type="checkbox" checked={pageNumbers} disabled={disabled} onChange={event=>onChange({pageNumbers:event.target.checked})}/></label>{positionControls?.(disabled)}</div>
  </div>
  {(error||previewError)&&<p role="alert">{error||previewError}</p>}
  <div className={`rt-print-preview rt-print-preview--${mobile?'mobile':'desktop'}${positioningEnabled&&positioning?' is-positioning':''}`}><PrintPageNavigation mobile={mobile} page={Math.min(page,Math.max(0,pageCount-1))} count={Math.max(1,pageCount)} busy={disabled} positioningEnabled={positioningEnabled} positioning={positioningEnabled&&positioning} onPositioning={setPositioning} onPage={goToPage} language={language} positioningHint={positioningHint} controls={previewControls?.(disabled)}/><div className="rt-print-scroll" ref={root} onScroll={syncPage} style={{'--print-zoom':zoom}}>{!ready&&!previewError&&<p role="status">{t('미리보기 준비 중…','Preparing preview…')}</p>}{children({zoom,positioning:positioningEnabled&&positioning,busy:busy||!ready})}</div></div>
 </>;
}
