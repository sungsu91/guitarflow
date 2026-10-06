// A failed piano bar may contain a stem whose flag/beam is outside the usual
// crop. Extend only when a long, continuous stroke crosses that exact edge.
// Text, empty margins and incomplete rhythms alone do not authorize retries.
export function pianoCropEdges(system,index){
 const g=system.staff.spacing,box=system.measures[index],w=system.width;
 const main=new Uint8ClampedArray(system.rgba),below=new Uint8ClampedArray(system.extension??0),above=new Uint8ClampedArray(system.pianoTop??0);
 const pixel=(x,y)=>{
  if(x<0||x>=w||y<-(system.pianoTopHeight??0)||y>=system.height+(system.extensionHeight??0))return false;
  const data=y<0?above:y<system.height?main:below,row=y<0?y+system.pianoTopHeight:y<system.height?y:y-system.height,i=(row*w+x)*4;
  return data[i]*.299+data[i+1]*.587+data[i+2]*.114<180;
 };
 const crossed=(edge,side)=>{
  for(let x=Math.ceil(box.x-system.rect.x+g);x<box.x+box.width-system.rect.x-g;x++){
   let hit=0,total=0,outer=0;
   for(let t=-Math.ceil(g*.85);t<=Math.ceil(g*.25);t++){total++;const dark=pixel(x,Math.round(edge+side*t));hit+=dark;outer+=t>1&&dark?1:0;}
   if(hit/total>.9&&outer>=Math.max(2,g*.15))return true;
  }
  return false;
 };
 const top=Math.max(0,Math.floor(system.staff.y-g*3.5)-system.rect.y),bottom=Math.ceil(system.staff.y+system.staff.height+g*4)-system.rect.y;
 return {top:crossed(top,-1),bottom:crossed(bottom,1)};
}
