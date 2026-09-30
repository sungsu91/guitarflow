// These shapes are inspected only inside an already detected six-line TAB.
// Chord grids, lyrics and picking marks above/below the staff are never inputs.
export function isTabRepeatSlash(ink,width,staff,x){
  const g=staff.spacing,top=staff.lines[2],bottom=staff.lines[3];
  let matched=0,total=0;
  for(let y=Math.ceil(top+g*.18);y<bottom-g*.18;y++){
    const expected=x+bottom-y;let hit=false;
    for(let dx=-2;dx<=2;dx++)if(ink[y*width+Math.round(expected+dx)])hit=true;
    total++;if(hit)matched++;
  }
  return total>3&&matched/total>=.85;
}

export function hasWholeRest(ink,width,staff,measure){
  const g=staff.spacing,top=staff.lines[1];
  let rows=0;
  for(let y=Math.ceil(top+g*.12);y<=top+g*.4;y++){
    let run=0,longest=0;
    for(let x=Math.ceil(measure.x+measure.width*.3);x<measure.x+measure.width*.7;x++){
      run=ink[y*width+x]?run+1:0;
      longest=Math.max(longest,run);
    }
    if(longest>=g*.65&&longest<=g*1.5)rows++;
  }
  return rows>=Math.max(2,g*.15);
}

export function attachNativeTabSymbols(ink,width,staff,{rhythmicPage=false}={}){
  if(!staff.nativeText)return;
  const g=staff.spacing;
  for(const m of staff.measures){
    const candidates=staff.candidates.filter(c=>c.cx>m.x&&c.cx<m.x+m.width);
    m.rhythm=m.rhythm.filter(r=>{
      if(candidates.some(c=>Math.abs(c.cx-r.x)<g*.4))return true;
      if(r.direction===1&&isTabRepeatSlash(ink,width,staff,r.x)){r.repeatPrevious=true;r.method='tab-repeat-slash';return true;}
      return false;
    });
    // A detached compact dot to the right of the stem end is augmentation,
    // not an eighth flag. It must have white space separating it from the stem.
    for(const r of m.rhythm)if(r.direction===1){
      const points=[],center=r.beamCount?Math.max(...r.beamYs)-g*.5:r.y;
      for(let y=Math.round(center-g*.25);y<=center+g*.25;y++)for(let x=Math.round(r.x+g*.25);x<=r.x+g*.7;x++)if(ink[y*width+x])points.push({x,y});
      if(points.length<3)continue;
      const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
      if(w>=g*.12&&w<=g*.38&&h>=g*.12&&h<=g*.38&&points.length/(w*h)>.45){if(!r.beamCount)r.duration='4';r.dotted=true;r.method='dotted-stem';}
    }
    for(const rest of findEighthRests(ink,width,staff,m,candidates))m.rhythm.push(rest);
    m.rhythm.sort((a,b)=>a.x-b.x);
    if(m.rhythm.length)continue;
    if(!candidates.length&&hasWholeRest(ink,width,staff,m)){
      m.rhythm=[{x:m.x+m.width/2,y:staff.lines[1],duration:'1',rest:true,confidence:.98,method:'whole-rest-on-tab'}];
    }else if(rhythmicPage&&candidates.length>=2&&Math.max(...candidates.map(c=>c.cx))-Math.min(...candidates.map(c=>c.cx))<g*.3){
      // Stemless single chord in rhythmic TAB. A number-only TAB page has no
      // rhythm evidence, and must never acquire whole notes from this rule.
      m.rhythm=[{x:candidates.reduce((n,c)=>n+c.cx,0)/candidates.length,y:staff.lines[5],duration:'1',confidence:.96,method:'stemless-chord-in-rhythmic-tab'}];
    }
  }
}

export function findEighthRests(ink,width,staff,measure,candidates){
  const g=staff.spacing,center=staff.lines[2],top=Math.floor(center-g*.7),bottom=Math.ceil(center+g*.75),columns=[];
  const isInk=(x,y)=>!staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1)&&ink[y*width+x];
  for(let x=Math.ceil(measure.x+g);x<measure.x+measure.width-g;x++){
    if(candidates.some(c=>Math.abs(c.cx-x)<g*.65)||measure.rhythm.some(r=>Math.abs(r.x-x)<g*1.1))continue;
    for(let y=top;y<=bottom;y++)if(isInk(x,y)){columns.push(x);break;}
  }
  const groups=[];for(const x of columns){const group=groups.at(-1);if(group&&x-group.at(-1)<=2)group.push(x);else groups.push([x]);}
  return groups.flatMap(xs=>{
    const x0=xs[0],x1=xs.at(-1),w=x1-x0+1;if(w<g*.3||w>g*.85)return [];
    const points=[];for(let y=top;y<=bottom;y++)for(let x=x0;x<=x1;x++)if(isInk(x,y))points.push({x,y});
    const ys=points.map(p=>p.y),y0=Math.min(...ys),y1=Math.max(...ys),h=y1-y0+1;
    if(h<g*.75||h>g*1.3||Math.abs((y0+y1)/2-center)>g*.25)return [];
    // Round left head, thin descending tail; a slash has no bulb and a 7 cap
    // starts wide. Actual PDF number glyphs were excluded before this scan.
    const head=points.filter(p=>p.y<y0+h*.4),tail=points.filter(p=>p.y>y0+h*.65);
    if(!head.length||!tail.length)return [];
    const headWidth=Math.max(...head.map(p=>p.x))-Math.min(...head.map(p=>p.x))+1;
    const tailWidth=Math.max(...tail.map(p=>p.x))-Math.min(...tail.map(p=>p.x))+1;
    if(headWidth<w*.75||tailWidth>headWidth*.65)return [];
    return [{x:(x0+x1)/2,y:center,duration:'8',rest:true,confidence:.96,method:'eighth-rest-on-tab'}];
  });
}
