// Read repeat dots beside full-height bar strokes. This adds navigation
// metadata only; it never changes the note/rhythm image sent to the model.
export function staffBarMarks(ink,width,staff,x){
 const g=staff.spacing,top=staff.y,bottom=top+staff.height;
 const at=(xx,yy)=>xx>=0&&xx<width&&yy>=0?ink[Math.round(yy)*width+Math.round(xx)]??0:0;
 const columns=[];
 for(let xx=Math.max(0,Math.floor(x-g*1.4));xx<=x+g*1.4;xx++){
  let count=0;for(let y=top;y<=bottom;y++)count+=at(xx,y);
  if(count/(bottom-top+1)>.95)columns.push(xx);
 }
 const strokes=[];for(const xx of columns){const last=strokes.at(-1);if(last&&xx-last.at(-1)===1)last.push(xx);else strokes.push([xx]);}
 const nearest=strokes.toSorted((a,b)=>Math.abs((a[0]+a.at(-1))/2-x)-Math.abs((b[0]+b.at(-1))/2-x))[0];
 if(!nearest)return {};
 const joined=strokes.filter(s=>Math.min(Math.abs(s[0]-nearest.at(-1)),Math.abs(nearest[0]-s.at(-1)))<=g*1.05);
 const left=Math.min(...joined.flat()),right=Math.max(...joined.flat());
 if(joined.length<2&&nearest.length<Math.max(staff.thickness*1.5,g*.15))return {};
 const dot=(side,cy)=>{
  const edge=side<0?left:right,points=[];
  for(let y=Math.round(cy-g*.36);y<=cy+g*.36;y++)for(let d=Math.ceil(g*.22);d<=g*1.3;d++)if(at(edge+side*d,y))points.push({x:edge+side*d,y});
  if(!points.length)return null;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
  if(w<g*.15||h<g*.15||w>g*.65||h>g*.65||points.length/(w*h)<.5)return null;
  return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
 };
 const pair=side=>{const a=dot(side,top+staff.height*3/8),b=dot(side,top+staff.height*5/8);return a&&b&&Math.abs(a.x-b.x)<g*.2&&Math.abs(b.y-a.y-g)<g*.25;};
 const repeatStart=Boolean(pair(1)),repeatEnd=Boolean(pair(-1));
 return {...(repeatStart?{repeatStart:true}:{}),...(repeatEnd?{repeatEnd:true}:{}),...(!repeatStart&&!repeatEnd&&joined.length>=2&&joined.at(-1).length>joined[0].length*1.6?{endBarline:'final'}:{})};
}

// A thin horizontal bracket with a short downward left corner indicates an
// alternate ending. Its number/range is not provided by the note model yet.
// Detect its presence so ordinary repeat playback cannot guess that route.
export function staffEndingBrackets(ink,width,staff){
 const g=staff.spacing,found=[],at=(x,y)=>ink[y*width+x]??0;
 for(let y=Math.max(0,Math.floor(staff.y-g*6));y<staff.y-g*.8;y++){
  let start=null;
  for(let x=staff.x;x<=staff.x+staff.width+1;x++){
   if(x<=staff.x+staff.width&&at(x,y)){start??=x;continue;}
   if(start!==null&&x-start>=g*8){
    let thick=0,corner=0,total=0,stroke=1;
    const mid=Math.round((start+x)/2);
    for(const sign of [-1,1])for(let dy=1;dy<g;dy++){if(!at(mid,y+sign*dy))break;stroke++;}
    for(let xx=start+g;xx<x-g;xx++)thick+=at(Math.round(xx),Math.round(y+g*.25));
    for(let dy=Math.ceil(g*.2);dy<=g*.8;dy++){total++;let hit=false;for(let dx=0;dx<=Math.ceil(g*.18);dx++)hit||=Boolean(at(start+dx,y+dy));if(hit)corner++;}
    if(stroke<=Math.max(2,g*.2)&&thick/(x-start)<.1&&corner/total>.8&&!found.some(b=>Math.abs(b.x-start)<g*.3&&Math.abs(b.y-y)<g*.3))found.push({x:start,y,width:x-start});
   }
   start=null;
  }
 }
 return found;
}
