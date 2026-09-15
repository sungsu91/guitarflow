import {useRef,useLayoutEffect} from 'react';
import {DurationButtons} from './EditorInputPanel.jsx';
export default function MobileScoreInput({cursor,event,meter,duration,onDuration,onKey,onBar,onAddBar,onPick,onBatch,onDetails,playback,twoDigit,onDigitMode}) {
 const panel=useRef(null);useLayoutEffect(()=>{const node=panel.current,observer=new ResizeObserver(()=>node.closest('dialog').style.setProperty('--mobile-input-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[]);
 const key=(k,label)=> <button type="button" aria-label={label} onClick={()=>onKey(k)}>{label==='위 기타 줄'?'↑':label==='아래 기타 줄'?'↓':label==='이전 입력 위치'?'←':label==='다음 입력 위치'?'→':label}</button>;
 return <section ref={panel} className="mobileScoreInput" aria-label="통합 악보 입력">
  <div className="mobileCursorPad">
   <button type="button" onClick={()=>onBar(-1)} aria-label="이전 마디">◀ 마디</button>{key('ArrowUp','위 기타 줄')}<button type="button" onClick={()=>onBar(1)} aria-label="다음 마디">마디 ▶</button>
   {key('ArrowLeft','이전 입력 위치')}<output>{cursor.bar+1}마디 · {event.onset/(1920/meter[1])+1}박 · {cursor.string}번줄</output>{key('ArrowRight','다음 입력 위치')}
   {key('r','쉼표')}{key('ArrowDown','아래 기타 줄')}{key('Delete','삭제')}
  </div>
  <div className="mobileDurationRow"><DurationButtons value={duration} onChange={onDuration} compact/>{key('r','쉼')}</div>
  <div className="mobileFretPad" aria-label="프렛 숫자 입력">{['1','2','3','4','5','6','7','8','9','0','X','⌫'].map(k=><button type="button" key={k} aria-label={k==='⌫'?'프렛 삭제':k==='X'?'뮤트음':`프렛 ${k}`} onClick={()=>onKey(k==='⌫'?'Delete':k)}>{k}</button>)}</div>
  <div className="mobilePickingColumns"><div className="mobilePickRow"><span>일괄</span>{[['down','↓'],['up','↑'],['alternate-down','↓↑']].map(([value,label])=><button type="button" key={value} aria-label={value==='down'?'모두 다운':value==='up'?'모두 업':'다운 업 교대'} onClick={()=>onBatch(value)}>{label}</button>)}</div>
  <div className="mobilePickRow"><span>직접</span>{[['down','↓'],['up','↑'],[null,'지움']].map(([value,label])=><button type="button" key={label} aria-label={`직접 피킹 ${label}`} onClick={()=>onPick(value)}>{label}</button>)}</div></div>
  <div className="mobileInputExtras"><button type="button" onClick={onAddBar}>마디 추가</button><button type="button" aria-pressed={twoDigit} onClick={onDigitMode}>{twoDigit?'두 자리 켬':'두 자리 자동'}</button><button type="button" onClick={()=>onDetails('menu')}>메뉴</button></div>
  {playback}
 </section>;
}
