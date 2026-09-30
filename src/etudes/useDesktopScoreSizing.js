import {useLayoutEffect,useRef,useState} from 'react';
import {desktopScoreScale} from './desktopScoreSizing.js';

export default function useDesktopScoreSizing(viewportRef,enabled,mode,scoreKey) {
  const sheetRef=useRef(null);
  const [scale,setScale]=useState(1);
  useLayoutEffect(()=>{
    const viewport=viewportRef.current,sheet=sheetRef.current;
    if(!enabled||!viewport||!sheet)return;
    const measure=()=>{
      viewport.parentElement.style.setProperty('--desktop-score-top',`${viewport.offsetTop}px`);
      const css=getComputedStyle(viewport);
      const width=viewport.clientWidth-(parseFloat(css.paddingLeft)||0)-(parseFloat(css.paddingRight)||0);
      const height=viewport.clientHeight-(parseFloat(css.paddingTop)||0)-(parseFloat(css.paddingBottom)||0);
      const next=desktopScoreScale({mode,width:width-2,height:height-2});
      setScale(current=>Math.abs(current-next)<.001?current:next);
    };
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(viewport);
    return()=>{observer.disconnect();viewport.parentElement.style.removeProperty('--desktop-score-top');};
  },[enabled,mode,scoreKey,viewportRef]);
  useLayoutEffect(()=>{
    if(enabled)viewportRef.current?.scrollTo({top:0,left:0,behavior:'instant'});
  },[enabled,scoreKey,viewportRef]);
  return {sheetRef,sheetStyle:enabled?{'--desktop-score-scale':scale}:undefined};
}
