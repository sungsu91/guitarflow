import React,{useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/react.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import {scoreCredit} from './scoreMetadata.js';
import {renderScorePrint} from './renderScorePrint.js';
import './scoreSourceFrame.css';
import './scorePrint.css';

export default function ScorePrintPreview({container,title,view,metadata,mobile}) {
 const language=useLanguage(),root=useRef(),paper=useRef(),renderer=useRef();
 const [settings,setSettings]=useState(()=>({title:title||'',description:metadata?scoreCredit(metadata):'',description2:'',showDescription:true,showDescription2:true,pageNumbers:true}));
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
 const change=patch=>setSettings(old=>({...old,...patch}));
 return <PrintWorkspace mobile={mobile} root={root} {...settings} positioningEnabled={false} onChange={change} pageCount={count} ready={ready} previewError={error} contentKey={settings}>
  {()=> <div ref={paper} className="score-print-pages"/>}
 </PrintWorkspace>;
}
