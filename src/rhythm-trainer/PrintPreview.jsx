import {timeSignature,tempoMark} from './meter.js';
import React,{useMemo,useRef,useState} from 'react';
import RhythmScore from './RhythmScore.jsx';
import PrintWorkspace from '../printing/PrintWorkspace.jsx';
import usePrintPageDrag from '../printing/usePrintPageDrag.js';
import printBrand from '../etudes/assets/fretiva-lab-logo-print.png';
import printQr from '../etudes/score-source-qr.png';
import {layoutPrintPacks,movePrintPack,printPackBounds,printHeaderHeight,printRowHeight,PRINT_TOP,PRINT_BOTTOM,PRINT_SPAN} from './printLayout.js';
import {useLanguage} from '../i18n/react.jsx';

export default function PrintPreview({pattern,stemDirection,mobile=false}) {
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en,root=useRef();
 const [patterns,setPatterns]=useState(()=>(Array.isArray(pattern)?pattern:[pattern]).map((p,index)=>({...p,printKey:index,printColumns:2,printMeta:`${timeSignature(p)} · ${tempoMark(p)} BPM · ${p.measures.length} ${t('마디','bars')}`,printMeta2:'',showMeta:true})));
 const [pageNumbers,setPageNumbers]=useState(true),[selected,setSelected]=useState(0);
 const [positions,setPositions]=useState({}),[requestedPage,setRequestedPage]=useState(null);
 const layout=useMemo(()=>layoutPrintPacks(patterns,positions),[patterns,positions]);
 const {packs,sections,pageCount}=layout,current=packs[selected],first=current.sections[0],selectedPack=current.pattern,bounds=printPackBounds(layout,current.key);
 const contentKey=useMemo(()=>({patterns,positions,pageNumbers}),[patterns,positions,pageNumbers]);
 const move=(key,start)=>{const result=movePrintPack(layout,key,start);if(Math.abs(result.pack.start-layout.packs.find(pack=>pack.key===key).start)>.00001)setPositions(result.positions);return result;};
 const drag=usePrintPageDrag({root,packs,sections,onMove:move,onSelect:section=>setSelected(section.pattern.printKey),onPage:index=>setRequestedPage({index})});
 const update=(index,patch)=>setPatterns(old=>old.map((p,i)=>i===index?{...p,...patch}:p));
 const change=patch=>{
  const next={};if('title' in patch)next.title=patch.title;if('description' in patch)next.printMeta=patch.description;if('description2' in patch)next.printMeta2=patch.description2;if('showDescription' in patch)next.showMeta=patch.showDescription;
  if(Object.keys(next).length)update(selected,next);
  if('spacing' in patch)move(current.key,first.page*PRINT_SPAN+patch.spacing-PRINT_TOP);
  if('pageNumbers' in patch)setPageNumbers(patch.pageNumbers);
 };
 const topMin=Math.max(PRINT_TOP,PRINT_TOP+bounds.min-first.page*PRINT_SPAN);
 const topMax=Math.max(topMin,Math.min(PRINT_BOTTOM-printHeaderHeight(selectedPack)-printRowHeight(selectedPack)+12,PRINT_TOP+bounds.max-first.page*PRINT_SPAN));
 return <PrintWorkspace mobile={mobile} root={root} title={selectedPack.title} description={selectedPack.printMeta} description2={selectedPack.printMeta2} showDescription={selectedPack.showMeta} pageNumbers={pageNumbers}
  spacing={first.top} spacingMin={topMin} spacingMax={topMax} spacingLabel={t('세로 위치','Vertical position')} onChange={change} pageCount={pageCount} contentKey={contentKey} requestedPage={requestedPage} interactionActive={drag.active}
  positioningHint={t('악보를 위아래로 끄세요. 넘친 마디 줄은 다음 페이지로 이어지며, 다른 팩에 닿으면 멈춥니다.','Drag the score vertically. Overflowing rows continue on the next page; movement stops at other packs.')}
  controls={busy=><label>{t('선택한 팩 · 한 줄 보기','Selected pack · Bars per row')} <select value={selectedPack.printColumns} disabled={busy} onChange={e=>update(selected,{printColumns:Number(e.target.value)})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {t('마디','bars')}</option>)}</select></label>}
  selector={busy=><label>{t('편집할 팩','Pack to edit')} <select value={selected} disabled={busy} onChange={e=>setSelected(Number(e.target.value))}>{patterns.map((p,i)=><option key={i} value={i}>{i+1}. {p.title}</option>)}</select></label>}
  positionControls={busy=><><label>{t('배치할 페이지','Place on page')} <select value={first.page} disabled={busy} onChange={e=>{const result=move(current.key,Number(e.target.value)*PRINT_SPAN+first.top-PRINT_TOP);setRequestedPage({index:result.pack.sections[0].page});}}>{Array.from({length:pageCount+1},(_,i)=><option key={i} value={i}>{i===pageCount?t(`새 페이지 (${i+1})`,`New page (${i+1})`):t(`${i+1}페이지`,`Page ${i+1}`)}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>{setPositions({});setRequestedPage({index:0});}}>{t('자동 배치로 되돌리기','Restore automatic layout')}</button><p>{t('팩 순서와 크기는 고정됩니다. 아래 팩과 닿으면 멈추므로, 공간이 필요할 때는 아래 팩부터 옮겨 주세요. 로고·QR 영역은 항상 고정됩니다.','Pack order and size stay fixed. Move lower packs first to make space. The logo and QR area always stays fixed.')}</p></>}
 >{({zoom,positioning,busy})=><div className="rt-print-pages" {...drag.handlers({enabled:!busy&&(!mobile||positioning),zoom})}>
  {Array.from({length:Math.max(pageCount,drag.previewPages)},(_,i)=><div className={`rt-print-frame${i>=pageCount?' rt-print-frame--draft':''}`} data-html2canvas-ignore={i>=pageCount?'true':undefined} data-print-frame="" data-page-index={i} key={i} style={{width:794*zoom,height:1123*zoom}}>
   {i>=pageCount?<div className="rt-print-next-page">{t(`${i+1}페이지로 이어집니다`,`Continue onto page ${i+1}`)}</div>:<article className="rt-print-page" data-print-page="" data-page-index={i}>
    <div className="print-page-branding"><img className="rt-print-brand" src={printBrand} alt="FRETIVA LAB" draggable={false}/><img className="rt-print-qr" src={printQr} alt="QR" draggable={false}/></div>
    {sections.filter(section=>section.page===i).map(section=>{const {pattern:pack,offset,measures,columns}=section;return <section className="rt-print-section rt-print-section--free" data-print-section={section.id} key={section.id} style={{top:section.top,left:section.left,width:704,height:section.height,'--print-heading-height':`${printHeaderHeight(pack)}px`}} data-selected={current.key===pack.printKey} onClick={()=>!busy&&setSelected(pack.printKey)}>
     <header className="rt-print-drag"><h1 className="rt-print-title">{pack.title}</h1>{pack.showMeta&&<div className="print-description-row"><p className="rt-print-description print-description-left">{pack.printMeta}</p><p className="rt-print-description print-description-right">{pack.printMeta2}</p></div>}</header>
     <div className="rt-print-music" data-columns={columns} style={{'--print-columns':columns}}><RhythmScore connected={columns>1} measures={measures} meter={pack.meter} measureOffset={offset} previousMeasure={pack.measures[offset-1]} measureRepeats={pack.measureRepeats} stemDirection={stemDirection}/></div>
    </section>;})}
    <footer><span className="rt-print-site-address">https://guitarflow.vercel.app/</span>{pageNumbers&&<span className="rt-print-page-number">{i+1} / {pageCount}</span>}</footer>
   </article>}
  </div>)}
 </div>}</PrintWorkspace>;
}
