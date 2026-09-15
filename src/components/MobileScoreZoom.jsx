import {useEffect,useRef} from 'react';
import './mobileScoreZoom.css';
export default function MobileScoreZoom({zoom,onFit,label='악보',previewRoot}) {
 const output=useRef(null);
 useEffect(()=>{const root=previewRoot?.current;if(!root)return;const update=e=>{output.current.textContent=`${e.detail}%`;};root.addEventListener('scorezoompreview',update);return()=>root.removeEventListener('scorezoompreview',update);},[previewRoot]);
 return <div className="mobileScoreZoom"><button type="button" aria-label={`${label} 너비 맞춤`} onClick={onFit}>너비 맞춤</button><output ref={output} aria-label={`${label} 현재 배율`}>{zoom}%</output></div>;
}
