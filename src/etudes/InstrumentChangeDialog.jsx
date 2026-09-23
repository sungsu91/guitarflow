import { localizeUi } from "../i18n/core.js";
import { Translation } from "./../i18n/react.jsx";
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
  <h2 id="instrument-change-title">{target}<Translation id="etudes.switchToThisInstrument" /></h2>
  <p><Translation id="etudes.thisScoreCannotBeConvertedDirectly" /></p>
  <p id="instrument-change-reason" className="instrumentChangeReason">{localizeUi(request.reason)}</p>
  <p><Translation id="etudes.saveOrDiscardTheCurrentScoreThenStartWithA" /><strong><Translation id="etudes.blank" />{target}<Translation id="etudes.score" /></strong><Translation id="etudes.previouslySavedScoresWillNotBeDeleted" /></p>
  <div className="instrumentChangeActions">
   <button type="button" className="instrumentChangeSave" onClick={onSave}><Translation id="etudes.saveAndSwitch" /></button>
   <button type="button" onClick={onDiscard}><Translation id="etudes.switchWithoutSaving" /></button>
   <button type="button" autoFocus onClick={onCancel}><Translation id="etudes.cancelKeepCurrentScore" /></button>
  </div>
 </dialog>;
}
