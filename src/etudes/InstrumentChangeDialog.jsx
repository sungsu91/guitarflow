import {useLayoutEffect,useRef} from 'react';
import {scoreInstrument} from './scoreInstruments.js';

export default function InstrumentChangeDialog({request,anchor,onCancel,onSave,onDiscard}){
 const ref=useRef(null),target=scoreInstrument(request.id).label;
 useLayoutEffect(()=>{
  const dialog=ref.current;dialog.showModal();
  const position=()=>{
   const viewport=window.visualViewport,top=viewport?.offsetTop??0,height=viewport?.height??window.innerHeight;
   const area=anchor.current?.querySelector('.etudeEditorCanvas')?.getBoundingClientRect()??anchor.current?.getBoundingClientRect();
   dialog.style.maxHeight=`${height-24}px`;
   const y=area?area.top+(area.height-dialog.getBoundingClientRect().height)/2:top+24;
   dialog.style.setProperty('--instrument-change-top',`${Math.max(top+12,Math.min(y,top+height-dialog.getBoundingClientRect().height-12))}px`);
  };
  position();window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
  return()=>{window.removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);dialog.close();};
 },[anchor]);
 return <dialog ref={ref} className="instrumentChangeDialog" aria-labelledby="instrument-change-title" aria-describedby="instrument-change-reason" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onCancel();}}>
  <h2 id="instrument-change-title">{target}로 변경할까요?</h2>
  <p>현재 악보를 그대로 변환할 수 없습니다.</p>
  <p id="instrument-change-reason" className="instrumentChangeReason">{request.reason}</p>
  <p>계속하려면 현재 악보를 저장하거나 버린 뒤, <strong>빈 {target} 악보</strong>로 시작하세요. 이미 저장된 악보는 삭제되지 않습니다.</p>
  <div className="instrumentChangeActions">
   <button type="button" className="instrumentChangeSave" onClick={onSave}>저장하고 변경</button>
   <button type="button" onClick={onDiscard}>저장하지 않고 변경</button>
   <button type="button" autoFocus onClick={onCancel}>취소 · 현재 악보 유지</button>
  </div>
 </dialog>;
}
