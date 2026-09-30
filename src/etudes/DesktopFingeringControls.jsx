import {t} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';

export default function DesktopFingeringControls({event,onChange}){
 useLanguage();
 return <details className="desktopFingeringControls"><summary><Translation id="editor.fingerings" /></summary>
  {event.rest||!event.notes.length?<p><Translation id="etudes.selectANoteToApplyATechnique" /></p>:event.notes.map((note,index)=><div className="desktopFingeringRow" key={note.id}>
   <strong>{note.string}<Translation id="app.string" /> · {note.fret}<Translation id="app.fret" /></strong>
   <label><Translation id="etudes.leftHandFinger" /><select aria-label={t('etudes.noteValue1LeftHandFinger',{value1:index+1})} value={note.finger??''} onChange={e=>onChange(note.id,'finger',e.target.value?Number(e.target.value):null)}><option value=""><Translation id="app.none" /></option>{[1,2,3,4].map(value=><option key={value}>{value}</option>)}</select></label>
   <label><Translation id="etudes.rightHand" /><select aria-label={t('etudes.noteValue1RightHand',{value1:index+1})} value={note.rightFinger??''} onChange={e=>onChange(note.id,'rightFinger',e.target.value||null)}><option value=""><Translation id="app.none" /></option>{['p','i','m','a'].map(value=><option key={value}>{value}</option>)}</select></label>
  </div>)}
 </details>;
}
