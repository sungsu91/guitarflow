import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronsLeft,ChevronsRight} from 'lucide-react';
import './mobileCursorControls.css';
export default function MobileCursorControls({cursor,event,meter,onKey,onBar,navigationExtras,children}){
  useLanguage();
 const beat=event.onset/(1920/meter[1])+1;
 return <div className="mobileInstrumentControls"><div className="mobileInstrumentNavigationColumn"><div className="mobileInstrumentNavigation" role="group" aria-label={translateUi("etudes.cursorAndBarNavigation")}>
 <button type="button" aria-label={translateUi("etudes.previousBar")} title={translateUi("etudes.previousBar")} onClick={()=>onBar(-1)}><ChevronsLeft size={18}/><small><Translation id="app.bar" /></small></button><button type="button" aria-label={translateUi("etudes.inputPositionAbove")} onClick={()=>onKey('ArrowUp')}><ArrowUp size={20}/></button><button type="button" aria-label={translateUi("etudes.nextBar")} title={translateUi("etudes.nextBar")} onClick={()=>onBar(1)}><small><Translation id="app.bar" /></small><ChevronsRight size={18}/></button>
 <button type="button" aria-label={translateUi("etudes.previousInputPosition")} onClick={()=>onKey('ArrowLeft')}><ArrowLeft size={20}/></button><output aria-live="polite">{cursor.bar+1}<Translation id="app.bar" /><br/>{Number(beat.toFixed(2))}<Translation id="app.beat" /></output><button type="button" aria-label={translateUi("etudes.nextInputPosition")} onClick={()=>onKey('ArrowRight')}><ArrowRight size={20}/></button>
 <button type="button" className="mobileInstrumentDown" aria-label={translateUi("etudes.inputPositionBelow")} onClick={()=>onKey('ArrowDown')}><ArrowDown size={20}/></button>
 </div>{navigationExtras}</div><div className="mobileInstrumentActions">{children}</div></div>;
}
