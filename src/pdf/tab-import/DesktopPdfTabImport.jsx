import {useEffect,useRef,useState} from 'react';
import {importPdfTab} from './importPdfTab.js';
import {analysisToDocument} from './scoreAdapter.js';
import './desktopPdfTabImport.css';

export default function DesktopPdfTabImport({onClose,onOpen}){
  const dialog=useRef(null),job=useRef(null),generation=useRef(0);
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState({progress:0,message:''}),[result,setResult]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const node=dialog.current;node.showModal();return()=>{generation.current++;job.current?.abort();node.close();};},[]);
  const cancel=()=>{generation.current++;job.current?.abort();onClose();};
  const run=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    job.current?.abort();const token=++generation.current,controller=new AbortController();job.current=controller;setBusy(true);setResult(null);setError('');
    try{const analysis=await importPdfTab(file,{signal:controller.signal,onProgress:p=>{if(token===generation.current)setProgress(p);}});if(token===generation.current)setResult(analysis);}
    catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}
    finally{if(token===generation.current)setBusy(false);}
  };
  const open=()=>{try{onOpen(analysisToDocument(result));}catch(e){setError(e.message);}};
  return <dialog ref={dialog} className="desktopPdfTabImport" aria-label="PDF에서 TAB 초안 생성" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><div><small>FRETIVA LAB · DESKTOP</small><h2>PDF에서 TAB 초안 생성</h2></div><button type="button" onClick={cancel} aria-label="PDF TAB 분석 닫기">×</button></header>
    <p>PDF 전체 페이지의 TAB을 하나의 악보로 가져옵니다.</p>
    {!busy&&<label className="pdfTabFileButton">{result?'다른 PDF 선택':'PDF 선택'}<input type="file" accept=".pdf,application/pdf" aria-label="TAB 분석용 PDF 선택" onChange={run}/></label>}
    {busy&&<div className="pdfTabProgress" role="status"><p>{progress.message||'TAB 분석 준비 중…'}</p><progress max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>}
    {error&&<p role="alert">{error}</p>}
    {result&&<section aria-label="TAB 분석 결과"><h3>TAB 분석 완료</h3><dl>{[['전체 페이지','pages'],['전체 마디','measures'],['입력된 프렛','confirmed']].map(([label,key])=><div key={key}><dt>{label}</dt><dd>{result.summary[key]}</dd></div>)}</dl>
      <ul className="pdfTabPageResults" aria-label="페이지별 분석 결과">{result.pages.map(page=><li key={page.page}>{page.page}페이지 <strong>{page.staffs.reduce((n,s)=>n+s.measures.length,0)}마디</strong></li>)}</ul>
    </section>}
    <footer><button type="button" onClick={cancel}>{busy?'분석 취소':'취소'}</button>{result&&<button type="button" className="pdfTabOpen" onClick={open}>제작실에서 열기</button>}</footer>
  </dialog>;
}
