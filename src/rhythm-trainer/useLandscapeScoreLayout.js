import {useLayoutEffect,useState} from 'react';

// Only the phone landscape surface uses the available pane height to size music.
export default function useLandscapeScoreLayout(scoreRef,{active,screen,barsPerRow,measureCount}) {
 const [layout,setLayout]=useState({rowHeight:64,staffWidth:328});
 useLayoutEffect(()=>{
  const pane=scoreRef.current;
  if(!active||!pane)return;
  const measure=()=>{
   const rows=Math.ceil(measureCount/barsPerRow);
   const visibleRows=barsPerRow===1?4:Math.min(4,Math.max(1,rows));
   const gap=barsPerRow===1?10:16;
   const rowHeight=Math.max(40,Math.min(barsPerRow===1?78:100,
    (pane.clientHeight-24-gap*(visibleRows-1))/visibleRows));
   const cellWidth=Math.max(1,pane.clientWidth-24)/barsPerRow;
   const staffWidth=Math.max(220,cellWidth*78/rowHeight-(barsPerRow===1?32:0));
   setLayout(previous=>previous.rowHeight===rowHeight&&previous.staffWidth===staffWidth
    ?previous:{rowHeight,staffWidth});
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(pane);
  return()=>observer.disconnect();
 },[active,screen,barsPerRow,measureCount,scoreRef]);
 return active?layout:null;
}
