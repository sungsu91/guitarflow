import {detectStaffs} from '../src/pdf/tab-import/geometry.js';

// Recover notation ink from a photographic/coloured background, using five
// measured parallel rules as evidence. This never draws rules or noteheads.
// Ordinary dark notation on white paper returns null and keeps its old pixels.
export function normalizeNotationColors(rgba,width,height){
 let colored=0;
 for(let i=0;i<rgba.length;i+=64)if(Math.max(rgba[i],rgba[i+1],rgba[i+2])-Math.min(rgba[i],rgba[i+1],rgba[i+2])>25)colored++;
 if(colored<width*height/16*.04)return null;
 const candidates=[];
 for(const radius of [...new Set([Math.max(2,Math.round(width/700)),Math.max(3,Math.round(width/400)),Math.max(4,Math.round(width/260))])]){
 const masks=[new Uint8Array(width*height),new Uint8Array(width*height)];
 for(let y=radius;y<height-radius;y++)for(let x=0;x<width;x++){
  const n=y*width+x,i=n*4,a=(n-radius*width)*4,b=(n+radius*width)*4;
  let bright=0,dark=0;
  for(let c=0;c<3;c++){bright=Math.max(bright,Math.min(rgba[i+c]-rgba[a+c],rgba[i+c]-rgba[b+c]));dark=Math.max(dark,Math.min(rgba[a+c]-rgba[i+c],rgba[b+c]-rgba[i+c]));}
  masks[0][n]=bright>18?1:0;masks[1][n]=dark>18?1:0;
 }
 candidates.push(...masks.flatMap((mask,polarity)=>detectStaffs(mask,width,height,undefined,5).map(s=>({...s,polarity,radius}))));
 }
 const staffs=[];
 for(const staff of candidates.sort((a,b)=>a.y-b.y)){
  const same=staffs.find(s=>Math.abs(s.y-staff.y)<Math.max(s.spacing,staff.spacing));
  if(!same)staffs.push(staff);
  else if(staff.width>same.width)staffs[staffs.indexOf(same)]=staff;
 }
 if(!staffs.length)return null;
 const output=new Uint8ClampedArray(rgba.length).fill(255),evidence=[];
 for(let n=0;n<staffs.length;n++){
  const staff=staffs[n],g=staff.spacing,samples=[[],[],[]];
  for(const y of staff.lines)for(let x=staff.x;x<=staff.x+staff.width;x++){
   const i=(y*width+x)*4,a=((y-staff.radius)*width+x)*4,b=((y+staff.radius)*width+x)*4,sign=staff.polarity?-1:1;
   if([0,1,2].some(c=>Math.min(sign*(rgba[i+c]-rgba[a+c]),sign*(rgba[i+c]-rgba[b+c]))>18))for(let c=0;c<3;c++)samples[c].push(rgba[i+c]);
  }
  if(samples[0].length<staff.width*2)continue;
  const rgb=samples.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]);
  const top=Math.max(0,Math.floor(staff.y-g*5),n?Math.ceil((staffs[n-1].y+staffs[n-1].height+staff.y)/2):0);
  const bottom=Math.min(height,Math.ceil(staff.y+staff.height+g*5),staffs[n+1]?Math.floor((staff.y+staff.height+staffs[n+1].y)/2):height);
  const left=Math.max(0,Math.floor(staff.x-g*3)),right=Math.min(width,Math.ceil(staff.x+staff.width+g));
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   const i=(y*width+x)*4;
   const span=Math.max(...rgb)-Math.min(...rgb),lo=Math.min(rgba[i],rgba[i+1],rgba[i+2]),chroma=Math.max(rgba[i],rgba[i+1],rgba[i+2])-lo;
   // Rules can be translucent/antialiased while noteheads have full ink.
   // Matching their exact RGB would hollow out filled quarter/eighth notes.
   const distance=span<28?Math.max(0,...rgb.map((v,c)=>staff.polarity?rgba[i+c]-v:v-rgba[i+c]),chroma):
    Math.max(Math.max(...rgb.map((v,c)=>Math.abs((rgba[i+c]-lo)/Math.max(1,chroma)-(v-Math.min(...rgb))/span)))*255,Math.max(0,span*.7-chroma)*2);
   const value=Math.round(Math.max(0,Math.min(255,(distance-18)*255/45)));
   output[i]=output[i+1]=output[i+2]=value;
  }
  evidence.push({y:staff.y,spacing:g,rgb,polarity:staff.polarity?'dark':'light',top,bottom});
 }
 return evidence.length?{rgba:output,evidence:{method:'measured-rule-ink-colors',staffs:evidence}}:null;
}

