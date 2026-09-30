// Image TAB rests sit between strings, unlike fret digits centered on a line.
// Scan only the six-line interior and keep the whole symbol across ruled lines.
// No measure-total arithmetic is used to invent a missing rest or its length.
export function classifyImageRest(points,width,height,spacing){
  const section=(lo,hi)=>{
    const ps=points.filter(p=>p.y/height>=lo&&p.y/height<hi);
    if(!ps.length)return null;
    return {center:ps.reduce((sum,p)=>sum+p.x,0)/ps.length/width,width:(Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x))+1)/width};
  };
  const head=section(0,.2),middle=section(.3,.6),tail=section(.8,1);
  if(!head||!middle||!tail)return null;
  if(height>=spacing*.42&&height<=spacing*.95&&width>=spacing*.32&&width<=spacing*.85){
    if(head.width>=.75&&tail.width<=.65&&middle.center>head.center&&tail.center<middle.center)return '8';
    return null;
  }
  if(height<spacing*1.55||height>spacing*2.15)return null;
  if(width>=spacing*.6&&width<=spacing*1.05&&head.width>=.45&&middle.width>=.65&&tail.width<=.4&&head.center-tail.center>=.18)return '16';
  if(width>=spacing*.4&&width<=spacing*.7&&head.center<.45&&middle.center>head.center+.06&&middle.center>tail.center+.05&&middle.width>=.85&&tail.width>=.5)return '4';
  return null;
}

export function attachImageRests(ink,width,height,staff){
  if(staff.nativeText)return;
  const g=staff.spacing,top=Math.max(0,Math.floor(staff.y+g*.5)),bottom=Math.min(height-1,Math.ceil(staff.y+g*4.5));
  const isInk=(x,y)=>!staff.lines.some(line=>Math.abs(y-line)<=Math.ceil(staff.thickness/2)+1)&&ink[y*width+x];
  for(const measure of staff.measures){
    const columns=[];
    for(let x=Math.ceil(measure.x+g*.6);x<measure.x+measure.width-g*.6;x++){
      if(measure.rhythm.some(r=>Math.abs(r.x-x)<g*.55))continue;
      for(let y=top;y<=bottom;y++)if(isInk(x,y)){columns.push(x);break;}
    }
    const groups=[];for(const x of columns){const last=groups.at(-1);if(last&&x-last.at(-1)<=2)last.push(x);else groups.push([x]);}
    for(const xs of groups){
      const x0=xs[0],x1=xs.at(-1),w=x1-x0+1;if(w<g*.25||w>g*1.2)continue;
      const points=[];for(let y=top;y<=bottom;y++)for(let x=x0;x<=x1;x++)if(isInk(x,y))points.push({x,y});
      const y0=Math.min(...points.map(p=>p.y)),y1=Math.max(...points.map(p=>p.y)),h=y1-y0+1,center=(y0+y1)/2;
      if(Math.abs(center-(staff.lines[2]+g*.5))>g*.18)continue;
      // A neighboring fret chord or a second symbol in this column makes the
      // isolated-rest reading unsafe, even if its center has a rest-like shape.
      if(staff.candidates.some(c=>c.cx>=x0-g*.15&&c.cx<=x1+g*.15&&c.stringDistance<=.22&&(c.cy<y0-g*.2||c.cy>y1+g*.2)))continue;
      const duration=classifyImageRest(points.map(p=>({x:p.x-x0,y:p.y-y0})),w,h,g);if(!duration)continue;
      const x=(x0+x1)/2;
      measure.rhythm.push({x,y:center,duration,rest:true,confidence:.96,method:'image-tab-rest',symbolBounds:{x:x0,y:y0,width:w,height:h}});
      for(const c of staff.candidates)if(c.cx>=x0-g*.15&&c.cx<=x1+g*.15&&c.cy>=y0-g*.2&&c.cy<=y1+g*.2)c.restSymbol=true;
    }
    measure.rhythm.sort((a,b)=>a.x-b.x);
  }
}
