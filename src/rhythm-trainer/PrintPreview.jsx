import {timeSignature,tempoMark} from './meter.js';
import React,{useMemo,useRef,useState} from 'react';
import RhythmScore from './RhythmScore.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import printBrand from '../etudes/assets/fretiva-lab-logo-print.png';
import printQr from '../etudes/score-source-qr.png';
import {paginatePrintPacks,placePrintSections,positionPrintSection,printPositionBounds,printHeaderHeight} from './printLayout.js';
import {useLanguage} from '../i18n/react.jsx';

export default function PrintPreview({pattern,stemDirection,mobile=false}) {
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en,root=useRef(),drag=useRef(null);
 const [patterns,setPatterns]=useState(()=>(Array.isArray(pattern)?pattern:[pattern]).map((p,index)=>({...p,printKey:index,printColumns:2,printMeta:`${timeSignature(p)} · ${tempoMark(p)} BPM · ${p.measures.length} ${t('마디','bars')}`,printMeta2:'',showMeta:true})));
 const [pageNumbers,setPageNumbers]=useState(true),[selected,setSelected]=useState(0),[selectedOffset,setSelectedOffset]=useState(0);
 const [positions,setPositions]=useState({}),[requestedPage,setRequestedPage]=useState(null);
 const automatic=useMemo(()=>paginatePrintPacks(patterns,2),[patterns]);
 const sections=useMemo(()=>placePrintSections(automatic,positions),[automatic,positions]);
 const contentKey=useMemo(()=>({patterns,positions,pageNumbers}),[patterns,positions,pageNumbers]);
 const selectedPack=patterns[selected],packSections=sections.filter(section=>section.pattern.printKey===selected);
 const current=packSections.find(section=>section.offset===selectedOffset)||packSections[0],bounds=printPositionBounds(current);
 const pageCount=Math.max(...sections.map(section=>section.page))+1;
 const update=(index,patch)=>setPatterns(old=>old.map((p,i)=>i===index?{...p,...patch}:p));
 const move=(section,patch)=>setPositions(old=>{const next=positionPrintSection(section,{...(old[section.id]||section),...patch});return {...old,[section.id]:{page:next.page,top:next.top,left:next.left}};});
 const selectSection=section=>{setSelected(section.pattern.printKey);setSelectedOffset(section.offset);};
 const change=patch=>{
  const next={};if('title' in patch)next.title=patch.title;if('description' in patch)next.printMeta=patch.description;if('description2' in patch)next.printMeta2=patch.description2;if('showDescription' in patch)next.showMeta=patch.showDescription;
  if(Object.keys(next).length)update(selected,next);
  if('spacing' in patch)move(current,{top:patch.spacing});if('pageNumbers' in patch)setPageNumbers(patch.pageNumbers);
 };
 const columns=value=>{update(selected,{printColumns:value});setSelectedOffset(0);setPositions(old=>Object.fromEntries(Object.entries(old).filter(([id])=>!id.startsWith(`${selected}:`))));};
 return <PrintWorkspace mobile={mobile} root={root} title={selectedPack.title} description={selectedPack.printMeta} description2={selectedPack.printMeta2} showDescription={selectedPack.showMeta} pageNumbers={pageNumbers}
  spacing={current.top} spacingMin={bounds.minTop} spacingMax={Math.floor(bounds.maxTop)} spacingLabel={t('세로 위치','Vertical position')} onChange={change} pageCount={pageCount} contentKey={contentKey} requestedPage={requestedPage}
  controls={busy=><label>{t('선택한 팩 · 한 줄 보기','Selected pack · Bars per row')} <select value={selectedPack.printColumns} disabled={busy} onChange={e=>columns(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {t('마디','bars')}</option>)}</select></label>}
  selector={busy=><><label>{t('편집할 팩','Pack to edit')} <select value={selected} disabled={busy} onChange={e=>{setSelected(Number(e.target.value));setSelectedOffset(0);}}>{patterns.map((p,i)=><option key={i} value={i}>{i+1}. {p.title}</option>)}</select></label>{packSections.length>1&&<label>{t('편집할 구간','Section to position')} <select value={current.offset} disabled={busy} onChange={e=>setSelectedOffset(Number(e.target.value))}>{packSections.map(section=><option key={section.id} value={section.offset}>{section.offset+1}–{section.offset+section.measures.length} {t('마디','bars')}</option>)}</select></label>}</>}
  positionControls={busy=><><label>{t('가로 위치','Horizontal position')} <input type="range" aria-label={t('가로 위치','Horizontal position')} aria-valuetext={`${Math.round(current.left*25.4/96)} mm`} min={bounds.minLeft} max={bounds.maxLeft} value={current.left} disabled={busy} onChange={e=>move(current,{left:Number(e.target.value)})}/><span>{Math.round(current.left*25.4/96)} mm</span></label><label>{t('배치할 페이지','Place on page')} <select value={current.page} disabled={busy} onChange={e=>{const page=Number(e.target.value);move(current,{page});setRequestedPage({index:page});}}>{Array.from({length:pageCount+1},(_,i)=><option key={i} value={i}>{i===pageCount?t(`새 페이지 (${i+1})`,`New page (${i+1})`):t(`${i+1}페이지`,`Page ${i+1}`)}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>{setPositions({});setRequestedPage({index:0});}}>{t('자동 배치로 되돌리기','Restore automatic layout')}</button><p>{t('다른 팩과 독립적으로 종이 안에서 이동합니다. 페이지도 직접 선택할 수 있습니다.','Move independently of other packs within the paper. You can also choose a destination page.')}</p></>}
 >{({zoom,positioning,busy})=><div className="rt-print-pages" onPointerDown={event=>{
   if(busy||(mobile&&!positioning)||event.target.closest('[contenteditable="true"]'))return;
   const element=event.target.closest('[data-print-section]');if(!element)return;
   const section=sections.find(section=>section.id===element.dataset.printSection),page=element.closest('[data-print-page]').getBoundingClientRect();
   event.preventDefault();selectSection(section);drag.current={section,grabX:(event.clientX-page.left)/zoom-section.left,grabY:(event.clientY-page.top)/zoom-section.top,zoom};event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event=>{
   const start=drag.current;if(!start)return;
   const frames=[...root.current.querySelectorAll('[data-print-frame]')];
   const target=frames.find(frame=>{const r=frame.getBoundingClientRect();return event.clientY>=r.top&&event.clientY<=r.bottom;})||frames[start.section.page];
   const rect=target.getBoundingClientRect();move(start.section,{page:Number(target.dataset.pageIndex),top:(event.clientY-rect.top)/start.zoom-start.grabY,left:(event.clientX-rect.left)/start.zoom-start.grabX});
  }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
  {Array.from({length:pageCount},(_,i)=><div className="rt-print-frame" data-print-frame="" data-page-index={i} key={i} style={{width:794*zoom,height:1123*zoom}}><article className="rt-print-page" data-print-page="" data-page-index={i}>
   {sections.filter(section=>section.page===i).map((section,j)=>{const {pattern:pack,offset,measures,columns}=section;return <section className="rt-print-section rt-print-section--free" data-print-section={section.id} key={section.id} style={{top:section.top,left:section.left,width:704,height:section.height,'--print-heading-height':`${printHeaderHeight(pack)}px`}} data-selected={current.id===section.id} onClick={()=>!busy&&selectSection(section)}>
    <header className={`rt-print-drag${j===0?' rt-print-page-heading':''}`}>
     {j===0&&<><img className="rt-print-brand" src={printBrand} alt="FRETIVA LAB" draggable={false}/><img className="rt-print-qr" src={printQr} alt="QR" draggable={false}/></>}
     <h1 className="rt-print-title">{pack.title}</h1>
     {pack.showMeta&&<div className="print-description-row"><p className="rt-print-description print-description-left">{pack.printMeta}</p><p className="rt-print-description print-description-right">{pack.printMeta2}</p></div>}
    </header><div className="rt-print-music" data-columns={columns} style={{'--print-columns':columns}}><RhythmScore connected={columns>1} measures={measures} meter={pack.meter} measureOffset={offset} previousMeasure={pack.measures[offset-1]} measureRepeats={pack.measureRepeats} stemDirection={stemDirection}/></div>
   </section>;})}
   <footer><span className="rt-print-site-address">https://guitarflow.vercel.app/</span>{pageNumbers&&<span className="rt-print-page-number">{i+1} / {pageCount}</span>}</footer>
  </article></div>)}
 </div>}</PrintWorkspace>;
}
