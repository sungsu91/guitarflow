import {useEffect,useRef} from 'react';

export default function usePlaybackFollow(root,enabled) {
  const quietUntil=useRef(0),lastCheck=useRef(0);
  useEffect(()=>{
    const yieldToUser=()=>{quietUntil.current=performance.now()+4000;};
    const keys=e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)&&!e.target.closest('input,select,button,textarea'))yieldToUser();};
    const pointer=e=>{if(root.current?.contains(e.target)||e.clientX>=document.documentElement.clientWidth)yieldToUser();};
    window.addEventListener('wheel',yieldToUser,{passive:true});window.addEventListener('touchmove',yieldToUser,{passive:true});window.addEventListener('pointerdown',pointer);window.addEventListener('keydown',keys);
    return()=>{window.removeEventListener('wheel',yieldToUser);window.removeEventListener('touchmove',yieldToUser);window.removeEventListener('pointerdown',pointer);window.removeEventListener('keydown',keys);};
  },[root]);
  return line=>{
    const now=performance.now();if(!enabled||now<quietUntil.current||now-lastCheck.current<300)return;
    lastCheck.current=now;
    const bounds=line.getBoundingClientRect();
    let scroller=root.current?.parentElement;
    while(scroller&&!(scroller.scrollHeight>scroller.clientHeight&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
    if(scroller===document.documentElement||scroller===document.body)scroller=null;
    const viewport=window.visualViewport;
    const area=scroller?.getBoundingClientRect()??{top:viewport?.offsetTop??0,bottom:(viewport?.offsetTop??0)+(viewport?.height??innerHeight)};
    const top=area.top+76,bottom=area.bottom-36,height=bottom-top;
    // A tall score system is aligned at its top, avoiding oscillation between edges.
    let delta=0;
    if(bounds.top<top-8||bounds.top>bottom-24)delta=bounds.top-top;
    else if(bounds.height<=height&&bounds.bottom>bottom)delta=bounds.bottom-bottom;
    if(Math.abs(delta)>8){
      const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
      (scroller??window).scrollBy({top:delta,behavior});lastCheck.current=now+500;
    }
  };
}
