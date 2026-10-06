import {runs} from './geometry.js';

// Piano barlines continue through the gap between the hands. Ordinary stem
// rejection intentionally excludes these extensions, so require evidence from
// BOTH complete staves and the intervening pixels before recovering a boundary.
export function notationStaffConnections(ink,width,staffs){
 const connections=[];
 for(let i=0;i<staffs.length-1;i++){
  const upper=staffs[i],lower=staffs[i+1],g=Math.max(upper.spacing,lower.spacing);
  const gap=lower.y-upper.y-upper.height;
  if(gap<g*2||gap>g*24||Math.abs(upper.spacing-lower.spacing)>g*.2||Math.abs(upper.x-lower.x)>g*2||Math.abs(upper.width-lower.width)>g*2)continue;
  const columns=[],top=upper.lines[0],bottom=lower.lines.at(-1);
  for(let x=Math.ceil(Math.max(upper.x,lower.x));x<=Math.min(upper.x+upper.width,lower.x+lower.width);x++){
   let count=0;for(let y=top;y<=bottom;y++)count+=ink[y*width+x]??0;
   if(count/(bottom-top+1)>.98)columns.push(x);
  }
  const bars=runs(columns,Math.ceil(g*.45)).filter(xs=>xs.at(-1)-xs[0]<g*.8).map(xs=>xs[Math.floor(xs.length/2)]);
  // A left system connector alone can join unrelated instruments. Require
  // another continuous barline beyond the clef area, never proximity alone.
  if(bars.length>=2&&bars.some(x=>x>upper.x+g*6))connections.push({upper:i,lower:i+1,bars});
 }
 return connections;
}
