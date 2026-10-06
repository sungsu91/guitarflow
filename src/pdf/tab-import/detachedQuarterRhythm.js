// A separate TAB rhythm line can use bare stems for quarters. Absence of a
// detected beam alone is not evidence: require an isolated, full-height stroke
// aligned with both a fret column and the established beamed rhythm baseline.
export function attachDetachedQuarterRhythm(ink,width,height,staff){
 const g=staff.spacing,anchors=staff.candidates.filter(c=>!c.nonFretSymbol&&c.stringDistance<=.22);
 for(const direction of [-1,1]){
  const references=staff.measures.flatMap(m=>m.rhythm).filter(r=>r.direction===direction&&r.beamCount>0&&r.duration&&!r.rest);
  if(references.length<2)continue;
  const edge=direction===1?staff.lines.at(-1):staff.lines[0];
  const left=Math.max(0,Math.floor(staff.x)),right=Math.min(width-1,Math.ceil(staff.x+staff.width));
  const near=Math.round(edge+direction*g*.25),far=Math.round(edge+direction*g*3.6),top=Math.max(0,Math.min(near,far)),bottom=Math.min(height-1,Math.max(near,far)),visited=new Set();
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   const at=y*width+x;if(!ink[at]||visited.has(at))continue;
   const stack=[at];visited.add(at);let minX=x,maxX=x,minY=y,maxY=y;
   while(stack.length){const p=stack.pop(),px=p%width,py=Math.floor(p/width);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=px+dx,ny=py+dy,n=ny*width+nx;if(nx<left||nx>right||ny<top||ny>bottom||!ink[n]||visited.has(n))continue;visited.add(n);stack.push(n);}
   }
   const w=maxX-minX+1,h=maxY-minY+1,cx=(minX+maxX)/2,end=direction===1?maxY:minY,start=direction===1?minY:maxY;
   if(minY===top||maxY===bottom||w<1||w>g*.48||h<g*1.3||h>g*2.5||Math.abs(start-edge)>g*1.2)continue;
   const aligned=references.filter(r=>Math.abs(r.y-end)<g*.35);
   if(aligned.length<2||!anchors.some(c=>Math.abs(c.cx-cx)<g*.38))continue;
   // A substantial break or a short picking stroke cannot supply a quarter.
   let rows=0;for(let py=minY;py<=maxY;py++){let count=0;for(let px=minX;px<=maxX;px++)count+=ink[py*width+px];if(count)rows++;}
   if(rows/h<.95)continue;
   const measure=staff.measures.find(m=>cx>m.x+g*.35&&cx<m.x+m.width-g*.35);if(!measure)continue;
   const existing=measure.rhythm.filter(r=>Math.abs(r.x-cx)<g*.45);if(existing.length>1||existing[0]?.duration||existing[0]?.rest)continue;
   const evidence={duration:'4',confidence:.97,direction,beamCount:0,flagCount:0,method:'isolated-detached-quarter'};
   if(existing.length)Object.assign(existing[0],evidence);else measure.rhythm.push({x:cx,y:end,...evidence});
   measure.rhythm.sort((a,b)=>a.x-b.x);
  }
 }
}
