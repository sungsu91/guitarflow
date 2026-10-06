import {projectRect} from './pdfAnnotations.js';
import {isCutPoint} from './pdfGapCuts.js';
import {NAV_COMMANDS} from '../etudes/scoreNavigation.js';

// Vector primitives are shared by the screen overlay and saved PDF.
export function pdfRepeatShapes(bars,marks,page,crop,width,height){
 const result=[],scale=width/crop.width/600;
 for(let index=0;index<bars.length;index++){
  const bar=bars[index],mark=marks?.[bar.number];
  if(!mark||bar.page!==page||isCutPoint(bar.y+bar.height/2,crop))continue;
  const r=projectRect(bar,crop),x=r.x*width,y=r.y*height,w=r.width*width,h=r.height*height;
  if(x+w<0||x>width||y+h<0||y>height)continue;
  const shapes=[],line=(x1,y1,x2,y2,strokeWidth=scale)=>shapes.push({type:'line',x1,y1,x2,y2,strokeWidth}),circle=(cx,cy,r,fill=true)=>shapes.push({type:'circle',cx,cy,r,fill,strokeWidth:1.4*scale});
  const text=(value,tx,ty,anchor='start',size=12)=>shapes.push({type:'text',x:tx,y:ty,text:value,anchor,fontSize:size*scale});
  const staves=bar.staves?.length?bar.staves:[{top:.136,height:.728,lines:5}];
  for(const staff of staves){
   const top=projectRect({...bar,y:bar.y+bar.height*staff.top,height:bar.height*staff.height},crop).y*height;
   const bottom=projectRect({...bar,y:bar.y+bar.height*(staff.top+staff.height),height:0},crop).y*height;
   const gap=(bottom-top)/Math.max(1,(staff.lines??5)-1),dots=bx=>{circle(bx,(top+bottom)/2-gap/2,1.5*scale);circle(bx,(top+bottom)/2+gap/2,1.5*scale);};
   if(mark.repeatStart){line(x+scale,top,x+scale,bottom,3*scale);line(x+5*scale,top,x+5*scale,bottom);dots(x+10*scale);}
   if(mark.repeatEnd){line(x+w-scale,top,x+w-scale,bottom,3*scale);line(x+w-5*scale,top,x+w-5*scale,bottom);dots(x+w-10*scale);}
   else if(mark.endBarline){line(x+w-scale,top,x+w-scale,bottom,(mark.endBarline==='final'?3:1)*scale);if(mark.endBarline!=='single')line(x+w-5*scale,top,x+w-5*scale,bottom);}
  }
  const sameSystem=other=>other?.page===bar.page&&Math.abs(other.y-bar.y)<Math.min(other.height,bar.height)*.3;
  const lift=mark.lift??14;
  const previous=bars[index-1],next=bars[index+1],endingTop=Math.max(4*scale,y-(23+lift)*scale);
  if(mark.ending){
   const start=!sameSystem(previous)||marks?.[previous.number]?.ending!==mark.ending,end=!sameSystem(next)||marks?.[next.number]?.ending!==mark.ending;
   line(x,endingTop,x+w,endingTop,1.2*scale);
   if(start){line(x,endingTop,x,endingTop+10*scale,1.2*scale);text(`${mark.ending}.`,x+4*scale,endingTop+13*scale);}
   if(end)line(x+w,endingTop,x+w,endingTop+10*scale,1.2*scale);
  }
  const symbolY=Math.max(12*scale,y-((mark.ending?38:12)+lift)*scale);
  const coda=(cx,cy)=>{circle(cx,cy,6*scale,false);line(cx-10*scale,cy,cx+10*scale,cy,1.3*scale);line(cx,cy-10*scale,cx,cy+10*scale,1.3*scale);};
  if(mark.marker==='coda')coda(x+12*scale,symbolY);
  if(mark.marker==='segno'){
   const cx=x+12*scale,cy=symbolY,s=scale;
   shapes.push({type:'path',d:`M ${cx+5*s} ${cy-7*s} C ${cx-8*s} ${cy-16*s}, ${cx-10*s} ${cy-1*s}, ${cx} ${cy} C ${cx+12*s} ${cy+2*s}, ${cx+6*s} ${cy+16*s}, ${cx-5*s} ${cy+8*s}`,strokeWidth:2*s});
   line(cx-9*s,cy+10*s,cx+9*s,cy-10*s,1.3*s);circle(cx-8*s,cy-4*s,1.5*s);circle(cx+8*s,cy+4*s,1.5*s);
  }
  if(mark.marker==='toCoda'){text('To',x+w-26*scale,symbolY+4*scale,'end');coda(x+w-12*scale,symbolY);}
  if(mark.marker==='fine')text('Fine',x+w-3*scale,symbolY+4*scale,'end');
  if(mark.command)text(NAV_COMMANDS.find(([key])=>key===mark.command)?.[1]??'',x+w-3*scale,Math.min(height-4*scale,y+h+16*scale),'end');
  result.push({number:bar.number,shapes});
 }
 return result;
}

export function drawPdfRepeatShapes(context,groups){
 context.save();context.strokeStyle='#191919';context.fillStyle='#191919';context.lineCap='butt';
 for(const {shapes} of groups)for(const shape of shapes){
  context.lineWidth=shape.strokeWidth??1;
  if(shape.type==='text'){context.font=`600 ${shape.fontSize}px Arial, sans-serif`;context.textAlign=shape.anchor==='end'?'right':'left';context.textBaseline='alphabetic';context.fillText(shape.text,shape.x,shape.y);}
  else if(shape.type==='path')context.stroke(new Path2D(shape.d));
  else {context.beginPath();if(shape.type==='line'){context.moveTo(shape.x1,shape.y1);context.lineTo(shape.x2,shape.y2);context.stroke();}else{context.arc(shape.cx,shape.cy,shape.r,0,Math.PI*2);if(shape.fill)context.fill();else context.stroke();}}
 }
 context.restore();
}
