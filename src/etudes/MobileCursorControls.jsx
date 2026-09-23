import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,ChevronsLeft,ChevronsRight} from 'lucide-react';
import './mobileCursorControls.css';
export default function MobileCursorControls({cursor,event,meter,onKey,onBar,navigationExtras,children}){
 const beat=event.onset/(1920/meter[1])+1;
 return <div className="mobileInstrumentControls"><div className="mobileInstrumentNavigationColumn"><div className="mobileInstrumentNavigation" role="group" aria-label="커서와 마디 이동">
 <button type="button" aria-label="이전 마디" title="이전 마디" onClick={()=>onBar(-1)}><ChevronsLeft size={18}/><small>마디</small></button><button type="button" aria-label="위 입력 위치" onClick={()=>onKey('ArrowUp')}><ArrowUp size={20}/></button><button type="button" aria-label="다음 마디" title="다음 마디" onClick={()=>onBar(1)}><small>마디</small><ChevronsRight size={18}/></button>
 <button type="button" aria-label="이전 입력 위치" onClick={()=>onKey('ArrowLeft')}><ArrowLeft size={20}/></button><output aria-live="polite">{cursor.bar+1}마디<br/>{Number(beat.toFixed(2))}박</output><button type="button" aria-label="다음 입력 위치" onClick={()=>onKey('ArrowRight')}><ArrowRight size={20}/></button>
 <button type="button" className="mobileInstrumentDown" aria-label="아래 입력 위치" onClick={()=>onKey('ArrowDown')}><ArrowDown size={20}/></button>
 </div>{navigationExtras}</div><div className="mobileInstrumentActions">{children}</div></div>;
}
