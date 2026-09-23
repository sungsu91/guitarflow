import {useEffect,useRef,useState} from 'react';
import {ChevronDown,FolderOpen,Check,Star,X,Search} from 'lucide-react';
import './etudePicker.css';

export default function EtudePicker({model,mobile}) {
 const [tab,setTab]=useState(null),[query,setQuery]=useState(''),[category,setCategory]=useState('전체'),[picked,setPicked]=useState(null);
 const dialog=useRef(null),opener=useRef(null);
 const types=[...new Set(model.list.map(e=>e.type))];
 const entries=[...model.list.map(e=>({key:`score:etude:${e.id}`,id:e.id,title:e.english??e.title,type:e.type,saved:false})),...model.savedScores.map(r=>({key:`score:${r.document.id}`,id:r.document.id,title:r.document.title,type:'내 저장 악보',saved:true}))];
 const current=entries.find(e=>e.saved?e.id===model.savedId:!model.savedId&&e.id===model.selected.id);
 const open=(next,event)=>{opener.current=event.currentTarget;setQuery('');setCategory('전체');setPicked(next==='saved'&&!current?.saved?null:current?.key??null);setTab(next);};
 const close=()=>{setTab(null);opener.current?.focus({preventScroll:true});};
 useEffect(()=>{if(tab&&!dialog.current.open)dialog.current.showModal();},[tab]);
 const visible=entries.filter(e=>(tab==='saved'?e.saved:!e.saved)&&(category==='전체'||(category==='즐겨찾기'?model.favorites[e.key]:e.type===category))&&`${e.title} ${e.type}`.toLowerCase().includes(query.trim().toLowerCase()));
 const chosen=entries.find(e=>e.key===picked);
 return <><div className="etudeQuickSelects">{[['types','연습 유형',model.savedId?'앱 연습 유형':model.selected.type],['saved','내 저장 악보',model.savedId?current?.title:'악보 선택']].map(([key,label,value])=><div className="etudeSelect" key={key}><span>{label}</span><button type="button" className="etudePickerTrigger" aria-label={label} aria-haspopup="dialog" onClick={e=>open(key,e)}><span>{value}</span><FolderOpen size={18} aria-hidden="true"/></button></div>)}</div>
 {tab&&<dialog ref={dialog} className={`etudePickerDialog ${mobile?'is-mobile':'is-desktop'}`} aria-label="악보 선택" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
 <header><h2>악보 선택</h2><button type="button" aria-label="악보 선택 닫기" onClick={close}><X size={22}/></button></header>
 <nav className="etudePickerTabs" aria-label="악보 목록">{[['types','연습 유형'],['saved','내 저장 악보']].map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>{setTab(key);setCategory('전체');setPicked(null);}}>{label}</button>)}</nav>
 <label className="etudePickerSearch"><Search size={16}/><input autoFocus type="search" aria-label="악보 검색" placeholder="악보 검색" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {<nav className="etudePickerCategories" aria-label="악보 필터">{['전체','즐겨찾기',...(tab==='types'?types:[])].map(type=><button type="button" key={type} aria-pressed={category===type} onClick={()=>{setCategory(type);setPicked(null);}}>{type}</button>)}</nav>}
 <div className="etudePickerResults"><div className="etudePickerGrid">{visible.map(e=><button key={e.key} type="button" className="etudePickerCard" aria-pressed={picked===e.key} onClick={()=>setPicked(e.key)}><span><small>{e.type}</small><strong>{e.title}</strong></span>{picked===e.key?<Check size={16}/>:model.favorites[e.key]?<Star size={15} fill="currentColor"/>:<ChevronDown size={15}/>}</button>)}</div>{!visible.length&&<p className="etudePickerEmpty">{query?'검색 결과가 없습니다.':category==='즐겨찾기'?'악보 오른쪽 별을 눌러 즐겨찾기에 추가하세요.':'저장된 악보가 없습니다.'}</p>}</div>
 <footer><span>{chosen?.title??'악보를 선택해 주세요'}</span><button type="button" disabled={!chosen} onClick={()=>{chosen.saved?model.selectSaved(chosen.id):model.select(chosen.id);close();}}>불러오기</button></footer>
 </dialog>}</>;
}

