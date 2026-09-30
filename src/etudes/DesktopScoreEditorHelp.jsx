import {useEffect,useRef,useState} from 'react';
import {BookOpen,Search,X} from 'lucide-react';
import {useLanguage} from '../i18n/react.jsx';
import {editorHelpLabels,scoreEditorHelpContent} from './scoreEditorHelpContent.js';
import './desktopScoreEditorHelp.css';

export default function DesktopScoreEditorHelp({instrument,onClose}){
 const language=useLanguage(),labels=editorHelpLabels[language]??editorHelpLabels.ko;
 const dialog=useRef(null),article=useRef(null),[query,setQuery]=useState(''),[selected,setSelected]=useState('start');
 const topics=scoreEditorHelpContent(language,instrument),words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const matches=topics.filter(topic=>words.every(word=>JSON.stringify(topic).toLocaleLowerCase().includes(word)));
 const current=matches.find(topic=>topic.id===selected)??matches[0];
 useEffect(()=>{const node=dialog.current,previous=document.activeElement;node.showModal();return()=>{node.close();previous?.focus({preventScroll:true});};},[]);
 useEffect(()=>{article.current?.scrollTo({top:0});},[current?.id,query]);
 return <dialog ref={dialog} className="desktopScoreEditorHelp" aria-labelledby="score-editor-help-title" onKeyDown={e=>{e.stopPropagation();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s')e.preventDefault();}} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <header className="scoreHelpHeader"><div><h2 id="score-editor-help-title"><BookOpen size={23} aria-hidden="true"/>{labels.title}</h2><p>{labels.subtitle}</p></div><button type="button" aria-label={labels.close} onClick={onClose}><X size={21}/></button></header>
  <div className="scoreHelpLayout"><aside className="scoreHelpNavigation">
   <label className="scoreHelpSearch"><Search size={17} aria-hidden="true"/><input autoFocus type="search" aria-label={labels.search} placeholder={labels.placeholder} value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <p className="scoreHelpCount" role="status">{matches.length}{language==='en'&&matches.length===1?' topic':labels.count}</p>
   <nav aria-label={labels.topics}>{matches.map(topic=><button type="button" key={topic.id} aria-current={current?.id===topic.id?'page':undefined} onClick={()=>setSelected(topic.id)}>{topic.title}</button>)}</nav>
  </aside>
  <div ref={article} className="scoreHelpArticle" tabIndex={0} aria-label={current?.title??labels.empty}>
   {current?<article><h3>{current.title}</h3><p className="scoreHelpIntro">{current.intro}</p>{current.blocks.map((block,index)=><section key={`${current.id}-${index}`}><h4>{block.title}</h4>{block.body&&<p>{block.body}</p>}{block.steps&&<ol>{block.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>}{block.sequence&&<div className="scoreHelpSequence" aria-label={labels.example}>{block.sequence.map((part,i)=><span key={i}>{part}</span>)}</div>}{block.rows&&<dl className="scoreHelpDefinitions">{block.rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{block.keys&&<dl className="scoreHelpKeys">{block.keys.map(([keys,meaning])=><div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{meaning}</dd></div>)}</dl>}{block.tip&&<aside className="scoreHelpTip"><strong>{labels.tip}</strong><p>{block.tip}</p></aside>}</section>)}</article>:<div className="scoreHelpEmpty"><Search size={30} aria-hidden="true"/><p>{labels.empty}</p><button type="button" onClick={()=>setQuery('')}>{labels.clear}</button></div>}
  </div></div>
 </dialog>;
}
