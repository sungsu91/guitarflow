import {Translation} from '../i18n/react.jsx';
import {t,localizeUi} from '../i18n/core.js';
import {useEffect,useRef} from 'react';

function Status({analysis,progress,hasBars}){
 if(progress)return <span role="status">{localizeUi(progress)}</span>;
 if(!analysis)return null;
 const s=analysis.summary;
 return <><span role="status">{t('pdf.autoSummary',{pages:s.pages,systems:s.systems,measures:s.measures,review:s.review})}</span>
  {hasBars&&<small><Translation id="pdf.autoReplaceWarning" /></small>}
  {!s.measures&&<small><Translation id="pdf.autoEmpty" /></small>}
  {s.measures>0&&analysis.pages.some(p=>!p.measures.length)&&<small><Translation id="pdf.autoMissingPage" /></small>}
 </>;
}
function Actions({analysis,progress,disabled,onAnalyse,onCancel,onApply}){
 if(progress)return <button type="button" onClick={onCancel}><Translation id="common.cancel" /></button>;
 if(!analysis)return <button type="button" onClick={onAnalyse} disabled={disabled}><Translation id="pdf.autoDetect" /></button>;
 return <><button type="button" disabled={!analysis.summary.measures} onClick={onApply}><Translation id="common.done" /></button>
  <button type="button" onClick={onCancel}><Translation id="common.cancel" /></button>
 </>;
}
export function PdfMeasureConfirmation({action,hasBars,onConfirm,onCancel}){
 const ref=useRef(null);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} className="pdfDialog" aria-label={t(action==='reset'?'pdf.resetMeasureAreas':'pdf.autoDetect')} onCancel={e=>{e.preventDefault();onCancel();}}>
  <h2>{t(action==='reset'?'pdf.resetMeasureAreas':'pdf.autoDetect')}</h2>
  <p>{t(action==='reset'?'pdf.resetMeasuresConfirm':hasBars?'pdf.autoDetectReplaceConfirm':'pdf.autoDetectConfirm')}</p>
  <footer><button type="button" autoFocus onClick={onCancel}><Translation id="common.cancel"/></button><button type="button" onClick={onConfirm}><Translation id={action==='reset'?'app.reset':'pdf.startAnalysis'}/></button></footer>
 </dialog>;
}
// State and detection are shared; platform layouts remain independently editable.
export function DesktopPdfAutoMeasures(props){
 return <div className="pdfAutoMeasures pdfAutoMeasures--desktop"><Status {...props}/><Actions {...props}/></div>;
}
export function MobilePdfAutoMeasures(props){
 return <div className="pdfAutoMeasures pdfAutoMeasures--mobile">{(props.analysis||props.progress)&&<div className="pdfAutoMeasureStatus"><Status {...props}/></div>}<div className="pdfAutoMeasureActions"><Actions {...props}/></div></div>;
}
