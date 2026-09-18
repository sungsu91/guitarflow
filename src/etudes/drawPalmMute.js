export function drawPalmMute(svg,events,notes,stave,{staff=false,headroom=0,tabRhythm=false}={}){
 const ns='http://www.w3.org/2000/svg',groups=[];let group=[];
 events.forEach((event,i)=>{if(event.rest||!event.palmMute){if(group.length)groups.push(group);group=[];}else group.push(i);});if(group.length)groups.push(group);
 return groups.map(indices=>{
  const g=document.createElementNS(ns,'g'),first=indices[0],last=indices.at(-1);
  g.setAttribute('class',`${staff?'fretiva-staff-view':'fretiva-tab-view'} scorePalmMute`);
  g.dataset.palmMuteEvents=indices.join(',');g.setAttribute('aria-label','P.M. 팜 뮤트');
  const x=notes[first].getAbsoluteX()-8,y=staff?stave.getYForLine(0)-headroom-28:stave.getYForLine(stave.getNumLines()-1)+(tabRhythm?94:44);
  const label=document.createElementNS(ns,'text');
  Object.entries({x,y,'font-family':'Arial','font-size':14,'font-weight':700,fill:'#171717'}).forEach(([k,v])=>label.setAttribute(k,String(v)));
  label.textContent='P.M.';g.append(label);
  const end=notes[last].getAbsoluteX()+12;
  if(indices.length>1&&end>x+36){
   const path=document.createElementNS(ns,'path');Object.entries({d:`M ${x+34} ${y-4} H ${end}`,fill:'none',stroke:'#171717','stroke-width':1,'stroke-dasharray':'4 3'}).forEach(([k,v])=>path.setAttribute(k,String(v)));g.append(path);
   const cap=document.createElementNS(ns,'path');cap.setAttribute('d',`M ${end} ${y-4} v 5`);cap.setAttribute('stroke','#171717');g.append(cap);
  }
  svg.append(g);return {x,y:y-12,width:Math.max(32,end-x),height:16};
 });
}
