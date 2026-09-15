export default function PdfBarCount({value,onChange,onApply,onCancel}){
 return <div className="pdfInlineCount" role="group" aria-label="마디 수 설정">
  <span>이 줄의 마디 수</span>
  {[1,2,3,4].map(n=><button key={n} type="button" className={value===n?'pdfPrimary':undefined} aria-label={`${n}마디로 저장`} onMouseEnter={()=>onChange(n)} onFocus={()=>onChange(n)} onClick={()=>onApply(n)}>{n}</button>)}
  <button type="button" aria-label="마디 수 설정 취소" onClick={onCancel}>×</button>
 </div>;
}
