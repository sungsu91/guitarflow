// Document edges are measured on a small image. Original pixels are retained
// for perspective sampling; no generative sharpening or missing-ink repair.
export const fullPaperQuad=()=>[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];

export function dominantPaperQuad(rgba,width,height){
 const stride=width+1,sum=new Float64Array(stride*(height+1)),sq=new Float64Array(sum.length),center=[];
 for(let y=0;y<height;y++){let s=0,s2=0;for(let x=0;x<width;x++){const p=(y*width+x)*4,v=rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114;s+=v;s2+=v*v;sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+s;sq[(y+1)*stride+x+1]=sq[y*stride+x+1]+s2;if(x>width*.3&&x<width*.7&&y>height*.25&&y<height*.75&&x%5===0&&y%5===0)center.push(v);}}
 const light=median(center),mask=new Uint8Array(width*height),visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
 const box=(a,x0,y0,x1,y1)=>a[y1*stride+x1]-a[y0*stride+x1]-a[y1*stride+x0]+a[y0*stride+x0];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const x0=Math.max(0,x-3),y0=Math.max(0,y-3),x1=Math.min(width,x+4),y1=Math.min(height,y+4),n=(x1-x0)*(y1-y0),mean=box(sum,x0,y0,x1,y1)/n,variance=box(sq,x0,y0,x1,y1)/n-mean*mean,p=(y*width+x)*4;
  const color=Math.max(rgba[p],rgba[p+1],rgba[p+2])-Math.min(rgba[p],rgba[p+1],rgba[p+2]);
  mask[y*width+x]=mean>light*.66&&variance<24**2&&color<Math.max(30,mean*.24)?1:0;
 }
 let best=[];
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||visited[start])continue;
  let head=0,tail=1;queue[0]=start;visited[start]=1;let central=0;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);if(x>width*.25&&x<width*.75&&y>height*.2&&y<height*.8)central++;
   for(const q of [x? p-1:-1,x+1<width?p+1:-1,y?p-width:-1,y+1<height?p+width:-1])if(q>=0&&mask[q]&&!visited[q]){visited[q]=1;queue[tail++]=q;}
  }
  if(tail>best.length&&central>width*height*.10)best=Array.from(queue.subarray(0,tail));
 }
 if(best.length<width*height*.28)return null;
 const rows=new Map();for(const p of best){const y=Math.floor(p/width),x=p%width;if(y%3!==0&&y!==height-1)continue;const r=rows.get(y)??[width,0];r[0]=Math.min(r[0],x);r[1]=Math.max(r[1],x);rows.set(y,r);}
 const points=[...rows].flatMap(([y,xs])=>xs.map(x=>({x,y}))).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const hull=[];for(const p of points){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}const lower=hull.length;
 for(let i=points.length-2;i>=0;i--){const p=points[i];while(hull.length>lower&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}hull.pop();
 while(hull.length>4){let at=0,cost=Infinity;for(let i=0;i<hull.length;i++){const a=hull[(i+hull.length-1)%hull.length],b=hull[i],c=hull[(i+1)%hull.length],value=Math.abs(cross(a,b,c));if(value<cost){cost=value;at=i;}}hull.splice(at,1);}
 if(hull.length!==4)return null;
 const start=hull.reduce((best,p,i)=>p.x/width+p.y/height<hull[best].x/width+hull[best].y/height?i:best,0),ordered=[...hull.slice(start),...hull.slice(0,start)],cx=ordered.reduce((s,p)=>s+p.x,0)/4,cy=ordered.reduce((s,p)=>s+p.y,0)/4;
 const quad=ordered.map(p=>({x:clamp((p.x+(p.x<cx?-5:5))/width,0,1),y:clamp((p.y+(p.y<cy?-5:5))/height,0,1)}));
 return validPaperQuad(quad)?{quad,detected:true,confidence:best.length/(width*height),method:'paper-component'}:null;
}

