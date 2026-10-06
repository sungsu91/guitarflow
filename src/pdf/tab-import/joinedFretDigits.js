// A thin TAB rule can join two numerals without joining their actual ink.
// Require two tall glyphs separated by white columns outside that rule. This
// supplies only component count; the independent OCR passes still read digits.
export function joinedFretSplit(candidate,staff){
 const c=candidate,g=staff.spacing;
 if(c.parts!==1||!c.bitmap||c.width<g*.85||c.width>g*1.35||c.stringDistance>.18)return null;
 const line=staff.lines[c.string-1]-c.y,mask=Math.ceil(staff.thickness/2)+1;
 const occupied=Array.from({length:c.width},(_,x)=>Array.from({length:c.height},(_,y)=>y).some(y=>Math.abs(y-line)>mask&&c.bitmap[y*c.width+x]));
 const gaps=[];
 for(let x=1;x<c.width-1;x++)if(!occupied[x]){const last=gaps.at(-1);if(last&&last.at(-1)===x-1)last.push(x);else gaps.push([x]);}
 for(const gap of gaps){
  if(gap.length<Math.max(2,g*.08)||gap.length>g*.35||gap[0]<g*.13||c.width-gap.at(-1)-1<g*.13)continue;
  const sides=[[0,gap[0]-1],[gap.at(-1)+1,c.width-1]];
  if(sides.every(([a,b])=>{
   const points=[];for(let y=0;y<c.height;y++)for(let x=a;x<=b;x++)if(Math.abs(y-line)>mask&&c.bitmap[y*c.width+x])points.push([x,y]);
   if(!points.length)return false;
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
   return w>=g*.13&&w<=g*.8&&h>=c.height*.8;
  }))return {start:gap[0],end:gap.at(-1),method:'two-glyphs-across-tab-rule'};
 }
 return null;
}
