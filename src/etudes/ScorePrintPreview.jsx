import React,{useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import {scoreCredit} from './scoreMetadata.js';
import {renderScorePrint} from './renderScorePrint.js';
import './scoreSourceFrame.css';
import './scorePrint.css';

export default function ScorePrintPreview({container,title,view,metadata,mobile}) {
 const language=useLanguage(),root=useRef(),paper=useRef(),renderer=useRef(),drag=useRef();
 const [settings,setSettings]=useState(()=>({title:title||'',description:metadata?scoreCredit(metadata):'',description2:'',showDescription:true,pageNumbers:true,spacings:{}}));
 const [activePage,setActivePage]=useState(0),[limits,setLimits]=useState([240,240]);
 const [count,setCount]=useState(1),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let disposed=false;
  const timer=setTimeout(async()=>{
   try{await document.fonts.ready;if(disposed)return;renderer.current=renderScorePrint(paper.current,container,view,metadata,settings,(count,limits)=>{setCount(count);setLimits(limits);});setReady(true);}
   catch(error){console.error(error);if(!disposed)setError(language==='ko'?'미리보기를 준비하지 못했습니다. 닫은 뒤 다시 시도해 주세요.':'Could not prepare the preview. Close it and try again.');}
  },30);
  return()=>{disposed=true;clearTimeout(timer);renderer.current?.dispose();renderer.current=null;};
 },[]);
 useEffect(()=>{renderer.current?.update(settings);},[settings]);
 const change=patch=>setSettings(old=>{const {spacing,...metadata}=patch;return {...old,...metadata,...(spacing===undefined?{}:{spacings:{...old.spacings,[activePage]:spacing}})};});
 return <PrintWorkspace mobile={mobile} root={root} {...settings} spacing={settings.spacings[activePage]||0} spacingMax={limits[activePage===0?0:1]} onChange={change} onPreviewPage={setActivePage} pageCount={count} ready={ready} previewError={error} contentKey={settings}
  positionControls={()=><p>{language==='ko'?`${activePage+1}페이지 위치 조절`:`Position on page ${activePage+1}`}</p>}>
  {({zoom,positioning,busy})=><div ref={paper} className="score-print-pages" onPointerDown={event=>{
   if(busy||(mobile&&!positioning)||drag.current||!event.target.closest('.score-print-page > section'))return;
   const page=Number(event.target.closest('[data-print-page]').dataset.pageIndex);
   event.preventDefault();setActivePage(page);drag.current={id:event.pointerId,page,y:event.clientY,spacing:settings.spacings[page]||0,zoom,limit:limits[page===0?0:1]};event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event=>{const start=drag.current;if(start?.id===event.pointerId)setSettings(old=>({...old,spacings:{...old.spacings,[start.page]:Math.round(Math.max(0,Math.min(start.limit,start.spacing+(event.clientY-start.y)/start.zoom)))}}));}} onPointerUp={event=>{if(drag.current?.id===event.pointerId)drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}/>}
 </PrintWorkspace>;
}
