// Fret-anchored, scale-safe strokes shared by screen and paper engraving.
export function tabArcGeometry(first,last,firstIndex=0,lastIndex=0){
 const note=first??last,stave=note.getStave();
 const x1=first?first.getStemX()+2:stave.getTieStartX(),x2=last?last.getStemX()-2:stave.getTieEndX();
 const y1=(first??last).getYs()[first?firstIndex:lastIndex]-6,y2=(last??first).getYs()[last?lastIndex:firstIndex]-6;
 const firstString=(first??last).getPositions()[first?firstIndex:lastIndex].str===1,lift=firstString?9:6;
 return {x1,x2,y1,y2,lift,d:'M '+x1+' '+y1+' C '+x1+' '+(y1-lift)+' '+x2+' '+(y2-lift)+' '+x2+' '+y2};
}
export class ReadableTabTie{
 constructor(notes){this.notes=notes;}
 setContext(context){this.context=context;return this;}
 draw(){const n=this.notes,c=this.context,g=c.openGroup('tabTieArc');c.save();c.setStrokeStyle('#111');c.setLineWidth(1.25);
 (n.first_indices??n.last_indices??[0]).forEach((index,j)=>{const a=tabArcGeometry(n.first_note,n.last_note,index,n.last_indices?.[j]??index);c.beginPath();c.moveTo(a.x1,a.y1);c.bezierCurveTo(a.x1,a.y1-a.lift,a.x2,a.y2-a.lift,a.x2,a.y2);c.stroke();});
 c.restore();g.querySelectorAll('path').forEach(p=>{p.setAttribute('vector-effect','non-scaling-stroke');p.setAttribute('stroke-linecap','round');});c.closeGroup();return this;}
}
export function drawReadableSlide(context,first,last,pair){
 const center=(first.getStemX()+last.getStemX())/2,gap=Math.max(4,(last.getStemX()-first.getStemX()-(first.getGlyphWidth()+last.getGlyphWidth())/2-2)/2);
 const up=Number(first.getPositions()[pair.first].fret)<Number(last.getPositions()[pair.last].fret),dy=up?-2.25:2.25;
 const g=context.openGroup('tabSlideLine');context.save();context.setStrokeStyle('#111');context.setLineWidth(.65);context.beginPath();context.moveTo(center-gap/2,first.getYs()[pair.first]-dy);context.lineTo(center+gap/2,last.getYs()[pair.last]+dy);context.stroke();context.restore();g.querySelectorAll('path').forEach(p=>{p.setAttribute('vector-effect','non-scaling-stroke');p.setAttribute('stroke-linecap','round');});context.closeGroup();
}
