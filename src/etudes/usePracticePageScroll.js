import {useLayoutEffect} from 'react';
import {bindPracticeScrollChain} from './practiceScrollChain.js';

// Scroll the page's controls away before handing a vertical gesture to the
// existing score reader. Playback, zoom and PDF page tracking keep that reader.
export default function usePracticePageScroll(layoutRef, enabled, pdf) {
 useLayoutEffect(()=>{
  const layout=layoutRef.current;
  if(!enabled||!layout)return;
  const selector=pdf?'.pdfScoreStage > .pdfViewport':'.etudeScoreViewport';
  let reader;
  let releaseReader;
  let frame=0;
  const update=()=>{
   frame=0;
   const nextReader=layout.querySelector(selector);
   if(reader!==nextReader){
    releaseReader?.();
    if(reader)delete reader.dataset.pageScroll;
    reader=nextReader;
    releaseReader=reader?bindPracticeScrollChain(reader,layout):null;
   }
   if(!reader)return;
   const top=parseFloat(getComputedStyle(layout).scrollMarginTop)||8;
   const intro=reader.getBoundingClientRect().top>top+2;
   reader.dataset.pageScroll=intro?'intro':'score';
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);
  observer.observe(layout);
  const studio=layout.closest('.pdfStudio');if(studio)observer.observe(studio);
  // Switching between a single PDF page and continuous pages replaces the
  // viewport. Observe only that boundary, not every rendered score element.
  const stage=pdf&&layout.querySelector('.pdfScoreStage');
  const pageObserver=stage?new MutationObserver(schedule):null;
  pageObserver?.observe(stage,{childList:true});
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  update();
  return()=>{
   cancelAnimationFrame(frame);observer.disconnect();pageObserver?.disconnect();
   releaseReader?.();
   if(reader)delete reader.dataset.pageScroll;
   window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
   window.visualViewport?.removeEventListener('resize',schedule);
  };
 },[layoutRef,enabled,pdf]);
}
