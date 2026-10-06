import {useLayoutEffect,useRef,useState} from 'react';
import {ChevronsLeft,ChevronLeft,ChevronRight,ChevronsRight} from 'lucide-react';
import {useLanguage} from '../i18n/react.jsx';
import './mobileScorePages.css';

// Page movement uses the same scroll surface as playback and touch navigation.
export default function MobileScorePageNav({root,revision,onNavigate,scoreId}) {
 const language=useLanguage(),nav=useRef(null),pages=useRef([]),anchor=useRef(null);
 const [current,setCurrent]=useState(1),[count,setCount]=useState(0);
 const label=(ko,en)=>language==='ko'?ko:en;
 const scrollToPage=index=>{
  const paper=pages.current[index],viewport=root.current?.closest('.etudeScoreViewport');
  if(!paper||!viewport)return;
  const top=paper.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop-(nav.current?.offsetHeight??44)-8;
  viewport.scrollTo({top:Math.max(0,top),left:0,behavior:'instant'});
 };
 useLayoutEffect(()=>{
  const viewport=root.current?.closest('.etudeScoreViewport');if(!viewport)return;
  pages.current=[...root.current.querySelectorAll('.mobileScorePage')];setCount(pages.current.length);
  const stack=root.current;
  const fitLastPage=()=>{
   const last=pages.current.at(-1);if(!last)return;
   // Leave enough scroll room to align the final paper below the page controls.
   const tail=Math.max(100,viewport.clientHeight-(nav.current?.offsetHeight??44)-8-last.offsetHeight);
   stack.style.setProperty('--mobile-score-tail',`${tail}px`);
  };
  fitLastPage();
  let frame=0;
  const read=()=>{
   frame=0;const edge=viewport.getBoundingClientRect().top+(nav.current?.offsetHeight??44)+24;
   let index=0;
   pages.current.forEach((paper,i)=>{if(paper.getBoundingClientRect().top<=edge)index=i;});
   if(viewport.scrollHeight>viewport.clientHeight&&viewport.scrollHeight-viewport.scrollTop-viewport.clientHeight<=2)index=Math.max(0,pages.current.length-1);
   setCurrent(index+1);root.current.dataset.visiblePage=String(index+1);
   const paper=pages.current[index];if(paper)anchor.current={scoreId,bar:Number(paper.dataset.firstBar)};
  };
  if(pages.current.length){
   const bar=anchor.current?.scoreId===scoreId?anchor.current.bar:0;
   const index=pages.current.findIndex(p=>Number(p.dataset.firstBar)<=bar&&Number(p.dataset.lastBar)>=bar);
   scrollToPage(Math.max(0,index));read();
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(read);};
  const resize=new ResizeObserver(()=>{fitLastPage();schedule();});resize.observe(viewport);
  if(pages.current.length)resize.observe(pages.current.at(-1));
  viewport.addEventListener('scroll',schedule,{passive:true});
  return()=>{resize.disconnect();cancelAnimationFrame(frame);viewport.removeEventListener('scroll',schedule);stack.style.removeProperty('--mobile-score-tail');};
 },[root,revision,scoreId]);
 const move=delta=>{onNavigate?.();scrollToPage(current-1+delta);};
 const first=()=>{
  const viewport=root.current?.closest('.etudeScoreViewport');if(!viewport)return;
  onNavigate?.();
  viewport.dispatchEvent(new Event('practice-scroll-reset'));
  viewport.scrollTo({top:0,left:0,behavior:'instant'});
  const view=viewport.ownerDocument.defaultView;
  view.scrollTo({top:0,behavior:view.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 return <nav ref={nav} className="mobileScorePageNav" aria-label={label('악보 페이지 이동','Score page navigation')}>
  <button type="button" aria-label={label('페이지 처음으로','Back to first page')} title={label('페이지 처음으로','Back to first page')} disabled={!count} onClick={first}><ChevronsLeft size={18} aria-hidden="true"/></button>
  <button type="button" aria-label={label('이전 악보 페이지','Previous score page')} disabled={current<=1} onClick={()=>move(-1)}><ChevronLeft size={18}/></button>
  <output aria-label={label('현재 악보 페이지','Current score page')}>{current} / {Math.max(1,count)}</output>
  <button type="button" aria-label={label('다음 악보 페이지','Next score page')} disabled={!count||current>=count} onClick={()=>move(1)}><ChevronRight size={18}/></button>
  <button type="button" aria-label={label('페이지 마지막으로','Go to last page')} title={label('페이지 마지막으로','Go to last page')} disabled={!count||current>=count} onClick={()=>{onNavigate?.();scrollToPage(count-1);}}><ChevronsRight size={18} aria-hidden="true"/></button>
 </nav>;
}
