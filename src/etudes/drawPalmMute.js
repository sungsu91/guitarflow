export function drawPalmMute(svg,events,notes,stave,{staff=false,headroom=0,bar=0}={}){
 const ns='http://www.w3.org/2000/svg';
 return events.flatMap((event,i)=>{
  if(event.rest||!event.palmMute)return [];
  const g=document.createElementNS(ns,'g');
  g.setAttribute('class',`${staff?'fretiva-staff-view':'fretiva-tab-view'} scorePalmMute`);
  g.dataset.rhythmEvents=bar+':'+i;g.dataset.palmMuteEvents=String(i);g.setAttribute('aria-label','P.M. 팜 뮤트');
  // TAB P.M. stays above the first string, regardless of the played strings.
  const x=notes[i].getStemX(),y=staff?stave.getYForLine(0)-headroom-28:stave.getYForLine(0)-12;
  const label=document.createElementNS(ns,'text');
  Object.entries({x,y,'text-anchor':'middle','font-family':'Arial','font-weight':600,'font-size':11,'font-weight':600,fill:'#171717',stroke:'none'}).forEach(([k,v])=>label.setAttribute(k,String(v)));
  label.textContent='P.M.';g.append(label);svg.append(g);
  return [{x:x-12,y:y-12,width:24,height:16}];
 });
}
