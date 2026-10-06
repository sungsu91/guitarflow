import {useMemo} from 'react';
import {pdfRepeatRoute} from './pdfRepeatRoute.js';

export default function DesktopPdfRepeatRoute({bars,order,t}){
 const segments=useMemo(()=>pdfRepeatRoute(bars,order),[bars,order]);
 return <div className="desktopPdfRepeatRoute" aria-label={t('재생 순서','Playback order')}>
  <span>{t('재생 순서','Playback order')}</span><div>{segments.map((part,i)=>{
   const label=part.change==='return'?t(`${part.from}마디에서 ${part.start}마디로 되돌아감`,`Return from measure ${part.from} to ${part.start}`):t(`${part.from}마디에서 ${part.start}마디로 건너뜀`,`Skip from measure ${part.from} to ${part.start}`);
   return <span key={i} className={part.change?'is-changed':''} data-route-change={part.change??undefined} title={part.change?label:undefined}>
    {part.change&&<span className="desktopPdfRepeatJump" aria-label={label}>{part.change==='return'?'↶':'↗'}</span>}
    {part.start}{part.end!==part.start?`–${part.end}`:''}
   </span>;
  })}</div>
 </div>;
}
