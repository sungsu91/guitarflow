import {useEffect,useState,useRef} from 'react';
// Touch capability plus actual viewport orientation: a wide desktop is not a phone.
export default function usePracticeLayout(){
 const read=()=>{const v=window.visualViewport,width=v?v.width*(v.scale||1):innerWidth,height=v?v.height*(v.scale||1):innerHeight;return {width,height,left:v?.scale>1?0:v?.offsetLeft??0,top:v?.scale>1?0:v?.offsetTop??0,landscape:matchMedia('(orientation: landscape)').matches&&width>height&&Math.min(width,height)<900&&(matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0)};};
 const ownedFullscreen=useRef(false),requestId=useRef(0);
 const release=()=>{requestId.current++;screen.orientation?.unlock?.();if(ownedFullscreen.current&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});ownedFullscreen.current=false;};
 useEffect(()=>()=>release(),[]);
 const [viewport,setViewport]=useState(read),[manual,setManual]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{const update=()=>setViewport(read());window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);return()=>{window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};},[]);
 useEffect(()=>{if(!viewport.landscape){setDismissed(false);setManual(false);}},[viewport.landscape]);
 return {focus:manual||(viewport.landscape&&!dismissed),viewport,enter:async()=>{setDismissed(false);setManual(true);const id=++requestId.current;try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();ownedFullscreen.current=true;}if(id===requestId.current)await screen.orientation?.lock?.('landscape');else release();}catch{/* Unsupported orientation lock keeps the focused layout available. */}},exit:()=>{release();setManual(false);setDismissed(true);}};
}

