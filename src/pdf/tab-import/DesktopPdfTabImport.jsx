import {useEffect,useRef,useState} from 'react';
import {importPdfTab} from './importPdfTab.js';
import {analysisToDocument} from './scoreAdapter.js';
import './desktopPdfTabImport.css';

export default function DesktopPdfTabImport({onClose,onOpen,active=true}){
  const dialog=useRef(null),job=useRef(null),generation=useRef(0),generated=useRef(null),openingRef=useRef(false);
  const [busy,setBusy]=useState(false),[opening,setOpening]=useState(false),[progress,setProgress]=useState({progress:0,message:''}),[result,setResult]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const node=dialog.current;return()=>{generation.current++;job.current?.abort();node.close();};},[]);
  useEffect(()=>{const node=dialog.current;if(active&&!node.open)node.showModal();else if(!active&&node.open)node.close();},[active]);
  const cancel=()=>{generation.current++;job.current?.abort();onClose();};
  const run=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    job.current?.abort();const token=++generation.current,controller=new AbortController();job.current=controller;generated.current=null;setBusy(true);setResult(null);setError('');
    try{const analysis=await importPdfTab(file,{signal:controller.signal,onProgress:p=>{if(token===generation.current)setProgress(p);}});if(token===generation.current)setResult(analysis);}
    catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{if(token===generation.current)setBusy(false);}
  };
  const open=async()=>{
    if(openingRef.current||!result)return;
    openingRef.current=true;setOpening(true);setError('');const token=generation.current;
    try{
      // Paint feedback before converting/saving a large document. Keep the same
      // ID on retry so cancelling the current-edit prompt cannot create copies.
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      if(token!==generation.current)return;
      generated.current??=analysisToDocument(result);await onOpen(generated.current);
    }catch(e){if(token===generation.current)setError(e.message);}
    finally{openingRef.current=false;if(token===generation.current)setOpening(false);}
  };
  return <dialog ref={dialog} className="desktopPdfTabImport" aria-label="PDF에서 TAB 초안 생성" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><div><small>FRETIVA LAB · DESKTOP</small><h2>PDF에서 TAB 초안 생성</h2></div><button type="button" onClick={cancel} aria-label="PDF TAB 분석 닫기">×</button></header>
    <p>PDF 전체 페이지의 TAB을 하나의 악보로 가져옵니다.</p>
    {!busy&&<label className="pdfTabFileButton">{result?'다른 PDF 선택':'PDF 선택'}<input type="file" accept=".pdf,application/pdf" aria-label="TAB 분석용 PDF 선택" disabled={opening} onChange={run}/></label>}
    {busy&&<div className="pdfTabProgress" role="status"><p>{progress.message||'TAB 분석 준비 중…'}</p><progress max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>}
    {error&&<p role="alert">{error}</p>}
    {result&&<section aria-label="TAB 분석 결과"><h3>TAB 분석 완료</h3><dl>{[['전체 페이지','pages'],['전체 마디','measures'],['입력된 프렛','confirmed']].map(([label,key])=><div key={key}><dt>{label}</dt><dd>{result.summary[key]}</dd></div>)}</dl>
      <ul className="pdfTabPageResults" aria-label="페이지별 분석 결과">{result.pages.map(page=><li key={page.page}>{page.page}페이지 <strong>{page.staffs.reduce((n,s)=>n+s.measures.length,0)}마디</strong></li>)}</ul>
    </section>}
    <footer><button type="button" onClick={cancel}>{busy?'분석 취소':'취소'}</button>{result&&<button type="button" className="pdfTabOpen" disabled={opening} aria-busy={opening} onClick={open}>{opening?'제작실로 옮기는 중…':'제작실에서 열기'}</button>}</footer>
  </dialog>;
}
