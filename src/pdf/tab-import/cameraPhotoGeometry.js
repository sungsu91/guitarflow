import {TAB_IMPORT_CONFIG as C} from './config.js';

const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];

// JPEG downsampling can leave one ruled line lighter than the fixed ink gate.
// Its local vertical contrast is still present. This mask locates rules only:
// numeral/beam pixels and their confidence gates are never brightened or guessed.
export function faintStaffRulePixels(rgba,width,height){
  const gray=new Uint8Array(width*height),rules=new Uint8Array(gray.length);
  for(let p=0;p<gray.length;p++)gray[p]=Math.round(rgba[p*4]*.299+rgba[p*4+1]*.587+rgba[p*4+2]*.114);
  const offset=Math.max(2,Math.round(width/350));
  for(let y=offset;y<height-offset;y++)for(let x=0;x<width;x++){
    const p=y*width+x,value=gray[p];
    rules[p]=value<254&&Math.min(gray[p-offset*width],gray[p+offset*width])-value>=2?1:0;
  }
  return rules;
}

// Local paper brightness, not a fixed white-paper threshold. Two sliding sums
// keep memory bounded; neither the page nor individual music glyphs are blurred.
export function normalizePhotoPaper(rgba,width,height,{gain=8}={}){
  const gray=new Uint8Array(width*height),horizontal=new Uint16Array(gray.length);
  const radius=Math.max(12,Math.round(width/87)),diameter=radius*2+1;
  for(let p=0;p<gray.length;p++)gray[p]=Math.round(rgba[p*4]*.299+rgba[p*4+1]*.587+rgba[p*4+2]*.114);
  for(let y=0;y<height;y++){
    const row=y*width;let sum=0;
    for(let x=-radius;x<=radius;x++)sum+=gray[row+Math.max(0,Math.min(width-1,x))];
    for(let x=0;x<width;x++){horizontal[row+x]=sum;sum+=gray[row+Math.min(width-1,x+radius+1)]-gray[row+Math.max(0,x-radius)];}
  }
  const output=new Uint8ClampedArray(rgba.length);
  for(let x=0;x<width;x++){
    let sum=0;for(let y=-radius;y<=radius;y++)sum+=horizontal[Math.max(0,Math.min(height-1,y))*width+x];
    for(let y=0;y<height;y++){
      const p=y*width+x,background=sum/(diameter*diameter);
      const value=255-Math.max(0,background-gray[p]-2)*gain;
      for(let ch=0;ch<3;ch++)output[p*4+ch]=value;
      output[p*4+3]=255;
      sum+=horizontal[Math.min(height-1,y+radius+1)*width+x]-horizontal[Math.max(0,y-radius)*width+x];
    }
  }
  return output;
}

function gridsAt(rgba,width,height,left,right,count){
  const projection=new Float32Array(height),lines=[];
  for(let y=0;y<height;y++)for(let x=left;x<right;x++){
    const p=(y*width+x)*4;
    if(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114<220)projection[y]++;
  }
  for(let y=1;y<height-1;y++){
    if(projection[y]<(right-left)*.30)continue;
    const start=y;let weighted=0,total=0;
    while(y<height&&projection[y]>=(right-left)*.30){weighted+=y*projection[y];total+=projection[y];y++;}
    if(y-start<=Math.max(8,width/170))lines.push(weighted/total);
  }
  const grids=[];
  for(let i=0;i<=lines.length-count;i++){
    const ys=lines.slice(i,i+count),spacing=(ys.at(-1)-ys[0])/(count-1);
    if(spacing<8||spacing>65||ys.some((y,j)=>Math.abs(y-ys[0]-j*spacing)>spacing*.18))continue;
    if([lines[i-1],lines[i+count]].some((y,j)=>y!==undefined&&Math.abs(y-(j?ys.at(-1)+spacing:ys[0]-spacing))<spacing*.2))continue;
    grids.push({x:(left+right)/2,top:ys[0],spacing,center:(ys[0]+ys.at(-1))/2,lines:ys});i+=count-1;
  }
  return grids;
}

export function photoStaffTracks(rgba,width,height,count=6){
  const step=Math.max(48,Math.round(width/24)),tracks=[];
  for(let left=0;left+step<=width;left+=step){
    for(const grid of gridsAt(rgba,width,height,left,left+step,count)){
      const matches=tracks.filter(track=>{const last=track.at(-1);return grid.x-last.x<=step*6&&Math.abs(grid.center-last.center)<grid.spacing*1.5&&Math.abs(grid.spacing-last.spacing)<grid.spacing*.15;});
      if(matches.length===1)matches[0].push(grid);else if(!matches.length)tracks.push([grid]);
    }
  }
  return tracks.filter(t=>t.length>=4&&t.at(-1).x-t[0].x>=Math.max(width*.22,median(t.map(p=>p.spacing))*22)).map(points=>({points,center:Math.round(median(points.map(p=>p.center))),spacing:Math.round(median(points.map(p=>p.spacing)))})).sort((a,b)=>a.center-b.center);
}

