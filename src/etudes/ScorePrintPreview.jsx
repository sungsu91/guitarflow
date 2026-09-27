import React,{useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import {scoreCredit} from './scoreMetadata.js';
import {renderScorePrint} from './renderScorePrint.js';
import './scoreSourceFrame.css';
import './scorePrint.css';

export default function ScorePrintPreview({container,title,view,metadata,mobile}) {
 const language=useLanguage(),root=useRef(),paper=useRef(),renderer=useRef(),drag=useRef();
 const [settings,setSettings]=useState(()=>({title:title||'',description:metadata?scoreCredit(metadata):'',showDescription:true,pageNumbers:true,spacing:0}));
 const [count,setCount]=useState(1),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let disposed=false;
  const timer=setTimeout(async()=>{
   try{await document.fonts.ready;if(disposed)return;renderer.current=renderScorePrint(paper.current,container,view,metadata,settings,setCount);setReady(true);}
   catch(error){console.error(error);if(!disposed)setError(language==='ko'?'미리보기를 준비하지 못했습니다. 닫은 뒤 다시 시도해 주세요.':'Could not prepare the preview. Close it and try again.');}
  },30);
  return()=>{disposed=true;clearTimeout(timer);renderer.current?.dispose();renderer.current=null;};
 },[]);
 useEffect(()=>{renderer.current?.update(settings);},[settings]);
 return <PrintWorkspace mobile={mobile} root={root} {...settings} onChange={patch=>setSettings(old=>({...old,...patch}))} pageCount={count} ready={ready} previewError={error} contentKey={settings}>
  {({zoom,positioning,busy})=><div ref={paper} className="score-print-pages" onPointerDown={event=>{
   if(busy||(mobile&&!positioning)||!event.target.closest('[data-print-page]'))return;
   event.preventDefault();drag.current={y:event.clientY,spacing:settings.spacing,zoom};event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event=>{const start=drag.current;if(start)setSettings(old=>({...old,spacing:Math.round(Math.max(0,Math.min(240,start.spacing+(event.clientY-start.y)/start.zoom)))}));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}/>}
 </PrintWorkspace>;
}
