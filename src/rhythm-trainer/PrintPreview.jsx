import {timeSignature,tempoMark} from './meter.js';
import React,{useMemo,useRef,useState} from 'react';
import RhythmScore from './RhythmScore.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import usePrintPageDrag from '../printing/usePrintPageDrag.js';
import printBrand from '../etudes/assets/fretiva-lab-logo-print.png';
import printQr from '../etudes/score-source-qr.png';
import {layoutPrintPacks,movePrintPack,printHeaderHeight,printDescriptionVisible} from './printLayout.js';
import {useLanguage} from '../i18n/react.jsx';

export default function PrintPreview({pattern,stemDirection,mobile=false}) {
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en,root=useRef();
 const [patterns,setPatterns]=useState(()=>(Array.isArray(pattern)?pattern:[pattern]).map((p,index)=>({...p,printKey:index,printColumns:2,printMeta:`${timeSignature(p)} · ${tempoMark(p)} BPM · ${p.measures.length} ${t('마디','bars')}`,printMeta2:'',showMeta1:true,showMeta2:true})));
 const [pageNumbers,setPageNumbers]=useState(true),[selected,setSelected]=useState(0);
 const [positions,setPositions]=useState({}),[requestedPage,setRequestedPage]=useState(null);
 const layout=useMemo(()=>layoutPrintPacks(patterns,positions),[patterns,positions]);
 const {packs,sections,pageCount}=layout,current=packs[selected],selectedPack=current.pattern;
 const contentKey=useMemo(()=>({patterns,positions,pageNumbers}),[patterns,positions,pageNumbers]);
 const move=(key,start)=>{const result=movePrintPack(layout,key,start);if(Math.abs(result.pack.start-layout.packs.find(pack=>pack.key===key).start)>.00001)setPositions(result.positions);return result;};
 const drag=usePrintPageDrag({root,packs,sections,onMove:move,onSelect:section=>setSelected(section.pattern.printKey),onPage:index=>setRequestedPage({index})});
 const update=(index,patch)=>setPatterns(old=>old.map((p,i)=>i===index?{...p,...patch}:p));
 const change=patch=>{
  const next={};if('title' in patch)next.title=patch.title;if('description' in patch)next.printMeta=patch.description;if('description2' in patch)next.printMeta2=patch.description2;if('showDescription' in patch)next.showMeta1=patch.showDescription;if('showDescription2' in patch)next.showMeta2=patch.showDescription2;
  if(Object.keys(next).length)update(selected,next);
  if('pageNumbers' in patch)setPageNumbers(patch.pageNumbers);
 };
 const densityControl=busy=><label className="rt-print-density"><span>{mobile?t('한 줄','Per row'):t('선택한 팩 · 한 줄 보기','Selected pack · Bars per row')}</span> <select aria-label={t('선택한 팩 · 한 줄 보기','Selected pack · Bars per row')} value={selectedPack.printColumns} disabled={busy} onChange={e=>update(selected,{printColumns:Number(e.target.value)})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {t('마디','bars')}</option>)}</select></label>;
 return <PrintWorkspace mobile={mobile} root={root} title={selectedPack.title} description={selectedPack.printMeta} description2={selectedPack.printMeta2} showDescription={printDescriptionVisible(selectedPack,1)} showDescription2={printDescriptionVisible(selectedPack,2)} pageNumbers={pageNumbers}
  onChange={change} pageCount={pageCount} contentKey={contentKey} requestedPage={requestedPage} interactionActive={drag.active}
  positioningHint={t('악보를 위아래로 끄세요. 넘친 마디 줄은 다음 페이지로 이어지며, 다른 팩에 닿으면 멈춥니다.','Drag the score vertically. Overflowing rows continue on the next page; movement stops at other packs.')}
  controls={mobile?undefined:densityControl} previewControls={mobile?densityControl:undefined}
  selector={busy=><select aria-label={t('편집할 팩','Pack to edit')} value={selected} disabled={busy} onChange={e=>setSelected(Number(e.target.value))}>{patterns.map((p,i)=><option key={i} value={i}>{i+1}. {p.title}</option>)}</select>}
  positionControls={busy=><button type="button" disabled={busy} onClick={()=>{setPositions({});setRequestedPage({index:0});}}>{t('자동 배치로 되돌리기','Restore automatic layout')}</button>}
 >{({zoom,positioning,busy})=><div className="rt-print-pages" {...drag.handlers({enabled:!busy&&(!mobile||positioning),zoom})}>
  {Array.from({length:Math.max(pageCount,drag.previewPages)},(_,i)=>{const pageSections=sections.filter(section=>section.page===i),pageFirst=pageSections[0];return <div className={`rt-print-frame${i>=pageCount?' rt-print-frame--draft':''}`} data-html2canvas-ignore={i>=pageCount?'true':undefined} data-print-frame="" data-page-index={i} key={i} style={{width:794*zoom,height:1123*zoom}}>
   {i>=pageCount?<div className="rt-print-next-page">{t(`${i+1}페이지로 이어집니다`,`Continue onto page ${i+1}`)}</div>:<article className="rt-print-page" data-print-page="" data-page-index={i}>
    <div className="print-page-branding">{pageFirst&&<div className="rt-print-brand-title" data-print-pack-title={pageFirst.id}><h1 className="rt-print-title">{pageFirst.pattern.title}</h1></div>}<img className="rt-print-brand" src={printBrand} alt="FRETIVA LAB" draggable={false}/><img className="rt-print-qr" src={printQr} alt="QR" draggable={false}/></div>
    {pageSections.map((section,index)=>{const {pattern:pack,offset,measures,columns}=section;return <section className="rt-print-section rt-print-section--free" data-print-section={section.id} key={section.id} style={{top:section.top,left:section.left,width:704,height:section.height,'--print-heading-height':`${printHeaderHeight(pack)}px`}} data-selected={current.key===pack.printKey} onClick={()=>!busy&&setSelected(pack.printKey)}>
     <header className="rt-print-drag">{index>0&&<h1 className="rt-print-title">{pack.title}</h1>}{(printDescriptionVisible(pack,1)||printDescriptionVisible(pack,2))&&<div className="print-description-row">{printDescriptionVisible(pack,1)&&<p className="rt-print-description print-description-left">{pack.printMeta}</p>}{printDescriptionVisible(pack,2)&&<p className="rt-print-description print-description-right">{pack.printMeta2}</p>}</div>}</header>
     <div className="rt-print-music" data-columns={columns} style={{'--print-columns':columns}}><RhythmScore connected={columns>1} measures={measures} meter={pack.meter} measureOffset={offset} previousMeasure={pack.measures[offset-1]} measureRepeats={pack.measureRepeats} stemDirection={stemDirection}/></div>
    </section>;})}
    <footer><span className="rt-print-site-address">https://guitarflow.vercel.app/</span>{pageNumbers&&<span className="rt-print-page-number">{i+1} / {pageCount}</span>}</footer>
   </article>}
  </div>;})}
 </div>}</PrintWorkspace>;
}
