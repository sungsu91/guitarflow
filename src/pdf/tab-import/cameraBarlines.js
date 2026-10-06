// The local paper warp straightens rules but may leave barlines slightly
// slanted. Trace continuous ink from the first to the last rule, including
// the extension/side-stroke checks used for vertical separators.
export function cameraBarlineColumns(ink,width,staff,known=[],ruleInk=ink){
 const g=staff.spacing,top=staff.lines[0],bottom=staff.lines.at(-1),h=bottom-top,mid=(top+bottom)/2,limit=Math.floor(g*.45),found=[];
 const pixel=(x,y)=>ink[Math.round(y)*width+Math.round(x)]??0;
 // A notation beam can masquerade as a sixth ruled line in a rotated image.
 // Every TAB rule, including the two outer rules, must span the same system.
 for(const line of staff.lines){
  let support=0,total=0;
  for(let x=Math.ceil(staff.x);x<=staff.x+staff.width;x++){
   let dark=0;for(let dy=-Math.ceil(staff.thickness/2);dy<=Math.ceil(staff.thickness/2);dy++)dark|=ruleInk[Math.round(line+dy)*width+x]??0;
   support+=dark;total++;
  }
  if(!total||support/total<.7)return [];
 }
 for(let x=Math.ceil(staff.x+g);x<staff.x+staff.width-g;x++){
  if(known.some(k=>Math.abs(k-x)<g*.6)||!pixel(x,mid))continue;
  for(let drift=-limit;drift<=limit;drift++){
   if(Math.abs(drift)<2)continue;
   const slope=drift/h,at=y=>x+(y-mid)*slope;
   let count=0;for(let y=top;y<=bottom;y++)count+=pixel(at(y),y);
   if(count/(h+1)<=.97)continue;
   let extension=0;for(const [edge,sign] of [[bottom,1],[top,-1]])for(let k=2;k<g*.75;k++){if(!pixel(at(edge+k*sign),edge+k*sign))break;extension++;}
   if(extension>=g*.25)continue;
   let side=0,total=0;
   for(let y=top+2;y<bottom-2;y++){
    if(staff.lines.some(line=>Math.abs(line-y)<g*.22))continue;
    for(let dx=Math.ceil(g*.15);dx<g*.43;dx++)for(const sign of [-1,1]){side+=pixel(at(y)+sign*dx,y);total++;}
   }
   if(total&&side/total>=.25)continue;
   found.push(x);break;
  }
 }
 return found;
}
