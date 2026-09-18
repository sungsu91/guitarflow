export default function PdfBarCount({value,onChange,onApply,onCancel,startNumber=1}){
 return <div className="pdfInlineCount" role="group" aria-label="마디 수 설정">
  <span>선택 영역을 몇 마디로 나눌까요?</span>
  {[1,2,3,4].map(n=><button key={n} type="button" className={value===n?'pdfPrimary':undefined} aria-label={`${n}마디로 나누기`} aria-pressed={value===n} onClick={()=>onChange(n)}>{n}마디</button>)}
  <button type="button" className="pdfPrimary" onClick={()=>onApply(value)}>{startNumber}~{startNumber+value-1}마디 추가</button>
  <button type="button" aria-label="마디 수 설정 취소" onClick={onCancel}>×</button>
 </div>;
}
