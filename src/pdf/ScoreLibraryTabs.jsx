import {useLayoutEffect,useRef} from 'react';

export default function ScoreLibraryTabs({mode,onChange}){
 const anchor=useRef(null),nav=useRef(null);
 useLayoutEffect(()=>{
  let frame;
  // The app root clips horizontal overflow, making CSS sticky follow the wrong
  // scrolling ancestor. Affix only this navigation without changing app layout.
  const place=()=>{frame=0;const r=anchor.current.getBoundingClientRect(),node=nav.current;
   if(r.top<0){Object.assign(node.style,{position:'fixed',top:'0px',left:`${r.left}px`,width:`${r.width}px`});}
   else{node.style.position='';node.style.top='';node.style.left='';node.style.width='';}
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(place);};
  const observer=new ResizeObserver(schedule);observer.observe(anchor.current);
  window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);place();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
 },[]);
 return <div ref={anchor} className="scoreTabsAnchor"><nav ref={nav} className="scoreMainTabs" role="tablist" aria-label="악보 카테고리">{[['pdf','내 악보'],['lessons','에튀드']].map(([key,label])=><button key={key} type="button" role="tab" id={`score-tab-${key}`} aria-selected={mode===key} aria-controls="score-library-panel" onClick={()=>onChange(key)}>{label}</button>)}</nav></div>;
}
