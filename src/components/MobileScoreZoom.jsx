import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef} from 'react';
import './mobileScoreZoom.css';
export default function MobileScoreZoom({zoom,onFit,label=ko["components.scores"],previewRoot}) {
  useLanguage();
 const output=useRef(null);
 useEffect(()=>{const root=previewRoot?.current;if(!root)return;const update=e=>{output.current.textContent=`${e.detail}%`;};root.addEventListener('scorezoompreview',update);return()=>root.removeEventListener('scorezoompreview',update);},[previewRoot]);
 return <div className="mobileScoreZoom"><button type="button" aria-label={translateUi("components.fitValue1ToWidth", { value1: label })} onClick={onFit}><Translation id="components.fitWidth" /></button><output ref={output} aria-label={translateUi("components.value1ZoomLevel", { value1: label })}>{zoom}%</output></div>;
}
