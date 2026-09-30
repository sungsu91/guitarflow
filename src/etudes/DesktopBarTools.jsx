import {t} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';

export default function DesktopBarTools({limit=64,measures,bar,end,onEnd,onCopy,onPaste,onDuplicate,canPaste}){
 useLanguage();
 return <details className="desktopBarTools"><summary><Translation id="editor.barCopy" /></summary>
  <p>{bar+1}<Translation id="etudes.bar" /></p>
  <button type="button" disabled={measures.length>=limit} onClick={onDuplicate}><Translation id="etudes.duplicateBar" /></button>
  <label><Translation id="etudes.lastBarToCopy" /><select aria-label={t('etudes.lastBarToCopy')} value={Math.max(bar,Math.min(end,measures.length-1))} onChange={e=>onEnd(Number(e.target.value))}>{measures.map((measure,index)=>index>=bar&&<option key={measure.id} value={index}>{index+1}</option>)}</select></label>
  <button type="button" onClick={onCopy}><Translation id="etudes.copyRange" /></button><button type="button" disabled={!canPaste} onClick={onPaste}><Translation id="etudes.pasteAfterCurrentBar" /></button>
 </details>;
}
