import {binaryPage} from './tab-import/geometry.js';
import {normalizePhotoPaper} from './tab-import/cameraPhotoGeometry.js';
import {detectPaperQuad,warpPaperPixels} from './tab-import/paperScanGeometry.js';
import {photoRows,photoPartLayout,sample} from './photoPracticeRows.js';

const clamp=value=>Math.max(0,Math.min(1,value));

// A photograph has a substantial shaded paper field. Do not route clean PDF
// engravings through photographic thresholds or interpret a shadow as percussion.
export function isPhotographicPage({rgba,width,height}){
 let shaded=0,total=0;
 const step=Math.max(1,Math.floor(Math.sqrt(width*height/18000)));
 for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){
  const p=(y*width+x)*4,value=rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114;
  if(value>45&&value<245)shaded++;total++;
 }
 return total>0&&shaded/total>.35;
}

function resize(rgba,width,height,targetWidth){
 const w=Math.max(2,Math.round(targetWidth)),h=Math.max(2,Math.round(height*w/width));
 if(w===width&&h===height)return {rgba,width,height};
 const out=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=x*(width-1)/(w-1),sy=y*(height-1)/(h-1),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0,p=(y*w+x)*4;
  for(let c=0;c<3;c++)out[p+c]=(rgba[(y0*width+x0)*4+c]*(1-fx)+rgba[(y0*width+x1)*4+c]*fx)*(1-fy)+(rgba[(y1*width+x0)*4+c]*(1-fx)+rgba[(y1*width+x1)*4+c]*fx)*fy;
  out[p+3]=255;
 }
 return {rgba:out,width:w,height:h};
}

// The same projective mapping used by the paper warp, in normalized original
// coordinates. Analysis rectification must never move overlays off the photo.
export function photoPaperPoint(q,u,v){
 const [a,b,c,d]=q,dx=b.x-c.x,dy=b.y-c.y,ex=d.x-c.x,ey=d.y-c.y,sx=a.x-b.x+c.x-d.x,sy=a.y-b.y+c.y-d.y,det=dx*ey-ex*dy;
 const g=Math.abs(det)>1e-10?(sx*ey-ex*sy)/det:0,h=Math.abs(det)>1e-10?(dx*sy-sx*dy)/det:0,den=g*u+h*v+1;
 return {x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/den,y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/den};
}

function attachCoordinates(row,width,height,quad){
 row.point=(x,y)=>quad?photoPaperPoint(quad,x/(row.width-1),y/(row.height-1)):{x:x/width,y:y/height};
 const a=sample(row.track,row.staff.x).lines,b=sample(row.track,row.staff.x+row.staff.width).lines;
 const start=row.point(row.staff.x,a[0]),end=row.point(row.staff.x,a.at(-1)),right=row.point(row.staff.x+row.staff.width,b[0]);
 row.origin={left:start.x*width,right:right.x*width,top:start.y*height,bottom:end.y*height,spacing:(end.y-start.y)*height/(row.track.count-1)};
 row.center=row.point(row.staff.x+row.staff.width/2,sample(row.track,row.staff.x+row.staff.width/2).center).y*height;
 return row;
}

function chooseReference(rows){
 const score=r=>r.quality-r.density*2;
 let ref=[...rows].sort((a,b)=>score(b)-score(a))[0];
 // A notation head attached to a real bar can make the stricter stem test
 // ambiguous. Prefer a separately measured TAB row that corroborates the
 // original notation count; never insert or evenly space guessed boundaries.
 if(ref.track.count===5&&ref.detected.unfiltered.measures.length>ref.detected.measures.length){
  const corroborated=rows.filter(r=>r.track.count===6&&r.quality>=ref.quality*.85&&r.detected.measures.length===ref.detected.unfiltered.measures.length).sort((a,b)=>score(b)-score(a))[0];
  if(corroborated)ref=corroborated;
 }
 return ref;
}

function groupPhotoRows(rows,ink,width,height){
 const tabs=rows.filter(r=>r.track.count===6);
 const connections=photoPartLayout(ink,width,height,tabs.length?tabs:rows).rows;
 (tabs.length?tabs:rows).forEach((row,i)=>{row.part=connections[i]?.part??1;});
 if(!tabs.length){
  const groups=[];
  for(const row of rows){if(row.part>1&&groups.length)groups.at(-1).rows.push(row);else groups.push({rows:[row]});}
  return groups;
 }
 const groups=[];let pending=[];
 for(const row of rows){
  pending.push(row);if(row.track.count!==6)continue;
  if(row.part>1&&groups.length)groups.at(-1).rows.push(...pending);else groups.push({rows:pending});
  pending=[];
 }
 for(const row of pending)groups.push({rows:[row]});
 return groups;
}