export function validPaperQuad(q){
 if(!Array.isArray(q)||q.length!==4||q.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 let area=0;
 for(let i=0;i<4;i++){
  const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
  if((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)<=.001)return false;
  if(Math.hypot(a.x-b.x,a.y-b.y)<.08)return false;
  area+=a.x*b.y-b.x*a.y;
 }
 return area/2>=.12;
}

export function detectPaperQuad(rgba,width,height){
 const candidate=dominantPaperQuad(rgba,width,height);
 if(!candidate)return {quad:fullPaperQuad(),detected:false,confidence:0};
 const q=candidate.quad;
 // A partially photographed edge or a shadow is not permission to cut inward.
 // Extend the other endpoint when an edge exits the frame.
 for(const [a,b,key,edge] of [[0,1,'y',0],[3,2,'y',1],[0,3,'x',0],[1,2,'x',1]]){
  const near=p=>Math.abs(p[key]-edge);
  if(Math.min(near(q[a]),near(q[b]))<.015&&Math.max(near(q[a]),near(q[b]))<.20)q[a][key]=q[b][key]=edge;
 }
 const area=q.reduce((s,p,i)=>s+p.x*q[(i+1)%4].y-q[(i+1)%4].x*p.y,0)/2;
 if(!validPaperQuad(q)||area<.45)return {quad:fullPaperQuad(),detected:false,confidence:0};
 const detected=q.some((p,i)=>Math.hypot(p.x-fullPaperQuad()[i].x,p.y-fullPaperQuad()[i].y)>.025);
 return {...candidate,quad:detected?q:fullPaperQuad(),detected};
}

function projective(q){
 const [a,b,c,d]=q,dx=b.x-c.x,dy=b.y-c.y,ex=d.x-c.x,ey=d.y-c.y,sx=a.x-b.x+c.x-d.x,sy=a.y-b.y+c.y-d.y,det=dx*ey-ex*dy;
 const g=Math.abs(det)>1e-10?(sx*ey-ex*sy)/det:0,h=Math.abs(det)>1e-10?(dx*sy-sx*dy)/det:0;
 return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h];
}

export function warpPaperPixels(rgba,width,height,quad,{maxPixels=6000000,maxSide=3000}={}){
 if(!validPaperQuad(quad))throw Error('악보 영역의 네 모서리를 순서대로 맞춰 주세요.');
 if(quad.every((p,i)=>p.x===fullPaperQuad()[i].x&&p.y===fullPaperQuad()[i].y)&&width<=maxSide&&height<=maxSide&&width*height<=maxPixels)return {data:rgba,width,height};
 const q=quad.map(p=>({x:p.x*(width-1),y:p.y*(height-1)})),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 let w=Math.max(dist(q[0],q[1]),dist(q[3],q[2])),h=Math.max(dist(q[0],q[3]),dist(q[1],q[2]));
 const scale=Math.min(1,maxSide/Math.max(w,h),Math.sqrt(maxPixels/(w*h)));w=Math.max(2,Math.round(w*scale));h=Math.max(2,Math.round(h*scale));
 const out=new Uint8ClampedArray(w*h*4),m=projective(q);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),den=m[6]*u+m[7]*v+1,px=clamp((m[0]*u+m[1]*v+m[2])/den,0,width-1),py=clamp((m[3]*u+m[4]*v+m[5])/den,0,height-1),x0=Math.floor(px),y0=Math.floor(py),fx=px-x0,fy=py-y0,x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),p=(y*w+x)*4;
  for(let ch=0;ch<3;ch++)out[p+ch]=(rgba[(y0*width+x0)*4+ch]*(1-fx)+rgba[(y0*width+x1)*4+ch]*fx)*(1-fy)+(rgba[(y1*width+x0)*4+ch]*(1-fx)+rgba[(y1*width+x1)*4+ch]*fx)*fy;
  out[p+3]=255;
 }
 return {data:out,width:w,height:h};
}

export function enhancePaperPixels(rgba,width,height){
 // Estimate illumination from a coarse upper-percentile field. Unlike a hard
 // threshold, this preserves thin lines and anti-aliased dots and numerals.
 const step=Math.max(24,Math.round(Math.min(width,height)/20)),nx=Math.ceil(width/step),ny=Math.ceil(height/step),field=new Float32Array(nx*ny);
 for(let gy=0;gy<ny;gy++)for(let gx=0;gx<nx;gx++){
  const values=[];
  for(let y=gy*step;y<Math.min(height,(gy+1)*step);y+=2)for(let x=gx*step;x<Math.min(width,(gx+1)*step);x+=2){const p=(y*width+x)*4;values.push(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
  values.sort((a,b)=>a-b);field[gy*nx+gx]=values[Math.floor(values.length*.85)]??255;
 }
 const out=new Uint8ClampedArray(rgba.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const gx=clamp(x/step-.5,0,nx-1),gy=clamp(y/step-.5,0,ny-1),ix=Math.floor(gx),iy=Math.floor(gy),jx=Math.min(nx-1,ix+1),jy=Math.min(ny-1,iy+1),fx=gx-ix,fy=gy-iy;
  const background=(field[iy*nx+ix]*(1-fx)+field[iy*nx+jx]*fx)*(1-fy)+(field[jy*nx+ix]*(1-fx)+field[jy*nx+jx]*fx)*fy,p=(y*width+x)*4,gray=rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114;
  const value=clamp((gray/Math.max(50,background)*255-255)*1.45+255,0,255);
  out[p]=out[p+1]=out[p+2]=value;out[p+3]=255;
 }
 return out;
}
