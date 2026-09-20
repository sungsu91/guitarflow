import {staffStepForPitch} from './scoreInstruments.js';
import {drawScore,scoreSpacing} from './Score.jsx';
import {compileScoreDocument} from './scoreDocument.js';
import brand from './assets/fretiva-lab-logo-print.png';
import sourceFrameCss from './scoreSourceFrame.css?raw';
import qr from './score-source-qr.png';
import {SCORE_SOURCE_HANDLE} from './scoreSource.js';
import {scoreCredit} from './scoreMetadata.js';

// Preview and print use the same A4 sheets; screen scaling never edits notation.
export function printEditorScore(container,title,view='both',metadata) {
 const measures=[...container.querySelectorAll('[data-draw-count]')].map(host=>({svg:host.shadowRoot?.querySelector('svg'),measure:host.closest('[data-layout-row]')})).filter(item=>item.svg);
 if(!measures.length)throw Error('먼저 표시 가능한 악보를 준비하세요.');
 const win=window.open('','_blank','width=1000,height=800');if(!win)throw Error('인쇄 미리보기 창을 허용한 후 다시 시도하세요.');
 const doc=win.document;doc.title=`${title} · A4 인쇄 미리보기`;doc.documentElement.lang='ko';
 const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';doc.head.append(viewport);
 const style=doc.createElement('style');
 style.textContent=`
 ${sourceFrameCss}
 @page{size:A4 portrait;margin:0}
 *{box-sizing:border-box}body{margin:0;color:#111;background:#e8e5e1;font-family:Arial,sans-serif}
 .previewToolbar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:12px;background:#faf8f5;border-bottom:1px solid #d7d0c7}
 .previewToolbar strong{font-size:15px}.previewToolbar p{flex-basis:100%;text-align:center;font-size:12px;margin:0;color:#625b54}
 button{font:inherit;min-height:40px;padding:8px 12px;border:1px solid #cec4b9;border-radius:8px;background:white;color:#493a2f;cursor:pointer}
 main{padding:16px 0}.sheetFrame{position:relative;margin:0 auto 16px}
 .a4Sheet{position:relative;width:210mm;height:297mm;padding:12mm;background:white;transform-origin:top left;box-shadow:0 2px 12px #0002}
 .scoreHeading{display:grid;grid-template-columns:92px minmax(0,1fr) 92px;grid-template-rows:auto auto;column-gap:12px;align-items:center;margin-bottom:10px}.scoreBrand{grid-column:1;grid-row:1/3;align-self:center}.scoreBrand img{display:block;width:23mm;height:23mm;object-fit:contain}.scoreSource{grid-column:3;grid-row:1/3;font:10px Arial,sans-serif;text-align:right;color:#666}.scoreHeading h1{grid-column:2;grid-row:1}.scoreHeading .scoreCredit{grid-column:2;grid-row:2;margin-bottom:0}
 h1{font:22px Georgia,serif;text-align:center;margin:0 0 10px;overflow-wrap:anywhere}.scoreCredit{text-align:center;font-size:13px;margin:0 0 20px;overflow-wrap:anywhere}
 section{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0;break-inside:avoid}section>div{min-width:0}
 svg{width:100%;height:auto;display:block}svg text{fill:#000}svg .vf-tabnote text{font-weight:600!important}.etudeMeasureNumber{font:700 13px Arial}.pageNumber{position:absolute;bottom:5mm;left:0;width:100%;text-align:center;font-size:10px;color:#777}
 @media print{body{background:white}.previewToolbar{display:none}main{padding:0}.sheetFrame{width:210mm!important;height:297mm!important;margin:0;break-after:page}.sheetFrame:last-child{break-after:auto}.a4Sheet{transform:none!important;box-shadow:none}}
 ${view==='staff'?'.vf-fretiva-tab-view,.fretiva-tab-view,.vf-fretiva-both-view{display:none}':view==='tab'?'.vf-fretiva-staff-view,.vf-fretiva-both-view{display:none}':''}`;
 doc.head.append(style);
 const toolbar=doc.createElement('header');toolbar.className='previewToolbar';
 const label=doc.createElement('strong');label.textContent='A4 인쇄 미리보기';
 const print=doc.createElement('button');print.textContent='인쇄 · PDF로 저장';print.disabled=true;print.onclick=()=>win.print();
 const close=doc.createElement('button');close.textContent='닫기';close.onclick=()=>win.close();
 const hint=doc.createElement('p');hint.textContent='A4 세로 · 여백 12mm · 페이지당 최대 5줄 · 현재 마디 배치와 보표 표시를 사용합니다.';
 toolbar.append(label,print,close,hint);doc.body.append(toolbar);
 const main=doc.createElement('main');doc.body.append(main);
 const sheets=[];
 const newSheet=()=>{const frame=doc.createElement('div'),paper=doc.createElement('article');frame.className='sheetFrame';paper.className='a4Sheet';frame.append(paper);main.append(frame);const source=doc.createElement('div');source.className='scoreSource';const image=doc.createElement('img');image.src=new URL(qr,window.location.href).href;image.alt='FRETIVA LAB 앱 접속 QR 코드';image.className='scoreSourceQr';image.style.cssText='width:20mm;height:20mm';const qrFrame=doc.createElement('div');qrFrame.className='scoreSourceFrame';const handle=doc.createElement('div');handle.className='scoreSourceHandle';handle.textContent=SCORE_SOURCE_HANDLE;qrFrame.append(image,handle);source.append(qrFrame);const header=doc.createElement('header');header.className='scoreHeading';const logo=doc.createElement('div');logo.className='scoreBrand';const logoImage=doc.createElement('img');logoImage.src=new URL(brand,window.location.href).href;logoImage.alt='FRETIVA LAB';logo.append(logoImage);header.append(logo,source);paper.append(header);sheets.push(paper);return paper;};
 let sheet=newSheet();
 const heading=doc.createElement('h1');heading.textContent=title;sheet.querySelector('.scoreHeading').append(heading);
 if(metadata){const credit=doc.createElement('p');credit.className='scoreCredit';credit.textContent=scoreCredit(metadata);sheet.querySelector('.scoreHeading').append(credit);}
 let row=null,section;const sections=[];
 for(const {svg,measure} of measures){
  const nextRow=measure?.dataset.layoutRow;
  if(!section||row!==nextRow){section=doc.createElement('section');sections.push(section);sheet.append(section);row=nextRow;}
  const cell=doc.createElement('div');cell.style.gridColumn=measure?.style.gridColumn??'1 / -1';cell.style.gridRow='1';cell.style.width=measure?.style.width??'';cell.style.marginLeft=measure?.style.marginLeft??'';
  const drawing=doc.importNode(svg,true);
  drawing.querySelectorAll('.etudeEditorHit,.etudeInputCursor,.etudePlayingSlot,.etudePlayingRow,.etudeBeamRangeSelection').forEach(node=>node.remove());cell.append(drawing);section.append(cell);
 }
 // Re-engrave for paper width: smaller symbols with longer staves, not a
 // narrow scaled copy of the mobile editor.
 const compiled=metadata?compileScoreDocument(metadata,undefined,{allowIncomplete:true}).score:null;
 const placements=measures.map((item,i)=>({row:Number(item.measure?.dataset.layoutRow)||i+1,column:i===0||item.measure?.dataset.layoutRow!==measures[i-1].measure?.dataset.layoutRow?1:2}));
 const renderForPrint=virtualWidth=>{
  if(!compiled)return;
  const spacing=scoreSpacing(compiled,{placements,view,width:virtualWidth});
  const systemFootroom=Math.max(0,...compiled.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>(-7-staffStepForPitch(n.pitch,compiled.instrument))*5));
  let cellIndex=0;
  for(const section of sections){for(const cell of section.children){
   const i=cellIndex++,geometry=spacing.measures[i],m=metadata.measures[i];
   const first=placements[i].column===1,last=!placements[i+1]||placements[i+1].row!==placements[i].row;
   const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden';document.body.append(host);
   try{
   drawScore(host,{...compiled,document:undefined,measures:[compiled.measures[i]],repeatMarks:[m],chordShapes:compiled.chordShapes?.[i]?[compiled.chordShapes[i]]:undefined,harmony:[compiled.harmony?.[i]],navigationPrevious:metadata.measures[i-1],navigationNext:metadata.measures[i+1]},
    {editor:true,barOffset:i,view,systemFootroom,editorWidth:geometry.cellWidth,engraving:geometry,systemStart:first,systemEnd:last,scoreEnd:i===measures.length-1,tabRhythm:metadata.viewSettings?.tabRhythm!==false,tabBeamPosition:metadata.viewSettings?.tabBeamPosition,tabPickingPosition:metadata.viewSettings?.tabPickingPosition});
   const svg=host.querySelector('svg');svg.querySelectorAll('.etudeEditorHit,.etudeInputCursor').forEach(el=>el.remove());
   cell.replaceChildren(doc.importNode(svg,true));cell.style.width=`${geometry.cellWidth/geometry.rowWidth*100}%`;cell.style.marginLeft=`${geometry.cellX/geometry.rowWidth*100}%`;
   }finally{host.remove();}
  }}
 };
 const fit=()=>{const scale=Math.min(1,Math.max(1,doc.documentElement.clientWidth-24)/sheets[0].offsetWidth);for(const paper of sheets){paper.style.transform=`scale(${scale})`;paper.parentElement.style.width=`${paper.offsetWidth*scale}px`;paper.parentElement.style.height=`${paper.offsetHeight*scale}px`;}};
 const paginate=()=>{
  if(win.closed)return;
  // Reserve five systems per A4 page and preserve each SVG's aspect ratio.
  const rowsPerPage=5,gap=8;
  const firstTop=sections[0]?.offsetTop??sheet.querySelector('.scoreHeading').offsetHeight;
  const limit=sheet.clientHeight-parseFloat(win.getComputedStyle(sheet).paddingBottom);
  const rowHeight=Math.max(1,(limit-firstTop-gap*(rowsPerPage-1))/rowsPerPage);
  let virtualWidth=view==='both'?1600:1200;renderForPrint(virtualWidth);
  let tallest=Math.max(1,...sections.map(section=>section.getBoundingClientRect().height));
  if(compiled&&tallest>rowHeight){virtualWidth*=tallest/rowHeight*1.01;renderForPrint(virtualWidth);tallest=Math.max(1,...sections.map(section=>section.getBoundingClientRect().height));}
  const scale=Math.min(1,rowHeight/tallest);
  sections.forEach(section=>section.remove());
  sections.forEach((section,index)=>{
   if(index>0&&index%rowsPerPage===0)sheet=newSheet();
   section.style.width=`${scale*100}%`;
   section.style.marginLeft='auto';section.style.marginRight='auto';
   section.style.marginBottom=`${gap}px`;
   sheet.append(section);
  });
  sheets.forEach((paper,i)=>{const number=doc.createElement('footer');number.className='pageNumber';number.textContent=`${i+1} / ${sheets.length}`;paper.append(number);});
  label.textContent=`A4 인쇄 미리보기 · ${sheets.length}쪽`;fit();print.disabled=false;doc.body.dataset.previewReady='true';
 };
 doc.fonts.ready.then(()=>win.requestAnimationFrame(paginate));win.addEventListener('resize',fit);win.focus();
}
