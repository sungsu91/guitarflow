import {useEffect,useRef,useState} from 'react';
import {Menu,Search,ChevronDown,ChevronRight,Cloud,Music} from 'lucide-react';
import './mobileLibraryChrome.css';

export function MobileLibraryHeader({onMenu,onExit}){
 return <header className="mobileLibraryHud"><button type="button" className="mobileLibraryBrand" aria-label="FRETIVA LAB 홈으로" onClick={onExit}><Music size={27} strokeWidth={2.4} aria-hidden="true"/><strong>FRETIVA LAB</strong></button><button type="button" onClick={onMenu} aria-label="전체 메뉴"><Menu size={27} strokeWidth={2.2}/><span>메뉴</span></button></header>;
}
const sorts=[['practice','최근 연습'],['added','최근 추가'],['title','제목순'],['bpm','BPM순']];
export function MobileLibrarySearch({search,onSearch,sort,onSort}){
 const [open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 return <div className="mobileLibrarySearch" ref={root}>
  <label><Search size={23} strokeWidth={1.8}/><input aria-label="악보 검색" placeholder="제목, 아티스트 검색" value={search} onChange={e=>onSearch(e.target.value)}/></label>
  <button ref={trigger} type="button" aria-label="악보 정렬" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{sorts.find(s=>s[0]===sort)?.[1]}<ChevronDown size={16}/></button>
  {open&&<div className="mobileLibrarySortMenu" role="group" aria-label="악보 정렬 선택" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current.focus();}}}>{sorts.map(([value,label])=><button type="button" key={value} aria-pressed={sort===value} onClick={()=>{onSort(value);setOpen(false);trigger.current.focus();}}>{label}</button>)}</div>}
 </div>;
}
export function MobileLibraryStorage({children}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="mobileLibraryStorage" onClick={()=>setOpen(true)}><Cloud size={26} strokeWidth={1.8}/><span>기기 저장 · 백업</span><ChevronRight size={20} strokeWidth={1.8}/></button>{open&&<StorageSheet onClose={()=>setOpen(false)}>{children}</StorageSheet>}</>;
}
function StorageSheet({children,onClose}){
 const ref=useRef(null);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} className="pdfDialog mobileLibraryStorageDialog" aria-label="기기 저장 및 백업" onCancel={onClose}><header><h2>기기 저장 · 백업</h2><button type="button" onClick={onClose}>닫기 ×</button></header><div>{children}</div></dialog>;
}
