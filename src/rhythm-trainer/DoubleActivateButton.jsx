import {useRef} from 'react';

// Native double-click for a mouse, a matching quick pair of taps for touch.
// Keyboard and assistive activation keep the button's ordinary semantics.
export default function DoubleActivateButton({onSelect,onActivate,children,...props}) {
 const pointer=useRef('');
 const tap=useRef(null);
 return <button {...props} type="button" style={{touchAction:'manipulation',...props.style}}
  onPointerDown={event=>{pointer.current=event.pointerType;}}
  onClick={event=>{
   if(event.detail===0){tap.current=null;(onActivate??onSelect)?.(event);return;}
   const touch=pointer.current==='touch'||event.nativeEvent.sourceCapabilities?.firesTouchEvents;
   if(touch){
    const previous=tap.current;
    tap.current={time:event.timeStamp,x:event.clientX,y:event.clientY};
    if(previous&&event.timeStamp-previous.time<=320&&Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<24){tap.current=null;onActivate?.(event);return;}
   }else if(event.detail>1)return;
   onSelect?.(event);
  }}
  onDoubleClick={event=>{if(pointer.current!=='touch'&&!event.nativeEvent.sourceCapabilities?.firesTouchEvents)onActivate?.(event);}}
 >{children}</button>;
}