function sampleTrack(track,x){
  const points=track.points;
  let i=0;while(i<points.length-2&&points[i+1].x<x)i++;
  const a=points[i],b=points[i+1],f=Math.max(-1,Math.min(2,(x-a.x)/(b.x-a.x)));
  return {center:a.center+(b.center-a.center)*f,spacing:a.spacing+(b.spacing-a.spacing)*f,lines:a.lines.map((y,j)=>y+(b.lines[j]-y)*f)};
}

export function rectifyPhotoStaffs(rgba,width,height,tracks){
  const output=new Uint8ClampedArray(rgba.length).fill(255);
  for(let x=0;x<width;x++){
    const samples=tracks.map(t=>sampleTrack(t,x));let index=0;
    for(let y=0;y<height;y++){
      while(index<tracks.length-1&&y>(tracks[index].center+tracks[index+1].center)/2)index++;
      const track=tracks[index],sample=samples[index],offset=(y-track.center)/track.spacing+(sample.lines.length-1)/2;
      const segment=Math.max(0,Math.min(sample.lines.length-2,Math.floor(offset))),sy=sample.lines[segment]+(sample.lines[segment+1]-sample.lines[segment])*(offset-segment);
      if(sy<0||sy>=height-1)continue;
      const y0=Math.floor(sy),f=sy-y0,p=(y*width+x)*4,a=(y0*width+x)*4,b=a+width*4;
      for(let ch=0;ch<3;ch++)output[p+ch]=rgba[a+ch]*(1-f)+rgba[b+ch]*f;
    }
  }
  return output;
}

// A flat scan with a small rotation needs one uniform deskew, not independent
// curved-paper warps. Infer the slope from several samples of a real six-line
// staff; text baselines and note stems cannot supply this evidence.
export function straightScanTrack(tracks,width,height){
  const fits=tracks.filter(t=>t.points.at(-1).x-t.points[0].x>width*.45).flatMap(t=>{
    const ps=t.points,mx=ps.reduce((n,p)=>n+p.x,0)/ps.length,my=ps.reduce((n,p)=>n+p.center,0)/ps.length;
    const slope=ps.reduce((n,p)=>n+(p.x-mx)*(p.center-my),0)/ps.reduce((n,p)=>n+(p.x-mx)**2,0);
    const residual=Math.max(...ps.map(p=>Math.abs(p.center-my-slope*(p.x-mx))));
    return residual<t.spacing*.15&&ps.every(p=>Math.abs(p.spacing-t.spacing)<t.spacing*.08)?[{slope,spacing:t.spacing}]:[];
  });
  if(!fits.length)return null;
  const slope=median(fits.map(f=>f.slope));
  if(Math.abs(slope)<.003||Math.abs(slope)>.07||fits.some(f=>Math.abs(f.slope-slope)>.003))return null;
  const spacing=median(fits.map(f=>f.spacing)),center=Math.round(height/2),count=tracks[0].points[0].lines?.length??6;
  return {center,spacing,points:[0,width-1].map(x=>({x,center:center+slope*(x-width/2),spacing,lines:Array.from({length:count},(_,i)=>center+(i-(count-1)/2)*spacing+slope*(x-width/2))}))};
}

export function rectifyStraightScan(rgba,width,height,track){
  const [a,b]=track.points,angle=Math.atan2(b.center-a.center,b.x-a.x),cos=Math.cos(angle),sin=Math.sin(angle),cx=width/2,cy=height/2;
  const output=new Uint8ClampedArray(rgba.length).fill(255);
  // Rotate both axes. A y-only shear straightens TAB rules but leaves thin
  // barlines leaning, which can silently merge several measures into one.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const sx=cx+cos*(x-cx)-sin*(y-cy),sy=cy+sin*(x-cx)+cos*(y-cy);
    if(sx<0||sx>=width-1||sy<0||sy>=height-1)continue;
    const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,p=(y*width+x)*4,q=(iy*width+ix)*4;
    for(let ch=0;ch<3;ch++)output[p+ch]=(rgba[q+ch]*(1-fx)+rgba[q+4+ch]*fx)*(1-fy)+(rgba[q+width*4+ch]*(1-fx)+rgba[q+width*4+4+ch]*fx)*fy;
  }
  return {rgba:output,angle};
}

export const CAMERA_TAB_CONFIG=Object.freeze({...C,minStaffWidth:.22,cleanPhotoGlyphs:true,detachedRhythm:true});
