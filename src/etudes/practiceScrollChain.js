// Consume a vertical movement once, carrying only the unused distance from the
// reader to the page. Controls hide first going down and return first going up.
export function scrollPracticePage(reader, layout, distance) {
 const view=reader.ownerDocument.defaultView;
 const scrollPage=delta=>{
  const before=view.scrollY;
  view.scrollBy({top:delta,behavior:'instant'});
  return view.scrollY-before;
 };
 let remaining=distance;
 if(remaining>0){
  const inset=parseFloat(view.getComputedStyle(layout).scrollMarginTop)||8;
  const intro=Math.max(0,reader.getBoundingClientRect().top-inset);
  if(intro>2)remaining-=scrollPage(Math.min(remaining,intro));
 }else if(remaining<0){
  // Reveal the controls immediately, retaining the current place in the score.
  remaining-=scrollPage(remaining);
 }
 const before=reader.scrollTop;
 const limit=Math.max(0,reader.scrollHeight-reader.clientHeight);
 reader.scrollTo({top:Math.max(0,Math.min(limit,before+remaining)),behavior:'instant'});
 remaining-=reader.scrollTop-before;
 if(Math.abs(remaining)>.5)remaining-=scrollPage(remaining);
 return distance-remaining;
}

// A native touch scroll can stay latched to its first scroll container for the
// entire gesture. Route vertical drags explicitly so reaching either edge does
// not require lifting the finger or finding the gutter beside the score.
export function bindPracticeScrollChain(reader,layout) {
 const view=reader.ownerDocument.defaultView;
 let gesture=null,frame=0,suppressClickUntil=0;
 const available=()=>reader.isConnected&&!reader.closest('.pdfPractice--editing,.is-fullscreen,.is-focus')&&(view.visualViewport?.scale??1)<=1;
 const stop=()=>{view.cancelAnimationFrame(frame);frame=0;};
 const start=event=>{
  stop();gesture=null;suppressClickUntil=0;
  if(event.defaultPrevented||event.touches.length!==1||!available())return;
  // Score bars are buttons too; only actual controls opt out of scrolling.
  if(event.target.closest?.('input,select,textarea,a,[contenteditable="true"],button:not(.pdfBarRow),[role="slider"]'))return;
  const touch=event.touches[0];
  gesture={id:touch.identifier,x:touch.clientX,y:touch.clientY,lastY:touch.clientY,time:event.timeStamp,velocity:0,vertical:false};
 };
 const move=event=>{
  if(!gesture)return;
  if(event.defaultPrevented||event.touches.length!==1||!available()){gesture=null;return;}
  const touch=event.touches[0];
  if(touch.identifier!==gesture.id){gesture=null;return;}
  if(!gesture.vertical){
   const dx=Math.abs(touch.clientX-gesture.x),dy=Math.abs(touch.clientY-gesture.y);
   if(Math.max(dx,dy)<4)return;
   // A thumb often starts diagonally. Yield only to a clear horizontal drag;
   // otherwise the browser can latch before the next vertical movement.
   if(dx>dy*1.5||!event.cancelable){gesture=null;return;}
   gesture.vertical=true;
  }
  if(!event.cancelable){gesture=null;return;}
  event.preventDefault();
  const distance=gesture.lastY-touch.clientY;
  const elapsed=Math.max(1,event.timeStamp-gesture.time);
  const moved=scrollPracticePage(reader,layout,distance);
  const velocity=elapsed<80?Math.max(-3,Math.min(3,distance/elapsed)):0;
  gesture.velocity=moved?velocity:0;
  gesture.lastY=touch.clientY;gesture.time=event.timeStamp;
  suppressClickUntil=view.performance.now()+400;
 };
 const end=event=>{
  const previous=gesture;gesture=null;
  if(!previous?.vertical||event.touches.length||event.timeStamp-previous.time>80)return;
  let velocity=previous.velocity,last=view.performance.now();
  const coast=now=>{
   frame=0;
   if(!available())return;
   const elapsed=Math.min(32,now-last);last=now;
   const moved=scrollPracticePage(reader,layout,velocity*elapsed);
   velocity*=Math.exp(-elapsed/180);
   if(Math.abs(moved)>.5&&Math.abs(velocity)>.03)frame=view.requestAnimationFrame(coast);
  };
  if(Math.abs(velocity)>.03)frame=view.requestAnimationFrame(coast);
 };
 const cancel=()=>{gesture=null;stop();};
 const wheel=event=>{
  stop();
  if(event.defaultPrevented||!event.cancelable||event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||!available())return;
  event.preventDefault();
  const unit=event.deltaMode===1?16:event.deltaMode===2?reader.clientHeight:1;
  scrollPracticePage(reader,layout,event.deltaY*unit);
 };
 const click=event=>{if(view.performance.now()<suppressClickUntil&&event.detail){event.preventDefault();event.stopPropagation();suppressClickUntil=0;}};
 reader.addEventListener('touchstart',start,{passive:true});
 reader.addEventListener('touchmove',move,{passive:false});
 reader.addEventListener('touchend',end,{passive:true});
 reader.addEventListener('touchcancel',cancel,{passive:true});
 reader.addEventListener('wheel',wheel,{passive:false});
 reader.addEventListener('click',click,true);
 // A new touch anywhere stops momentum, including on the surrounding page.
 view.addEventListener('touchstart',stop,{passive:true,capture:true});
 view.addEventListener('pagehide',cancel);
 reader.addEventListener('practice-scroll-reset',cancel);
 return()=>{
  cancel();
  reader.removeEventListener('touchstart',start);
  reader.removeEventListener('touchmove',move);
  reader.removeEventListener('touchend',end);
  reader.removeEventListener('touchcancel',cancel);
  reader.removeEventListener('wheel',wheel);
  reader.removeEventListener('click',click,true);
  view.removeEventListener('touchstart',stop,true);
  view.removeEventListener('pagehide',cancel);
  reader.removeEventListener('practice-scroll-reset',cancel);
 };
}
