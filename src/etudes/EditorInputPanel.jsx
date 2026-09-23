import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
export function DurationIcon({value}) {
 const hollow=value==='1'||value==='2';
 return <svg viewBox="0 0 24 28" width="24" height="28" aria-hidden="true" focusable="false"><ellipse cx="9" cy="21" rx="4.5" ry="3" transform="rotate(-20 9 21)" fill={hollow?'none':'currentColor'} stroke="currentColor" strokeWidth="1.5"/>{value!=='1'&&<path d="M13 20V4" fill="none" stroke="currentColor" strokeWidth="1.8"/>}{Number(value)>=8&&<path d="M13 4c0 5 7 4 5 11" fill="none" stroke="currentColor" strokeWidth="1.8"/>}{value==='16'&&<path d="M13 9c0 5 6 4 5 10" fill="none" stroke="currentColor" strokeWidth="1.8"/>}</svg>;
}
export function DurationButtons({value,onChange,compact=false}) {
  useLanguage();
 return <div className={`etudeDurationButtons${compact?' is-compact':''}`} role="group" aria-label={translateUi("etudes.quickNoteDuration")}>{[['1',ko["etudes.wholeNote"]],['2',ko["etudes.halfNote"]],['4',ko["etudes.quarterNote"]],['8',ko["etudes.eighthNote"]],['16',ko["etudes.sixteenthNote"]]].map(([v,label])=><button type="button" key={v} aria-label={localizeUi(label)} title={localizeUi(label)} aria-pressed={value===v} onClick={()=>onChange(v)}><DurationIcon value={v}/>{!compact&&<span>{v==='1'?translateUi("etudes.wholeNote"):translateUi("etudes.1Value1", { value1: v })}</span>}</button>)}</div>;
}
export default function EditorInputPanel({stringCount=6,cursor,event,onString,onFret,onDelete}) {
  useLanguage();
 const tone=event.notes.find(n=>n.string===cursor.string);
 return <aside className="etudeContextPanel" aria-label={translateUi("etudes.quickInputPanel")}>

  <div className="etudeCurrentNote" aria-live="polite"><span className="etudePanelEyebrow"><Translation id="etudes.currentSelection" /></span><div><DurationIcon value={event.duration}/><p><strong>{event.rest?(event.blank?translateUi("etudes.emptyInputPosition"):translateUi("etudes.rest")):tone?translateUi("etudes.stringValue1FretValue2", { value1: cursor.string, value2: tone.fret }):translateUi("etudes.selectedStringIsEmpty")}</strong><small>{cursor.bar+1}<Translation id="app.barApp" />{event.onset/480+1}<Translation id="etudes.beat" />{cursor.string}<Translation id="etudes.string" />{event.duration==='1'?translateUi("etudes.wholeNote"):translateUi("etudes.1Value1Note", { value1: event.duration })}</small></p></div></div>
  <>
   <div className="etudeInputField"><span className="etudePanelEyebrow"><Translation id="etudes.chooseString" /></span><div className="etudeStringButtons">{Array.from({length:stringCount},(_,i)=>i+1).map(string=><button type="button" key={string} aria-label={translateUi("etudes.inputStringValue1", { value1: string })} aria-pressed={cursor.string===string} onClick={()=>onString(string)}>{string}</button>)}</div></div>
   <div className="etudeInputField"><label htmlFor="etude-quick-fret"><Translation id="etudes.fretNumber" /></label><div className="etudeFretStepper"><button type="button" aria-label={translateUi("etudes.lowerFret")} disabled={!tone||tone.fret===0} onClick={()=>onFret(tone.fret-1)}>−</button><input id="etude-quick-fret" aria-label={translateUi("etudes.quickFretInput")} type="number" min="0" max="24" value={tone?.fret??''} placeholder="—" onChange={e=>{if(e.target.value!==''&&e.target.validity.valid)onFret(Number(e.target.value));}}/><button type="button" aria-label={translateUi("etudes.raiseFret")} disabled={tone?.fret===24} onClick={()=>onFret((tone?.fret??-1)+1)}>+</button></div></div>
   <p className="etudePanelHint"><Translation id="etudes.clickTheScoreThenTypeANumber" /><br/><Translation id="etudes.changeStringChangeBeat" /></p>
   <button type="button" className="etudePanelDelete" onClick={onDelete} disabled={event.blank||(!event.rest&&!tone)}><Translation id="etudes.deleteSelectedNoteRest" /></button>
  </>
 </aside>;
}
