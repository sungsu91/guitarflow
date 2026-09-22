const ns='http://www.w3.org/2000/svg';
// Visual extensions never introduce a note or consume rhythmic time.
export function drawExtendedTechniques(svg,events,notes,stave,{tab=true,bar=0,right=Infinity}={}){
 const obstacles=[];
 events.forEach((event,i)=>{
  if(event.rest)return;
  const tones=event.tones??[event],note=notes[i],x=note.getStemX(),ys=note.getYs(),top=Math.min(...ys);
  const next=notes[i+1]?.getStemX()??right-6,end=Math.min(right-3,x+Math.max(12,Math.min(38,next-x-6)));
  const group=document.createElementNS(ns,'g');group.setAttribute('class',(tab?'fretiva-tab-view':'vf-fretiva-staff-view')+' scoreExtendedTechnique');group.dataset.rhythmEvents=bar+':'+i;svg.append(group);
  const path=(d,kind)=>{const p=document.createElementNS(ns,'path');Object.entries({d,class:kind,fill:'none',stroke:'#171717','stroke-width':1.2,'vector-effect':'non-scaling-stroke','stroke-linecap':'round','pointer-events':'none'}).forEach(([k,v])=>p.setAttribute(k,v));group.append(p);};
  const text=(value,tx,y,kind)=>{const n=document.createElementNS(ns,'text');Object.entries({x:tx,y,class:kind,'text-anchor':'middle',fill:'#171717',stroke:'none','font-size':11,'font-family':'Arial','font-weight':600}).forEach(([k,v])=>n.setAttribute(k,v));n.textContent=value;group.append(n);};
  const arrow=(ax,y,up)=>path('M '+(ax-3)+' '+(y+(up?4:-4))+' L '+ax+' '+y+' L '+(ax+3)+' '+(y+(up?4:-4)),'scoreBendArrow');
  if(event.letRing){const y=top-8;path('M '+(x+3)+' '+y+' Q '+((x+end)/2)+' '+(y-12)+' '+end+' '+(y-2),'scoreOpenTie');}
  if(event.slideOut)ys.forEach(y=>{const start=x+Math.max(6,note.getGlyphWidth()/2+2),finish=Math.min(right-2,start+13),dy=event.slideOut==='up'?-9:9;path('M '+start+' '+(y-2)+' L '+finish+' '+(y-2+dy),'scoreSlideOut');});
  if(event.slideIn)ys.forEach(y=>{const end=x-6,dy=event.slideIn==='up'?9:-9;path('M '+(end-13)+' '+(y+dy)+' L '+end+' '+y,'scoreSlideIn');});
  let lane=0;
  tones.forEach((tone,j)=>{
   if(!tab&&tone.parenthesized){text('(',note.getAbsoluteX()-4,ys[j]+4,'scoreNoteParenthesis');text(')',note.getAbsoluteX()+note.getGlyphWidth()+4,ys[j]+4,'scoreNoteParenthesis');}
   if(!tone.bendEffect)return;
   const {phase,amount}=tone.bendEffect,low=ys[j],high=Math.min(low-24,stave.getYForLine(0)-20-lane++*28),from=x+Math.max(5,String(tone.fret??0).length*3.5+2),to=Math.max(from+9,end),mid=(from+to)/2;
   if(phase==='up'){path('M '+from+' '+low+' Q '+to+' '+low+' '+to+' '+high,'scoreBendUp');arrow(to,high,true);text(amount===2?'full':amount===1?'½':'¼',to,high-5,'scoreBendAmount');}
   if(phase==='prebend'){path('M '+from+' '+low+' V '+high,'scorePrebend');arrow(from,high,true);text(amount===2?'full':amount===1?'½':'¼',from,high-5,'scoreBendAmount');}
   if(phase==='hold'){path('M '+from+' '+high+' H '+to,'scoreBendHold');path('M '+(to-4)+' '+(high-3)+' L '+to+' '+high+' L '+(to-4)+' '+(high+3),'scoreBendArrow');}
   if(phase==='release'){path('M '+from+' '+high+' Q '+to+' '+high+' '+to+' '+low,'scoreBendRelease');arrow(to,low,false);}
   if(phase==='up-release'){path('M '+from+' '+low+' Q '+mid+' '+low+' '+mid+' '+high+' Q '+to+' '+high+' '+to+' '+low,'scoreBendUpRelease');arrow(mid,high,true);arrow(to,low,false);text(amount===2?'full':amount===1?'½':'¼',mid,high-5,'scoreBendAmount');}
   obstacles.push({x:from-10,y:high-17,width:to-from+24,height:low-high+20});
  });
 });
 return obstacles;
}
