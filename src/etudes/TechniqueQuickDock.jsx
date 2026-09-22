import {useRef,useState} from 'react';
import './techniqueQuick.css';
export function loadQuickTechniques(){try{const list=JSON.parse(localStorage.getItem('fretiva.editor.quickTechniques')||'[]');return Array.isArray(list)?list.filter(x=>Array.isArray(x)&&x.length===3&&x.every(v=>typeof v==='string')).slice(0,24):[];}catch{return [];}}
export function persistQuickTechniques(items){try{localStorage.setItem('fretiva.editor.quickTechniques',JSON.stringify(items));}catch{}}
export default function TechniqueQuickDock({mobile,items,renderButton,onRemove,open,onOpen}){
 const [edge,setEdge]=useState('right'),[position,setPosition]=useState({x:0,y:mobile?300:180}),[editing,setEditing]=useState(false);
 const frame=useRef(null),moved=useRef(false);
 const drag=e=>{if(e.button!==0||e.target.closest('header button'))return;const node=e.currentTarget,box=frame.current.getBoundingClientRect(),start={x:e.clientX,y:e.clientY};moved.current=false;node.setPointerCapture(e.pointerId);
 node.onpointermove=m=>{if(Math.hypot(m.clientX-start.x,m.clientY-start.y)>5)moved.current=true;if(!moved.current)return;setEdge(null);setPosition({x:Math.max(0,Math.min(innerWidth-box.width,box.left+m.clientX-start.x)),y:Math.max(0,Math.min(innerHeight-box.height,box.top+m.clientY-start.y))});};
 const finish=()=>{if(moved.current){const r=frame.current.getBoundingClientRect();const distances={left:r.left,right:innerWidth-r.right,top:r.top,bottom:innerHeight-r.bottom};setEdge(Object.keys(distances).sort((a,b)=>distances[a]-distances[b])[0]);}node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;};node.onpointerup=finish;node.onpointercancel=finish;};
 const style={left:edge==='right'?undefined:edge==='left'?0:Math.min(position.x,innerWidth-(open?(mobile?190:240):36)),right:edge==='right'?0:undefined,top:edge==='bottom'?undefined:edge==='top'?0:Math.min(position.y,innerHeight-(open?180:44)),bottom:edge==='bottom'?0:undefined};
 return <aside ref={frame} className={`techniqueQuickDock ${mobile?'is-mobile':'is-desktop'} ${open?'is-open':'is-folded'}`} style={style} aria-label="주법 퀵창">
 {!open?<button type="button" className="techniqueQuickTab" aria-label="주법 퀵창 열기" onPointerDown={drag} onClick={()=>{if(!moved.current)onOpen(true);}}>❯</button>:<><header onPointerDown={drag}><strong aria-hidden="true">⠿</strong><button type="button" aria-pressed={editing} onClick={()=>setEditing(v=>!v)}>편집</button><button type="button" aria-label="주법 퀵창 접기" onClick={()=>onOpen(false)}>접기</button></header><div className="techniqueQuickGrid">{items.map(args=><div key={args[0]}>{renderButton(...args,true)}{editing&&<button type="button" aria-label={`${args[1]} 퀵에서 제거`} onClick={()=>onRemove(args[0])}>×</button>}</div>)}</div></>}
 </aside>;
}
