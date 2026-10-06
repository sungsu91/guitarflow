import {normalizePhotoPaper,photoStaffTracks} from './tab-import/cameraPhotoGeometry.js';
import {binaryPage,runs,detectBarlines} from './tab-import/geometry.js';
import {isPracticeBarline} from './practiceBarlines.js';
import {photoBars} from './photoPracticeBarlines.js';

// Staff geometry follows the paper locally. A single global deskew cannot
// straighten both sides of a curved book or a perspective photograph.
export function sample(track,x){
 const ps=track.points;let i=0;while(i<ps.length-2&&ps[i+1].x<x)i++;
 const a=ps[i],b=ps[i+1],f=Math.max(-1,Math.min(2,(x-a.x)/(b.x-a.x)));
 return {center:a.center+(b.center-a.center)*f,spacing:a.spacing+(b.spacing-a.spacing)*f,lines:a.lines.map((y,j)=>y+(b.lines[j]-y)*f)};
}
function photoBoundary(ink,width,staff,x){
 if(!isPracticeBarline(ink,width,staff,x))return false;
 if(staff.lines.length!==5)return true;
 const g=staff.spacing;
 for(const [edge,side] of [[staff.lines[0],1],[staff.lines.at(-1),-1]]){
  const ys=[];for(let dy=-Math.ceil(g*.55);dy<=g*.55;dy++){const y=Math.round(edge+dy);if(staff.lines.some(l=>Math.abs(l-y)<=Math.max(2,g*.12)))continue;
   let longest=0;for(let offset=-2;offset<=2;offset++){let n=0;for(let dx=0;dx<=g*1.2;dx++){if(!ink[y*width+Math.round(x+offset+side*dx)])break;n++;}longest=Math.max(longest,n);}
   if(longest>g*.75)ys.push(y);
  }
  if(ys.length>g*.22)return false;
 }
 return true;
}
// An isolated beam can complete a false five-line window one space away from
// the staff. Reject that single jump, while retaining gradual page curvature.
export function cleanTrackPoints(points){
 return points.filter((point,i)=>{
  const a=points[i-1],b=points[i+1];if(!a||!b)return true;
  const f=(point.x-a.x)/(b.x-a.x),expected=a.center+(b.center-a.center)*f;
  const spacing=a.spacing+(b.spacing-a.spacing)*f;
  const isolated=(point.center-a.center)*(point.center-b.center)>0;
  return !(isolated&&Math.abs(b.center-a.center)/(b.x-a.x)<.12&&Math.abs(point.center-expected)>spacing*.6);
 });
}
export function extendTrack(track,gray,width,height){

 const points=cleanTrackPoints(track.points).map(p=>({...p})),step=Math.max(18,Math.round(track.spacing*2)),count=track.count;
 for(const sign of [-1,1]){
  let last=sign<0?points[0]:points.at(-1),previous=sign<0?points[1]:points.at(-2);
  for(let x=last.x+sign*step;x>=0&&x<width;x+=sign*step){
   const slope=Math.max(-.3,Math.min(.3,(last.center-previous.center)/(last.x-previous.x))),expected=last.center+slope*(x-last.x),g=last.spacing;
   const y0=Math.max(0,Math.floor(expected-g*(count+2)/2)),y1=Math.min(height-1,Math.ceil(expected+g*(count+2)/2)),projection=[];
   const l=Math.max(0,Math.round(x-step/2)),r=Math.min(width-1,Math.round(x+step/2));
   for(let y=y0;y<=y1;y++){let n=0;for(let c=l;c<=r;c++)n+=gray[y*width+c];projection[y-y0]=n/(r-l+1);}
   const density=y=>Math.max(...[-1,0,1].map(d=>projection[Math.round(y+d)-y0]??0));
   let best=null;
   for(let center=expected-g*.65;center<=expected+g*.65;center+=.75)for(let spacing=g*.94;spacing<=g*1.06;spacing+=.3){
    const lines=Array.from({length:count},(_,i)=>center+(i-(count-1)/2)*spacing),supports=lines.map(density),between=lines.slice(1).map(y=>density(y-spacing/2));
    const contrast=supports.reduce((a,b)=>a+b,0)/count-between.reduce((a,b)=>a+b,0)/(count-1)*.8;
    const score=contrast-Math.abs(center-expected)/g*.16-Math.abs(spacing-g)/g*.8;
    if(!best||score>best.score)best={x,center,spacing,lines,score,contrast,supports};
   }
   if(best.contrast<.1||best.supports.filter(s=>s>.35).length<count-1)break;
   if(sign<0)points.unshift(best);else points.push(best);previous=last;last=best;
  }
 }
 return {...track,points};
}
export function photoPartLayout(ink,width,height,tracks){
 // Count simultaneous hands/parts once only when a narrow connector traverses
 // the gap. Wide dark hands, shadows and the book edge are not connectors.
 const rows=tracks.map(r=>{const {track:t,staff:s}=r,lines=sample(t,s.x).lines;return r.origin??{top:lines[0],bottom:lines.at(-1),spacing:t.spacing,left:s.x,right:s.x+s.width};});
 let system=0,part=0;
 for(let i=0;i<rows.length;i++){
  const a=rows[i-1],b=rows[i];let connected=false;
  if(a&&a.left!=null&&b.left!=null){const g=Math.max(a.spacing,b.spacing),left=Math.max(0,Math.floor(Math.min(a.left,b.left)-g*3)),right=Math.min(width-1,Math.ceil(Math.max(a.left,b.left)+g*.3)),from=Math.round(a.bottom+g*.5),to=Math.round(b.top-g*.5);
   let previous=new Float32Array(right-left+1).fill(-Infinity);
   if(to-from>g*3)for(let y=from;y<=to;y++){const next=new Float32Array(previous.length).fill(-Infinity);for(let x=left;x<=right;x++){let bounded=Boolean(ink[y*width+x]);for(const sign of [-1,1]){let clear=false;for(let dx=1;dx<=g*.4;dx++)if(!ink[y*width+x+dx*sign]){clear=true;break;}bounded&&=clear;}
    const j=x-left,prior=y===from?0:Math.max(previous[j],previous[j-1]??-Infinity,previous[j+1]??-Infinity);next[j]=prior+(bounded?1:-3);
   }previous=next;}connected=to>from&&Math.max(...previous)/(to-from+1)>.94;
  }
  if(connected)part++;else{part=1;system++;}Object.assign(b,{system,part});
 }
 return {rows};
}
export function photoRows(input){
 const {rgba,width,height}=input,normal=normalizePhotoPaper(rgba,width,height),tracks=[],rows=[];
 for(const count of [6,5])for(const t of photoStaffTracks(normal,width,height,count))tracks.push({...t,count});
 tracks.sort((a,b)=>a.center-b.center);
 const trackInk=binaryPage(normal,width,height,230);
 for(const original of tracks){
  const t=extendTrack(original,trackInk,width,height);
  const g=t.spacing,pad=g*2,h=g*(t.count-1)+pad*2+1,strip=new Uint8ClampedArray(width*h*4).fill(255);
  for(let x=0;x<width;x++){
   const s=sample(t,x);
   for(let y=0;y<h;y++){
    const at=(y-pad)/g,i=Math.max(0,Math.min(t.count-2,Math.floor(at))),sy=s.lines[i]+(s.lines[i+1]-s.lines[i])*(at-i);
    if(sy<0||sy>=height-1)continue;const y0=Math.floor(sy),f=sy-y0,p=(y*width+x)*4,a=(y0*width+x)*4,b=a+width*4;
    for(let c=0;c<3;c++)strip[p+c]=normal[a+c]*(1-f)+normal[b+c]*f;
   }
  }
  // A bright rule mask locates faint staves; the ordinary ink mask is retained
  // for glyph and barline decisions so faint digits do not become solid walls.
  const ink=binaryPage(strip,width,h),ruleInk=binaryPage(strip,width,h,230),lines=Array.from({length:t.count},(_,i)=>pad+i*g),xs=[];
  for(let x=0;x<width;x++){let n=0;for(const y of lines){let hit=0;for(let dy=-2;dy<=2;dy++)hit|=ruleInk[(y+dy)*width+x];n+=hit;}const background=[lines[0]-g,lines[0]-g/2,lines.at(-1)+g/2,lines.at(-1)+g].every(y=>ruleInk[Math.round(y)*width+x]);if(n>=t.count-1&&!background)xs.push(x);}
  const spans=runs(xs,Math.ceil(g*2));const span=spans.sort((a,b)=>b.length-a.length)[0];if(!span)continue;
  let left=span[0],right=span.at(-1);
  // Page edges and dark surroundings cross every rule too, but do not have
  // horizontal staff lines with lighter spaces between them.
  const ruled=(x,sign)=>{let supported=0;const length=Math.ceil(g*1.5);for(let i=0;i<t.count-1;i++){let on=0,off=0;for(let dx=0;dx<length;dx++){const xx=x+sign*dx;if(xx<0||xx>=width)continue;let hit=0;for(let dy=-2;dy<=2;dy++)hit|=ruleInk[(lines[i]+dy)*width+xx];on+=hit;off+=ruleInk[Math.round(lines[i]+g/2)*width+xx];}if(on>length*.5&&on-off>length*.18)supported++;}return supported>=t.count-2;};
  while(left<span[0]+g*4&&!ruled(left,1))left++;
  while(right>span.at(-1)-g*4&&!ruled(right,-1))right--;
  const staff={x:left,y:pad,width:right-left,height:g*(t.count-1),lines,spacing:g,thickness:3};
  const detected=detectBarlines(ink,width,staff,{minMeasureSpacing:1.2,camera:true,ruleInk,minCoverage:.90,acceptBoundary:x=>photoBoundary(ink,width,staff,x)});
  detected.unfiltered=detectBarlines(ink,width,staff,{minMeasureSpacing:1.2,camera:true,ruleInk,minCoverage:.90,acceptBoundary:x=>isPracticeBarline(ink,width,staff,x)});
  if(t.count===6){detected.bars=photoBars(ink,width,staff,detected.unfiltered.bars).map(b=>b.x);const boundaries=[left,...detected.bars.filter(x=>x-left>g&&right-x>g),right];detected.measures=boundaries.slice(0,-1).map((x,i)=>({x,width:boundaries[i+1]-x}));}
  while(detected.measures.length>1&&detected.measures[0].width<g*3){const first=detected.measures.shift(),next=detected.measures[0];next.width+=next.x-first.x;next.x=first.x;}
  const support=lines.map(y=>{let n=0;for(let x=left;x<=right;x++){let hit=0;for(let dy=-2;dy<=2;dy++)hit|=ruleInk[(y+dy)*width+x];n+=hit;}return n/(right-left+1);});
  const quality=Math.min(...support)*(right-left)/width;
  let dark=0,total=0;for(let y=lines[0];y<=lines.at(-1);y++){if(lines.some(l=>Math.abs(y-l)<=2))continue;for(let x=left;x<=right;x++){dark+=ink[y*width+x];total++;}}
  rows.push({track:t,staff,detected,width,height,quality,support,density:dark/Math.max(1,total)});
 }
 const selected=[];for(const row of rows.sort((a,b)=>b.quality-a.quality))if(!selected.some(r=>Math.abs(r.track.center-row.track.center)<Math.max(r.track.spacing,row.track.spacing)*3))selected.push(row);
 selected.sort((a,b)=>a.track.center-b.track.center);
 return selected;
}
