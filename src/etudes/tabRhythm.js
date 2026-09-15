// Quarter-note ticks; compound meters group three denominator beats.
export function rhythmGroups(events,meter=[4,4]) {
 const beat=1920/meter[1]*(meter[1]===8&&meter[0]%3===0?3:1),groups=[];let group=[],bucket=-1;
 events.forEach((e,i)=>{const b=Math.floor(e.onset/beat);
  if(e.rest||Number(e.duration)<8||b!==bucket){if(group.length)groups.push(group);group=[];}
  if(!e.rest&&Number(e.duration)>=8)group.push(i);bucket=b;
 });if(group.length)groups.push(group);return groups;
}
export function drawTabRhythm(svg,events,tabs,tab,meter,staffNotes) {
 const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.setAttribute('class','fretiva-tab-view etudeTabRhythm');g.setAttribute('pointer-events','none');svg.append(g);
 const gap=tab.getYForLine(1)-tab.getYForLine(0),bottom=tab.getYForLine(5),base=bottom+gap*2+10;
 g.dataset.sixthY=bottom;g.dataset.beamY=base;g.dataset.lineGap=gap;
 const line=(x1,y1,x2,y2,width,kind)=>{const l=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke:'#171717','stroke-width':width,class:kind}))l.setAttribute(k,v);g.append(l);};
 const x=i=>tabs[i].getStemX();
 // Reuse the engraver's standard rest glyphs in TAB-only rhythm view too.
 events.forEach((e,i)=>{if(!e.rest)return;const source=staffNotes?.[i]?.getSVGElement();if(!source)return;const box=source.getBBox(),rest=source.cloneNode(true);rest.removeAttribute('id');rest.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));rest.setAttribute('transform',`translate(0 ${base-12-(box.y+box.height/2)})`);rest.setAttribute('class','tabRhythmRest');g.append(rest);});
 events.forEach((e,i)=>{if(e.rest||e.duration==='1')return;const lowest=Math.max(...(e.tones??[e]).map(n=>tab.getYForLine(n.string-1)));line(x(i),lowest+9,x(i),base,1.4,'tabRhythmStem');});
 for(const group of rhythmGroups(events,meter)){
  for(let level=1;level<=2;level++){
   const eligible=i=>Number(events[i].duration)>= (level===1?8:16);
   group.forEach((i,j)=>{if(!eligible(i))return;const next=group[j+1],previous=group[j-1],y=base-(level-1)*6;
    if(next!==undefined&&eligible(next))line(x(i),y,x(next),y,4,'tabRhythmBeam');
    else if(previous===undefined||!eligible(previous)){
     // Unpaired subdivisions use a short flag; never cross rests or barlines.
     const direction=j===group.length-1&&j>0?-1:1;
     line(x(i),y,x(i)+direction*8,y-3,3,'tabRhythmFlag');
    }
   });
  }
 }
 return base;
}
