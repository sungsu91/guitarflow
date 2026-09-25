import { t as translateUi, getLanguage } from "../i18n/core.js";
import { localizeUi } from "../i18n/core.js";
import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {exportScorePdf} from './exportScorePdf.js';
import {staffStepForPitch} from './scoreInstruments.js';
import {drawScore,scoreSpacing} from './Score.jsx';
import {compileScoreDocument} from './scoreDocument.js';
import brand from './assets/fretiva-lab-logo-print.png';
import sourceFrameCss from './scoreSourceFrame.css?raw';
import qr from './score-source-qr.png';
import {SCORE_SOURCE_HANDLE} from './scoreSource.js';
import {scoreCredit} from './scoreMetadata.js';
import {measureLayout} from './measureLayout.js';
import {slurSpans} from './slurs.js';

// Preview and print use the same A4 sheets; screen scaling never edits notation.
export function printEditorScore(container,title,view='both',metadata) {
 const measures=[...container.querySelectorAll('[data-draw-count]')].map(host=>({svg:host.shadowRoot?.querySelector('svg'),measure:host.closest('[data-layout-row]')})).filter(item=>item.svg);
 if(!measures.length&&!metadata)throw Error(translateUi("etudes.prepareADisplayableScoreFirst"));
 const win=window.open('','_blank','width=1000,height=800');if(!win)throw Error(translateUi("etudes.allowThePrintPreviewPopupAndTryAgain"));
 const doc=win.document;doc.title=title?.trim()||ko["components.scores"];doc.documentElement.lang=getLanguage();
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
 .a4Sheet{position:relative;width:210mm;height:297mm;padding:10mm;background:white;transform-origin:top left;box-shadow:0 2px 12px #0002}
 .a4Sheet{filter:grayscale(1)}.a4Sheet .etudeChordBarre{stroke:#555;stroke-opacity:1;stroke-width:3;fill:none}
 .scoreHeading{display:grid;grid-template-columns:92px minmax(0,1fr) 92px;grid-template-rows:auto auto;column-gap:12px;align-items:center;margin-bottom:10px}.scoreBrand{grid-column:1;grid-row:1/3;align-self:center}.scoreBrand img{display:block;width:23mm;height:23mm;object-fit:contain}.scoreSource{grid-column:3;grid-row:1/3;font:10px Arial,sans-serif;text-align:right;color:#666}.scoreHeading h1{grid-column:2;grid-row:1}.scoreHeading .scoreCredit{grid-column:2;grid-row:2;margin-bottom:0}
 h1{font:700 30px Arial,sans-serif;text-align:center;margin:0 0 10px;overflow-wrap:anywhere}.scoreCredit{text-align:center;font-size:13px;margin:0 0 20px;overflow-wrap:anywhere}
 section{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0;break-inside:avoid}section>div{min-width:0}
 svg{width:100%;height:auto;display:block}svg text{fill:#000}svg .vf-tabnote text{font-weight:400!important}.etudeMeasureNumber{font:700 13px Arial}.pageNumber{position:absolute;bottom:5mm;right:10mm;left:10mm;text-align:right;font-size:10px;color:#777;overflow-wrap:anywhere}
 @media print{body{background:white}.previewToolbar{display:none}main{padding:0}.sheetFrame{width:210mm!important;height:297mm!important;margin:0;break-after:page}.sheetFrame:last-child{break-after:auto}.a4Sheet{transform:none!important;box-shadow:none}}
 ${view==='staff'?'.vf-fretiva-tab-view,.fretiva-tab-view,.vf-fretiva-both-view{display:none}':view==='tab'?'.vf-fretiva-staff-view,.vf-fretiva-both-view{display:none}':''}`;
 doc.head.append(style);
 const toolbar=doc.createElement('header');toolbar.className='previewToolbar';
 const label=doc.createElement('strong');label.textContent=translateUi("etudes.a4PrintPreview");
 const print=doc.createElement('button');print.textContent=translateUi("etudes.printSaveAsPdf");print.disabled=true;print.onclick=()=>win.print();
  const download=doc.createElement('button');download.textContent=translateUi("etudes.savePdf");download.disabled=true;
 download.onclick=async()=>{
  download.disabled=true;download.textContent=translateUi("etudes.creatingPdf");
  try{const {blob,name}=await exportScorePdf(sheets,title);const url=URL.createObjectURL(blob);const link=doc.createElement('a');link.href=url;link.download=name;doc.body.append(link);link.click();link.remove();win.setTimeout(()=>URL.revokeObjectURL(url),60000);}
  catch(error){win.alert(localizeUi(translateUi("etudes.couldNotSavePdf")+error.message));}
  finally{download.disabled=false;download.textContent=translateUi("etudes.savePdf");}
 };
 const close=doc.createElement('button');close.textContent=translateUi("common.close");close.onclick=()=>win.close();
 const hint=doc.createElement('p');hint.textContent=translateUi("etudes.a4Portrait10MmMarginsPreservesYourBarsPerLineAndLine");
 toolbar.append(label,download,print,close,hint);doc.body.append(toolbar);
 const main=doc.createElement('main');doc.body.append(main);
 const status=doc.createElement('div');status.setAttribute('role','status');status.textContent=translateUi("etudes.preparingPdfPreview");status.style.cssText='position:fixed;inset:0;z-index:5;display:grid;place-content:center;background:#f5f2ed;color:#514534;font:16px Arial,sans-serif';doc.body.append(status);
 const sheets=[];
 const fail=error=>{if(win.closed)return;status.textContent=translateUi("etudes.couldNotPrepareThePreviewCloseThisWindowAndTryAgain");console.error(error);};
 // Let the new window paint its status before compiling and engraving the score.
 win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>win.setTimeout(()=>{
 if(win.closed)return;
 try{
 const newSheet=()=>{const frame=doc.createElement('div'),paper=doc.createElement('article');frame.className='sheetFrame';paper.className='a4Sheet';frame.append(paper);main.append(frame);const source=doc.createElement('div');source.className='scoreSource';const image=doc.createElement('img');image.src=new URL(qr,window.location.href).href;image.alt=translateUi("etudes.fretivaLabAppQrCode");image.className='scoreSourceQr';image.style.cssText='width:20mm;height:20mm';const qrFrame=doc.createElement('div');qrFrame.className='scoreSourceFrame';const handle=doc.createElement('div');handle.className='scoreSourceHandle';handle.textContent=SCORE_SOURCE_HANDLE;qrFrame.append(image,handle);source.append(qrFrame);const header=doc.createElement('header');header.className='scoreHeading';const logo=doc.createElement('div');logo.className='scoreBrand';const logoImage=doc.createElement('img');logoImage.src=new URL(brand,window.location.href).href;logoImage.alt='FRETIVA LAB';logo.append(logoImage);header.append(logo,source);paper.append(header);if(sheets.length)header.remove();sheets.push(paper);return paper;};
 let sheet=newSheet();
 const heading=doc.createElement('h1');heading.textContent=title;sheet.querySelector('.scoreHeading').append(heading);
 if(metadata){const credit=doc.createElement('p');credit.className='scoreCredit';credit.textContent=scoreCredit(metadata);sheet.querySelector('.scoreHeading').append(credit);}
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
   drawScore(host,{...compiled,document:undefined,slurSpans:slurSpans(compiled.measures),measures:[compiled.measures[i]],repeatMarks:[m],chordShapes:compiled.chordShapes?.[i]?[compiled.chordShapes[i]]:undefined,harmony:[compiled.harmony?.[i]],annotationOffsets:[m.annotationOffsets],navigationPrevious:metadata.measures[i-1],navigationNext:metadata.measures[i+1]},
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
 const fit=()=>{const scale=Math.min(1,Math.max(1,doc.documentElement.clientWidth-24)/sheets[0].offsetWidth);for(const paper of sheets){paper.style.transform=`scale(${scale})`;paper.parentElement.style.width=`${paper.offsetWidth*scale}px`;paper.parentElement.style.height=`${paper.offsetHeight*scale}px`;}};
 const paginate=()=>{
  if(win.closed)return;
  // Add pages instead of shrinking notation to force a fixed system count.
  const gap=12;
  renderForPrint(view==='tab'?paperWidth*1.65:paperWidth);
  sections.forEach(section=>section.remove());
  for(const section of sections){
   section.style.width='100%';section.style.marginBottom=gap+'px';sheet.append(section);
   const bottom=section.offsetTop+section.offsetHeight;
   const limit=sheet.clientHeight-parseFloat(win.getComputedStyle(sheet).paddingBottom)-12;
   if(bottom>limit&&sheet.querySelectorAll('section').length>1){section.remove();sheet=newSheet();sheet.append(section);}
  }
  sheets.forEach((paper,i)=>{const number=doc.createElement('footer');number.className='pageNumber';number.textContent=`${title} ${i+1}/${sheets.length}`;paper.append(number);});
  label.textContent=translateUi("etudes.a4PrintPreviewValuePages", { value1: sheets.length });fit();print.disabled=false;download.disabled=false;doc.body.dataset.previewReady='true';status.remove();
 };
 doc.fonts.ready.then(()=>win.requestAnimationFrame(()=>{try{paginate();}catch(error){fail(error);}})).catch(fail);win.addEventListener('resize',fit);
 }catch(error){fail(error);}
 },0)));win.focus();
}

