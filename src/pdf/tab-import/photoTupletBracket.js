const bands=values=>{const out=[];for(const v of values){const last=out.at(-1);if(last&&v-last.at(-1)===1)last.push(v);else out.push([v]);}return out;};
// A photographed triplet bracket can touch the outer stems and look like a
// second beam. Require a continuous main beam, two hooked bracket arms and a
// separate central numeral. OCR must still agree before changing any rhythm.
export function findPhotoTupletBrackets(rgba,ink,width,height,staff){
 const found=[],g=staff.spacing,pixel=(x,y)=>x>=0&&x<width&&y>=0&&y<height?ink[Math.round(y)*width+Math.round(x)]:0;
 for(const [mi,m] of staff.measures.entries())for(let i=0;i<m.rhythm.length-2;i++){
  const group=m.rhythm.slice(i,i+3),[a,b,c]=group;
  if(group.some(r=>r.direction!==1||!r.beamCount||r.rest||r.tuplet))continue;
  if(Math.abs((b.x-a.x)-(c.x-b.x))>g*.6||c.x-a.x<g*2.2)continue;
  const center=(a.x+c.x)/2,full=[];
  for(let y=Math.floor(Math.min(...group.map(r=>r.y))-g*.65);y<=Math.max(...group.map(r=>r.y))+g*.1;y++){
   let count=0,total=0;for(let x=Math.ceil(a.x+g*.2);x<=c.x-g*.2;x++){total++;count+=pixel(x,y);}
   if(total&&count/total>=.96)full.push(y);
  }
  const beams=bands(full).filter(v=>v.length>=2&&v.length<g*.5);if(beams.length!==1)continue;
  const beam=beams[0],end=beam.at(-1),rows=[];
  for(let y=Math.ceil(end+g*.12);y<=end+g*.95;y++){
   const xs=[];for(let x=Math.floor(a.x-g*.18);x<=c.x+g*.18;x++)if(pixel(x,y))xs.push(x);
   const arms=bands(xs).filter(v=>v.length>=g*.7);if(arms.length!==2)continue;
   const [left,right]=arms,gap=right[0]-left.at(-1)-1;
   if(Math.abs(left[0]-a.x)>g*.25||Math.abs(right.at(-1)-c.x)>g*.25||gap<g*.25||gap>g*1.4||Math.abs((left.at(-1)+right[0])/2-center)>g*.3)continue;
   const hooked=x=>{let count=0;for(let dy=0;dy<=g*.25;dy++)if([-1,0,1].some(dx=>pixel(x+dx,y-dy)))count++;return count>=g*.2;};
   if(hooked(left[0])&&hooked(right.at(-1)))rows.push({y,left:left.at(-1),right:right[0]});
  }
  if(!rows.length)continue;
  const first=rows[0],last=rows.at(-1);if(last.y-first.y>g*.35)continue;
  const x0=Math.ceil(Math.max(...rows.map(r=>r.left))+1),x1=Math.floor(Math.min(...rows.map(r=>r.right))-1),y0=Math.ceil(end+g*.12),y1=Math.ceil(last.y+g*.15),points=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(pixel(x,y))points.push([x,y]);
  if(!points.length)continue;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x+1,h=Math.max(...ys)-y+1;
  if(w<g*.13||w>g*.65||h<g*.24||h>g*.9||Math.abs(x+w/2-center)>g*.3)continue;
  const grayscale=new Uint8Array(w*h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const p=((y+yy)*width+x+xx)*4;grayscale[yy*w+xx]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
  found.push({id:`photo-triplet-${staff.id}-${mi}-${i}`,x,y,width:w,height:h,cx:center,parts:1,stringDistance:0,grayscale,measure:mi,stems:group.map(r=>r.x),count:3,rhythmOverride:{duration:'8',beamCount:1,y:end,beamYs:[beam[Math.floor(beam.length/2)]],method:'separate-photo-tuplet-bracket'}});
 }
 return found;
}
