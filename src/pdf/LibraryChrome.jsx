import {Menu,Music,Search,ArrowDownWideNarrow,ChevronDown,ChevronRight,HardDrive} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';

export function LibraryHeader({onMenu,onExit}){
 return <header className="libraryHeader"><button type="button" aria-label="FRETIVA LAB 홈으로" onClick={onExit}><Music size={26}/><strong>FRETIVA LAB</strong></button><button type="button" aria-label="전체 메뉴" onClick={onMenu}><Menu size={22}/><span>메뉴</span></button></header>;
}
const sorts=[['practice','최근순','최근 연습'],['added','추가순','최근 추가'],['title','제목순','제목순'],['bpm','BPM순','BPM순']];
function SearchField({search,onSearch}){return <label className="librarySearch"><Search size={20}/><input aria-label="악보 검색" placeholder="제목, 아티스트 검색" value={search} onChange={e=>onSearch(e.target.value)}/></label>;}
function SortField({sort,onSort}){const current=sorts.find(s=>s[0]===sort)??sorts[0];return <div className="librarySort" title={`정렬: ${current[2]}`}><ArrowDownWideNarrow size={20}/><span>{current[1]}</span><ChevronDown size={16}/><select aria-label={`악보 정렬: ${current[2]}`} value={sort} onChange={e=>onSort(e.target.value)}>{sorts.map(([key,,label])=><option key={key} value={key}>{label}</option>)}</select></div>;}
function Filters({filter,onFilter}){return <nav className="libraryFilters" aria-label="악보 목록 필터">{[['all','전체'],['recent','최근 연습'],['favorites','즐겨찾기']].map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>onFilter(key)}>{label}</button>)}</nav>;}
export function MobileLibraryTools(props){return <div className="libraryTools libraryTools--mobile"><SearchField {...props}/><Filters {...props}/><SortField {...props}/></div>;}
export function DesktopLibraryTools(props){return <div className="libraryTools libraryTools--desktop"><SearchField {...props}/><SortField {...props}/><Filters {...props}/></div>;}
export function LibraryStorage({children,mobile}){
 const [open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{if(open)ref.current.showModal();},[open]);
 const heading=<><HardDrive size={27}/><span><strong>기기 저장 · 백업</strong><small>이 기기에 저장된 악보 관리</small></span><ChevronRight size={20}/></>;
 if(!mobile)return <details className="libraryStorageCard"><summary>{heading}</summary><div>{children}</div></details>;
 return <><button type="button" className="libraryStorageCard" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{heading}</button>{open&&<dialog ref={ref} className="pdfDialog" aria-label="기기 저장 및 백업" onCancel={()=>setOpen(false)}><header className="libraryStorageHeading"><h2>기기 저장 · 백업</h2><button type="button" onClick={()=>setOpen(false)}>닫기</button></header>{children}</dialog>}</>;
}
