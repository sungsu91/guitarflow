import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
export default function PdfBarCount({value,onChange,onApply,onCancel,startNumber=1}){
  useLanguage();
 return <div className="pdfInlineCount" role="group" aria-label={translateUi("pdf.setBarCount")}>
  <span><Translation id="pdf.howManyBarsShouldThisSelectionContain" /></span>
  {[1,2,3,4].map(n=><button key={n} type="button" className={value===n?'pdfPrimary':undefined} aria-label={translateUi("pdf.splitIntoValue1Bars", { value1: n })} aria-pressed={value===n} onClick={()=>onChange(n)}>{n}<Translation id="app.bar" /></button>)}
  <button type="button" className="pdfPrimary" onClick={()=>onApply(value)}>{startNumber}~{startNumber+value-1}<Translation id="etudes.addBar" /></button>
  <button type="button" aria-label={translateUi("pdf.cancelBarCount")} onClick={onCancel}>×</button>
 </div>;
}
