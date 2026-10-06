// Independent shape evidence for a serif P: one enclosed upper counter, a
// continuous left stem, and no lower bowl/diagonal leg (B/R/D are rejected).
export function hasUppercasePShape({width:w,height:h,grayscale}){
 if(w<5||h<8||w/h<.35||w/h>.95)return false;
 const black=(x,y)=>grayscale[y*w+x]<128,seen=new Set(),holes=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const start=y*w+x;if(seen.has(start)||black(x,y))continue;
  const stack=[start],points=[];let edge=false;seen.add(start);
  while(stack.length){const p=stack.pop(),xx=p%w,yy=Math.floor(p/w);points.push({x:xx,y:yy});edge||=xx===0||xx===w-1||yy===0||yy===h-1;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=xx+dx,ny=yy+dy,id=ny*w+nx;if(nx<0||nx>=w||ny<0||ny>=h||seen.has(id)||black(nx,ny))continue;seen.add(id);stack.push(id);}
  }if(!edge)holes.push(points);
 }
 if(holes.length!==1||holes[0].length<w*h*.045||Math.max(...holes[0].map(p=>p.y))>=h*.6)return false;
 let spine=-1;
 for(let x=0;x<w*.45;x++){let n=0;for(let y=1;y<h-1;y++)if(black(x,y))n++;if(n>=(h-2)*.9)spine=x;}
 if(spine<0)return false;
 for(let y=Math.ceil(h*.62);y<Math.floor(h*.86);y++)for(let x=Math.max(spine+2,Math.ceil(w*.55));x<w;x++)if(black(x,y))return false;
 return true;
}

export function agreeConnectionLabel(reads,label){
 const strong=reads.filter(r=>r.confidence>=.95),text=strong[0]?.text??reads[0]?.text??'';
 const agrees=['H','P'].includes(text)&&strong.length>=2&&strong.every(r=>r.text===text);
 const shapeSupported=!agrees&&text==='P'&&strong.length>=1&&reads.filter(r=>r.text==='P'&&r.confidence>=.85).length>=2&&!reads.some(r=>r.text&&r.text!=='P'&&r.confidence>=.85)&&hasUppercasePShape(label);
 return {text,agrees:agrees||shapeSupported,...(shapeSupported?{shapeEvidence:'upper-counter-left-spine-no-lower-leg'}:{}),reads};
}
