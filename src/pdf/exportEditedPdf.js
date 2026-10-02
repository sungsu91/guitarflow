import {ANNOTATION_COLORS,FULL_PAGE,pageCrop,projectRect} from './pdfAnnotations.js';
import {isCutPoint,pageVisibleHeight,retainedBands} from './pdfGapCuts.js';
import {canvasSize} from './pdfModel.js';

export const pdfExportFilename=title=>`${String(title||'Score').replace(/\.pdf$/i,'')}.pdf`;

export function hasPdfPageEdits(pageEdits={}){
 return Object.values(pageEdits??{}).some(edit=>{
  const crop=pageCrop(edit);
  return Object.keys(FULL_PAGE).some(key=>crop[key]!==FULL_PAGE[key])||pageVisibleHeight(crop)<crop.height||edit?.notes?.length||edit?.strokes?.length;
 });
}

// Use the same original-page coordinates and cut projection as the score viewer.
// Practice bar maps, highlights and playback controls never enter this canvas.
export function drawPdfAnnotations(context,edit,crop,width,height){
 const originalWidth=width/crop.width;
 const point=(x,y)=>{const p=projectRect({x,y,width:0,height:0},crop);return [p.x*width,p.y*height];};
 context.save();context.beginPath();context.rect(0,0,width,height);context.clip();
 for(const stroke of edit?.strokes??[]){
  const points=stroke.points.filter(([,y])=>!isCutPoint(y,crop));
  if(!points.length)continue;
  context.save();context.strokeStyle=ANNOTATION_COLORS[stroke.color]??ANNOTATION_COLORS.brown;
  context.fillStyle=context.strokeStyle;context.lineWidth=stroke.width*originalWidth;context.globalAlpha=stroke.opacity??1;
  context.lineCap='round';context.lineJoin='round';context.beginPath();
  points.forEach(([x,y],index)=>{const p=point(x,y);if(index)context.lineTo(...p);else context.moveTo(...p);});
  if(points.length===1){context.arc(...point(...points[0]),context.lineWidth/2,0,Math.PI*2);context.fill();}else context.stroke();
  context.restore();
 }
 for(const note of edit?.notes??[]){
  if(isCutPoint(note.y,crop))continue;
  const size=note.size*originalWidth;
  context.save();context.translate(...point(note.x,note.y));context.rotate((note.rotation??0)*Math.PI/180);
  context.font=`500 ${size}px Arial, sans-serif`;context.fillStyle=ANNOTATION_COLORS[note.color]??ANNOTATION_COLORS.brown;
  context.textBaseline='alphabetic';
  // Match the viewer's pre-wrapped text and 1.2 line height, including Korean.
  let row=0;
  for(const paragraph of note.text.split('\n')){
   let line='';
   for(const character of paragraph){
    if(line&&context.measureText(line+character).width>width*.95){context.fillText(line,0,(row++*1.2+1)*size);line='';}
    line+=character;
   }
   context.fillText(line,0,(row++*1.2+1)*size);
  }
  context.restore();
 }
 context.restore();
}

export async function exportEditedPdf(record,blob,{onProgress=()=>{}}={}){
 // Unedited documents keep their original vector quality and bytes.
 if(!hasPdfPageEdits(record.pageEdits))return blob;
 const [{loadPdfTask},{jsPDF}]=await Promise.all([import('./pdfRenderer.js'),import('jspdf')]);
 await document.fonts?.ready;
 const task=loadPdfTask(new Uint8Array(await blob.arrayBuffer()));
 try{
  const source=await task.promise;let output;
  for(let number=1;number<=source.numPages;number++){
   onProgress(number,source.numPages);
   const page=await source.getPage(number),base=page.getViewport({scale:1});
   const edit=record.pageEdits?.[number],crop=pageCrop(edit),width=base.width*crop.width,height=base.height*pageVisibleHeight(crop);
   // Bound allocations on phones while keeping normal scores near 200 dpi.
   const dimensions=canvasSize(width*1.5,base.height*crop.height*1.5,2),scale=dimensions.ratio*1.5;
   const canvas=document.createElement('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
   let flattened=canvas;
   try{
    await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale}),transform:[1,0,0,1,-crop.x*base.width*scale,-crop.y*base.height*scale],background:'white'}).promise;
    if(crop.cuts?.length){
     flattened=document.createElement('canvas');flattened.width=canvas.width;flattened.height=Math.max(1,Math.round(height*scale));
     const context=flattened.getContext('2d');context.fillStyle='white';context.fillRect(0,0,flattened.width,flattened.height);let dest=0;
     for(const band of retainedBands(crop)){
      const top=(band.start-crop.y)*base.height*scale,length=(band.end-band.start)*base.height*scale;
      context.drawImage(canvas,0,top,canvas.width,length,0,dest,canvas.width,length);dest+=length;
     }
    }
    drawPdfAnnotations(flattened.getContext('2d'),edit,crop,flattened.width,flattened.height);
    const orientation=width>height?'landscape':'portrait';
    if(!output){output=new jsPDF({unit:'pt',format:[width,height],orientation,compress:true});output.setProperties({title:record.title||'Score'});}
    else output.addPage([width,height],orientation);
    output.addImage(flattened,'PNG',0,0,width,height,undefined,'FAST');
   }finally{canvas.width=canvas.height=0;if(flattened!==canvas)flattened.width=flattened.height=0;page.cleanup();}
   // Let the saving indicator paint between pages, including on mobile.
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  return output.output('blob');
 }finally{await task.destroy();}
}
