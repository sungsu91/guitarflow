import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import TabPhotoPreview from './TabPhotoPreview.jsx';
import StaffImportOptions from './StaffImportOptions.jsx';
import {TAB_SOURCE_ACCEPT,TAB_PHOTO_ACCEPT} from './imageTabSource.js';
import './desktopPdfTabImport.css';

export default function DesktopPdfTabImport(props){
  const {dialog,busy,opening,progress,result,error,cancel,run,addPhotos,open,photo,photos,analyzePhoto,attempted}=props;
  return <dialog ref={dialog} className="desktopPdfTabImport" aria-label="PDF·사진에서 TAB 초안 생성" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();cancel();}}>
    <header><div><small>FRETIVA LAB · DESKTOP</small><h2>PDF·사진에서 TAB 초안 생성</h2></div><button type="button" onClick={cancel} aria-label="PDF TAB 분석 닫기">×</button></header>
    <p>오선보의 음을 6현 기타 TAB으로 변환합니다. 기존 TAB은 원래 운지를 가져옵니다. PDF 또는 사진 여러 장을 선택할 수 있습니다.</p>
    {error&&<div className="scoreImportError" role="alert"><strong>분석을 완료하지 못했습니다</strong><p>{error}</p></div>}
    {!busy&&!result&&<><StaffImportOptions {...props}/><label className="pdfTabFileButton">{photo?'다른 PDF·사진 선택':'PDF·사진 선택'}<input type="file" multiple accept={TAB_SOURCE_ACCEPT} aria-label="TAB 분석용 PDF·사진 선택" disabled={opening} onChange={run}/></label>
      {photo&&<label className="pdfTabFileButton">사진 추가<input type="file" multiple accept={TAB_PHOTO_ACCEPT} aria-label="사진 추가" disabled={opening} onChange={addPhotos}/></label>}</>}
    {photo&&!busy&&!result&&<TabPhotoPreview {...props}/>}
    {busy&&<div className="pdfTabProgress" role="status"><p>{progress.message||'TAB 분석 준비 중…'}</p><progress max="1" value={progress.progress}/><span>{Math.round(progress.progress*100)}%</span></div>}
    {result&&<section aria-label="TAB 분석 결과"><h3>TAB 분석 완료</h3><dl>{[['전체 페이지','pages'],['전체 마디','measures'],['입력된 프렛','confirmed']].map(([label,key])=><div key={key}><dt>{label}</dt><dd>{result.summary[key]}</dd></div>)}</dl>
      <ul className="pdfTabPageResults" aria-label="페이지별 분석 결과">{result.pages.map(page=><li key={page.page}>{page.page}페이지 <strong>{page.staffs.reduce((n,s)=>n+s.measures.length,0)}마디</strong></li>)}</ul>
      <PdfTabCoverageNotice summary={result.summary}/>
      {result.pages.some(p=>p.notation)&&<p className="notationReviewNotice">오선보에서 기본 운지로 배치한 초안입니다. 음높이·리듬·도돌이표를 원본과 비교해 주세요. 붙임줄·이음줄·주법, 1·2번 반복 구간 및 D.C.·D.S.·코다 진행은 직접 확인해 입력해 주세요.</p>}
    </section>}
    <footer><button type="button" onClick={cancel}>{busy?'분석 취소':'취소'}</button>{photo&&!busy&&!result&&<button type="button" className="pdfTabOpen" onClick={analyzePhoto}>{attempted?'다시 분석':photos.length>1?'사진 전체 분석':'사진 분석'}</button>}{result&&<button type="button" className="pdfTabOpen" disabled={opening} aria-busy={opening} onClick={open}>{opening?'제작실로 옮기는 중…':'제작실에서 열기'}</button>}</footer>
  </dialog>;
}
