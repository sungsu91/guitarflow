import {useEffect,useRef,useState} from 'react';
import {followScrollTarget,followHorizontalTarget} from './practiceFollowGeometry.js';
export default function usePracticeFollow(root,mode,playing,revision){
 const [suspended,setSuspended]=useState(false),state=useRef({dirty:true}),latest=useRef({});
 latest.current={mode,playing,suspended};
 const resume=()=>{state.current.dirty=true;state.current.force=true;setSuspended(false);if(state.current.line?.isConnected)follow(state.current.line,state.current.current);};
 useEffect(()=>{state.current.dirty=true;},[revision,mode]);
 useEffect(()=>{const scroller=root.current?.closest('.etudeScoreViewport');if(!scroller)return;
 const suspend=()=>{if(latest.current.mode!=='off'&&latest.current.playing)setSuspended(true);};
 const wheel=e=>{if(!e.target.closest('button,input,select'))suspend();};
 let touch;
 const start=e=>{const t=e.touches[0];touch=t&&{x:t.clientX,y:t.clientY};};
 const move=e=>{const t=e.touches[0];if(touch&&t&&Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>6)suspend();};
 const pointer=e=>{const r=scroller.getBoundingClientRect();if(e.clientX>=r.left+scroller.clientWidth)suspend();};
 const keys=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)&&!e.target.closest('input,select,button'))suspend();};
 const dirty=()=>{state.current.dirty=true;};const observer=new ResizeObserver(dirty);observer.observe(scroller);observer.observe(root.current);
 scroller.addEventListener('wheel',wheel,{passive:true});scroller.addEventListener('touchstart',start,{passive:true});scroller.addEventListener('touchmove',move,{passive:true});scroller.addEventListener('pointerdown',pointer);scroller.addEventListener('keydown',keys);
 window.visualViewport?.addEventListener('resize',dirty);
 return()=>{observer.disconnect();scroller.removeEventListener('wheel',wheel);scroller.removeEventListener('touchstart',start);scroller.removeEventListener('touchmove',move);scroller.removeEventListener('pointerdown',pointer);scroller.removeEventListener('keydown',keys);window.visualViewport?.removeEventListener('resize',dirty);};
 },[root]);
 useEffect(()=>{if(!playing){const scroller=root.current?.closest('.etudeScoreViewport');scroller?.scrollTo({top:scroller.scrollTop,behavior:'instant'});}},[playing]);
 const follow=(line,current)=>{
  Object.assign(state.current,{line,current});const force=state.current.force;state.current.force=false;
  if(!mode||mode==='off'||(!force&&(suspended||!playing)))return;
  const svg=line.ownerSVGElement,scroller=root.current?.closest('.etudeScoreViewport');if(!scroller)return;
  const s=state.current,bar=svg.querySelector('[data-playback-bar="'+current.bar+'"]'),row=Number(bar?.dataset.row);if(!row)return;
  const rect=scroller.getBoundingClientRect(),v=window.visualViewport;
  let top=Math.max(rect.top,v?.offsetTop??0),bottom=Math.min(rect.bottom,(v?.offsetTop??0)+(v?.height??innerHeight));
  // Floating tools are real occlusion, not usable score space. Prefer the larger
  // unobstructed interval if a musician has dragged the widget over the score.
  const widget=document.querySelector('.etudeSessionWidget')?.getBoundingClientRect();
  if(widget&&widget.right>rect.left&&widget.left<rect.right&&widget.bottom>top&&widget.top<bottom){if(widget.top-top>=bottom-widget.bottom)bottom=Math.max(top,widget.top-8);else top=Math.min(bottom,widget.bottom+8);}
  const height=Math.max(1,bottom-top-12),signature=[rect.width,rect.height,height,top-rect.top,svg.getAttribute('viewBox')].join(':');
  const backwards=s.bar!=null&&(current.bar<s.bar||current.visit<s.visit||current.cycle!==s.cycle||current.bar===s.bar&&current.event<s.event);
  // Unlike vertical following, the beat can leave the viewport within one row.
  // Track its screen position every frame, including row changes and loop wraps.
  const maxLeft=scroller.scrollWidth-scroller.clientWidth;
  if(maxLeft>1){
    const cursor=line.getBoundingClientRect().left-rect.left-scroller.clientLeft+scroller.scrollLeft;
    const reset=force||s.dirty||s.svg!==svg||s.row!==row||backwards;
    const firstBar=svg.querySelector('[data-playback-bar][data-row="'+row+'"]');
    const lookAhead=Number(firstBar?.dataset.playbackBar)!==current.bar;
    const targetLeft=followHorizontalTarget(cursor,scroller.clientWidth,scroller.scrollLeft,maxLeft,reset,lookAhead);
    // Ease into the earlier anchor when the second bar starts, then track it.
    const left=lookAhead&&!reset?scroller.scrollLeft+(targetLeft-scroller.scrollLeft)*.2:targetLeft;
    if(Math.abs(scroller.scrollLeft-left)>1)scroller.scrollTo({left,top:scroller.scrollTop,behavior:'instant'});
  }
  s.bar=current.bar;s.event=current.event;s.visit=current.visit;s.cycle=current.cycle;
  if(!s.dirty&&s.svg===svg&&s.row===row&&s.signature===signature&&!backwards)return;
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const base=matrix.f-rect.top+scroller.scrollTop;
  const groups=new Map();svg.querySelectorAll('[data-playback-bar]').forEach(g=>{const id=Number(g.dataset.row);if(!groups.has(id))groups.set(id,{top:base+Number(g.dataset.rowTop)*matrix.d,bottom:base+Number(g.dataset.rowBottom)*matrix.d});});
  const rows=[...groups.values()],index=[...groups.keys()].indexOf(row);
  // Count the heading when measuring the first page of complete systems.
  if(rows.length)rows[0]={...rows[0],top:0};
  const target=followScrollTarget(rows,index,height,mode,scroller.scrollHeight-scroller.clientHeight+(top-rect.top))-(top-rect.top);
  const instant=backwards||s.dirty||mode==='page'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(Math.abs(scroller.scrollTop-target)>2)scroller.scrollTo({top:Math.max(0,target),behavior:instant?'instant':'smooth'});
  Object.assign(s,{dirty:false,svg,row,bar:current.bar,signature});
 };
 return {follow,suspended:mode!=='off'&&suspended,resume};
}
