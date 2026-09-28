import {t as translateUi} from '../i18n/core.js';
import {staffStepForPitch} from './scoreInstruments.js';
import {drawScore,scoreSpacing} from './Score.jsx';
import {compileScoreDocument} from './scoreDocument.js';
import brand from './assets/fretiva-lab-logo-print.png';
import qr from './score-source-qr.png';
import {SCORE_SOURCE_HANDLE,SCORE_SOURCE_URL} from './scoreSource.js';
import {measureLayout} from './measureLayout.js';
import {slurSpans} from './slurs.js';
import {measureChordCharts} from './measureChordCharts.js';
import {PRINT_TOP,PRINT_BOTTOM,PRINT_MARGIN} from '../printing/printGeometry.js';

// Engrave once at physical paper width; metadata edits repaginate the fixed score.
export function renderScorePrint(main,container,view,metadata,initial,onPages) {
 const doc=main.ownerDocument,win=doc.defaultView,sheets=[];let settings=initial;
 const measures=[...container.querySelectorAll('[data-draw-count]')].map(host=>({svg:host.shadowRoot?.querySelector('svg'),measure:host.closest('[data-layout-row]')})).filter(item=>item.svg);
 main.replaceChildren();
 const newSheet=()=>{
  const frame=doc.createElement('div'),paper=doc.createElement('article');
  frame.className='rt-print-frame';paper.className='rt-print-page score-print-page';
  frame.setAttribute('data-print-frame','');paper.setAttribute('data-print-page','');
  paper.dataset.notationView=view;paper.dataset.pageIndex=String(sheets.length);frame.dataset.pageIndex=String(sheets.length);
  frame.append(paper);main.append(frame);
  if(!sheets.length){
  const branding=doc.createElement('div');branding.className='print-page-branding';
  const logo=doc.createElement('div');logo.className='scoreBrand';const logoImage=doc.createElement('img');logoImage.src=new URL(brand,window.location.href).href;logoImage.alt='FRETIVA LAB';logo.append(logoImage);
  const source=doc.createElement('div');source.className='scoreSource';
  const image=doc.createElement('img');image.src=new URL(qr,window.location.href).href;image.alt=translateUi('etudes.fretivaLabAppQrCode');image.className='scoreSourceQr';
  const qrFrame=doc.createElement('div');qrFrame.className='scoreSourceFrame';
  const handle=doc.createElement('div');handle.className='scoreSourceHandle';handle.textContent=SCORE_SOURCE_HANDLE;
  qrFrame.append(image,handle);source.append(qrFrame);branding.append(logo,source);paper.append(branding);
  const header=doc.createElement('header');header.className='scoreHeading';paper.append(header);}
  sheets.push(paper);return paper;
 };
 let sheet=newSheet();
 const heading=doc.createElement('h1');heading.textContent=settings.title;sheet.querySelector('.scoreHeading').append(heading);
 const credits=doc.createElement('div');credits.className='print-description-row';
 const credit=doc.createElement('p');credit.className='scoreCredit print-description-left';
 const credit2=doc.createElement('p');credit2.className='print-description-right';credits.append(credit,credit2);sheet.querySelector('.scoreHeading').append(credits);
 let row=null,section;const sections=[];
 for(const {svg,measure} of measures){
  const nextRow=measure?.dataset.layoutRow;
  if(!section||row!==nextRow){section=doc.createElement('section');sections.push(section);sheet.append(section);row=nextRow;}
  const cell=doc.createElement('div');cell.style.gridColumn=measure?.style.gridColumn??'1 / -1';cell.style.gridRow='1';cell.style.width=measure?.style.width??'';cell.style.marginLeft=measure?.style.marginLeft??'';
  const drawing=doc.importNode(svg,true);
  drawing.querySelectorAll('.etudeEditorHit,.etudeInputCursor,.etudeLastEntered,.etudePlayingSlot,.etudePlayingRow,.etudeBeamRangeSelection').forEach(node=>node.remove());cell.append(drawing);section.append(cell);
 }
 // Re-engrave at paper width with readable symbols, never a
 // narrow scaled copy of the mobile editor.
 const compiled=metadata?compileScoreDocument(metadata,undefined,{allowIncomplete:true}).score:null;
 // Paper engraving uses CSS pixels at physical A4 size, never the editor zoom.
 const paperWidth=sheet.clientWidth-parseFloat(win.getComputedStyle(sheet).paddingLeft)-parseFloat(win.getComputedStyle(sheet).paddingRight);
 const placements=compiled?measureLayout(metadata.measures,metadata.viewSettings?.measuresPerRow??1,metadata.viewSettings?.systemBreaks??[]):[];
 if(compiled){
  // Density must never override the document's explicit system layout.
  sections.forEach(section=>section.remove());sections.length=0;
  for(const placement of placements){
   if(!sections[placement.row-1]){const section=doc.createElement('section');section.style.display='flex';sections.push(section);sheet.append(section);}
   const cell=doc.createElement('div');cell.style.flex='none';sections[placement.row-1].append(cell);
  }
 }
 const renderForPrint=virtualWidth=>{
  if(!compiled)return;
  const spacing=scoreSpacing(compiled,{placements,view,width:virtualWidth,independentRows:true});
  const systemFootroom=Math.max(0,...compiled.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>(-7-staffStepForPitch(n.pitch,compiled.instrument))*5));
  let cellIndex=0;
  for(const section of sections){for(const cell of section.children){
   const i=cellIndex++,geometry=spacing.measures[i],m=metadata.measures[i];
   const first=placements[i].column===1,last=!placements[i+1]||placements[i+1].row!==placements[i].row;
   const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden';document.body.append(host);
   try{
   drawScore(host,{...compiled,document:undefined,measureCharts:[measureChordCharts(compiled)[i]],slurSpans:slurSpans(compiled.measures),measures:[compiled.measures[i]],repeatMarks:[m],chordShapes:compiled.chordShapes?.[i]?[compiled.chordShapes[i]]:undefined,harmony:[compiled.harmony?.[i]],annotationOffsets:[m.annotationOffsets],navigationPrevious:metadata.measures[i-1],navigationNext:metadata.measures[i+1]},
    {editor:true,barOffset:i,view,systemFootroom,editorWidth:geometry.cellWidth,engraving:geometry,systemStart:first,systemEnd:last,scoreEnd:i===compiled.measures.length-1,tabRhythm:metadata.viewSettings?.tabRhythm!==false,tabBeamPosition:metadata.viewSettings?.tabBeamPosition,tabPickingPosition:metadata.viewSettings?.tabPickingPosition});
   const svg=host.querySelector('svg');svg.querySelectorAll('.etudeEditorHit,.etudeInputCursor').forEach(el=>el.remove());
   // Keep small annotations readable at physical paper size without changing
   // note spacing, system breaks, or the size of the whole score.
   const paperScale=paperWidth/geometry.rowWidth;
   svg.querySelectorAll('.etudeTechniqueLabel').forEach(label=>{label.style.fontSize=`${Math.max(12,8.5/paperScale)}px`;});
   cell.replaceChildren(doc.importNode(svg,true));cell.style.width=`${geometry.cellWidth/geometry.rowWidth*100}%`;cell.style.marginLeft='0';
   }finally{host.remove();}
  }
   // Each cell is engraved separately, so section labels, wrapped chord names
   // and navigation can reserve different amounts of space above its stave.
   // Align the actual stave origins before pagination, preserving annotations
   // and the horizontal scale instead of stretching individual measures.
   const cells=[...section.querySelectorAll('svg')].map(svg=>{
    const number=svg.querySelector('.etudeMeasureNumber');
    if(!number)return null;
    const box=svg.viewBox.baseVal;
    return {svg,x:box.x,y:box.y,width:box.width,height:box.height,top:Number(number.getAttribute('y'))+4-box.y};
   }).filter(Boolean);
   if(cells.length>1){
    const top=Math.max(...cells.map(cell=>cell.top));
    const height=Math.max(...cells.map(cell=>cell.height+top-cell.top));
    for(const cell of cells){
     cell.svg.setAttribute('viewBox',`${cell.x} ${cell.y-(top-cell.top)} ${cell.width} ${height}`);
     cell.svg.setAttribute('height',String(height));
     cell.svg.style.aspectRatio=`${cell.width} / ${height}`;
    }
   }
  }
 };
 const paginate=()=>{
  const scroller=main.closest('.rt-print-scroll'),scrollTop=scroller.scrollTop,scrollLeft=scroller.scrollLeft;
  heading.textContent=settings.title;credit.textContent=settings.description;credit2.textContent=settings.description2||'';credits.replaceChildren(...[settings.showDescription?credit:null,settings.showDescription2?credit2:null].filter(Boolean));credits.hidden=!settings.showDescription&&!settings.showDescription2;
  const gap=12;let pageIndex=0;
  const pageAt=index=>{
   const paper=sheets[index]||newSheet();
   paper.style.paddingTop=(index===0?PRINT_TOP:PRINT_MARGIN)+'px';
   return paper;
  };
  // Retain frames and page identities while moving rows. Removing page 2 here
  // collapses the scroll range and sends iOS back to the first page while editing.
  sections.forEach(section=>section.remove());
  sheets.forEach(paper=>paper.querySelector('.pageNumber')?.remove());
  sheet=pageAt(0);
  for(const section of sections){
   section.style.width='100%';section.style.marginBottom=gap+'px';sheet.append(section);
   const bottom=section.offsetTop+section.offsetHeight;
   const limit=PRINT_BOTTOM;
   if(bottom>limit&&sheet.querySelectorAll('section').length>1){section.remove();sheet=pageAt(++pageIndex);sheet.append(section);}
  }
  sheets.splice(pageIndex+1).forEach(paper=>paper.parentElement.remove());
  sheets.forEach((paper,i)=>{const number=doc.createElement('footer');number.className='pageNumber';const address=doc.createElement('span');address.className='printSiteAddress';address.textContent=SCORE_SOURCE_URL;const counter=doc.createElement('span');counter.className='scorePageNumber';counter.textContent=`${i+1} / ${sheets.length}`;counter.hidden=!settings.pageNumbers;number.append(address,counter);paper.append(number);});
  scroller.scrollTop=scrollTop;scroller.scrollLeft=scrollLeft;
  onPages(sheets.length);
 };
 renderForPrint(view==='tab'?paperWidth*1.65:paperWidth);paginate();
 return {update(next){settings=next;paginate();},dispose(){main.replaceChildren();}};
}
