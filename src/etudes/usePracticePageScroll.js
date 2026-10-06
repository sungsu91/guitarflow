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
  const update=()=>{
   const nextReader=layout.querySelector(selector);
   if(reader!==nextReader){
    releaseReader?.();
    reader=nextReader;
    releaseReader=reader?bindPracticeScrollChain(reader,layout):null;
   }
  };
  // A lazily mounted PDF or a switch to continuous pages can replace the
  // reader. Rebind only then, without measuring layout on every scroll frame.
  const pageObserver=new MutationObserver(()=>{if(!reader?.isConnected)update();});
  pageObserver.observe(layout,{childList:true,subtree:true});
  update();
  return()=>{
   pageObserver.disconnect();
   releaseReader?.();
  };
 },[layoutRef,enabled,pdf]);
}