function rowRect(row,start,end,pad=.6){
 const points=[];
 for(const x of [start,(start+end)/2,end]){
  const s=sample(row.track,x),margin=s.spacing*pad;
  points.push(row.point(x,s.lines[0]-margin),row.point(x,s.lines.at(-1)+margin));
 }
 const x=clamp(Math.min(...points.map(p=>p.x))),y=clamp(Math.min(...points.map(p=>p.y))),right=clamp(Math.max(...points.map(p=>p.x))),bottom=clamp(Math.max(...points.map(p=>p.y)));
 return {x,y,width:right-x,height:bottom-y};
}

function enclosing(rects){
 const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));
 return {x,y,width:Math.max(...rects.map(r=>r.x+r.width))-x,height:Math.max(...rects.map(r=>r.y+r.height))-y};
}

export function detectPhotoPracticeMeasures(input){
 const image=resize(input.rgba,input.width,input.height,Math.min(2083,Math.sqrt(8000000*input.width/input.height)));
 const {rgba,width,height}=image;
 const rows=photoRows(image).map(r=>attachCoordinates(r,width,height));
 const thumb=resize(rgba,width,height,420),paper=detectPaperQuad(thumb.rgba,thumb.width,thumb.height);
 if(paper.detected){
  const warped=warpPaperPixels(rgba,width,height,paper.quad);
  const recovery=photoRows({rgba:warped.data,width:warped.width,height:warped.height}).map(r=>attachCoordinates(r,width,height,paper.quad));
  // Reconcile recovery in original-photo coordinates, without adding a second
  // copy of an already located staff.
  for(const row of recovery){
   if(row.quality<=.45)continue;
   const at=rows.findIndex(r=>Math.abs(r.center-row.center)<Math.max(r.origin.spacing,row.origin.spacing)*3);
   if(at<0){rows.push(row);continue;}
   const prior=rows[at],a=prior.origin,b=row.origin,tolerance=Math.max(a.spacing,b.spacing)*2;
   // A local track can stop at a damaged rule. Recover its missing side only
   // when the paper-corrected staff encloses it and supplies substantially more
   // continuous rule evidence, rather than replacing it by a guessed grid.
   if(row.track.count===prior.track.count&&row.quality>prior.quality*1.35&&b.left<=a.left+tolerance&&b.right>=a.right-tolerance&&(b.right-b.left)>(a.right-a.left)*1.15)rows[at]=row;
  }
 }
 rows.sort((a,b)=>a.center-b.center);
 const ink=binaryPage(normalizePhotoPaper(rgba,width,height),width,height),groups=groupPhotoRows(rows,ink,width,height);
 const systems=[],measures=[];
 for(const [index,group] of groups.entries()){
  const ref=chooseReference(group.rows),boxes=ref.detected.measures;
  if(!boxes.length)continue;
  const bounds=enclosing(group.rows.map(r=>rowRect(r,r.staff.x,r.staff.x+r.staff.width)));
  systems.push({...bounds,system:index+1,staffCount:group.rows.length,lineCounts:group.rows.map(r=>r.track.count),barlines:boxes.map(b=>rowRect(ref,b.x,b.x).x),source:'photo'});
  for(const [i,box] of boxes.entries()){
   // Parts can use different horizontal spacing. Corresponding measured boxes
   // are used only when the counts agree; never divide a missing part evenly.
   const regions=group.rows.flatMap(row=>{
    if(row!==ref&&row.detected.measures.length!==boxes.length)return [];
    const b=row.detected.measures[i];return [{...rowRect(row,b.x,b.x+b.width),lines:row.track.count}];
   });
   const rect=enclosing(regions);
   measures.push({...rect,page:input.page,system:index+1,regions,source:'photo',confidence:.72,staves:regions.map(r=>({top:(r.y-rect.y)/rect.height,height:r.height/rect.height,lines:r.lines}))});
  }
 }
 return {page:input.page,systems,measures,source:'photo',requiresReview:true};
}
