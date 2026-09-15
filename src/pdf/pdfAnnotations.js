export const ANNOTATION_COLORS={brown:'#60462f',black:'#202020',red:'#b52c29',blue:'#2565ac',green:'#247449'};
const colorValue=value=>Object.hasOwn(ANNOTATION_COLORS,value)?value:'brown';
const unit=value=>Math.max(0,Math.min(1,value));
export const FULL_PAGE=Object.freeze({x:0,y:0,width:1,height:1});
const marginKeys=['top','right','bottom','left'];
const validMargins=m=>m&&marginKeys.every(k=>Number.isFinite(m[k])&&m[k]>=0)&&m.left+m.right<=.95&&m.top+m.bottom<=.95;
// Legacy crop rectangles describe retained content. New edits store removed edge margins.
export function pageCrop(edit){
 if(validMargins(edit?.margins)){const m=edit.margins;return {x:m.left,y:m.top,width:1-m.left-m.right,height:1-m.top-m.bottom};}
 return rectValid(edit?.crop)?edit.crop:FULL_PAGE;
}
export function removalCrop(selection,edit){
 const c=pageCrop(edit),r=selection;
 if(!r||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0)return null;
 const candidates=[
  {edge:'top',near:Math.abs(r.y-c.y)/c.height,amount:(r.y+r.height-c.y)/c.height},
  {edge:'bottom',near:Math.abs(r.y+r.height-c.y-c.height)/c.height,amount:(c.y+c.height-r.y)/c.height},
  {edge:'left',near:Math.abs(r.x-c.x)/c.width,amount:(r.x+r.width-c.x)/c.width},
  {edge:'right',near:Math.abs(r.x+r.width-c.x-c.width)/c.width,amount:(c.x+c.width-r.x)/c.width},
 ].filter(v=>v.near<=.03&&v.amount>0&&v.amount<1).sort((a,b)=>a.amount-b.amount);
 for(const {edge} of candidates){
  const m={top:c.y,right:1-c.x-c.width,bottom:1-c.y-c.height,left:c.x};let removed;
  if(edge==='top'){m.top=r.y+r.height;removed={...c,height:m.top-c.y};}
  if(edge==='bottom'){m.bottom=1-r.y;removed={...c,y:r.y,height:c.y+c.height-r.y};}
  if(edge==='left'){m.left=r.x+r.width;removed={...c,width:m.left-c.x};}
  if(edge==='right'){m.right=1-r.x;removed={...c,x:r.x,width:c.x+c.width-r.x};}
  // Round floating-point residuals at page boundaries, not the user's coordinates.
  for(const key of marginKeys)m[key]=Math.max(0,m[key]);
  if(validMargins(m))return {edge,margins:m,removed};
 }
 return null;
}
const rectValid=r=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>=.05&&r.height>=.05&&r.x+r.width<=1.001&&r.y+r.height<=1.001;
export function normalizePageEdits(source,count){
 const result={};
 for(const [page,value] of Object.entries(source??{})){
  if(!Number.isInteger(Number(page))||Number(page)<1||Number(page)>count||!value||typeof value!=='object')continue;
  const crop=rectValid(value.crop)?Object.fromEntries(['x','y','width','height'].map(k=>[k,value.crop[k]])):null;
  const notes=(Array.isArray(value.notes)?value.notes:[]).filter(n=>n&&typeof n.id==='string'&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1).slice(0,200).map(n=>({id:n.id,text:String(n.text??'').slice(0,1000),x:n.x,y:n.y,size:Math.max(.015,Math.min(.08,Number(n.size)||.035)),color:colorValue(n.color),...(Number.isFinite(n.rotation)?{rotation:n.rotation}:{})}));
  const strokes=(Array.isArray(value.strokes)?value.strokes:[]).filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.points)).slice(0,1000).map(s=>({id:s.id,points:s.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).slice(0,20000).map(p=>p.map(unit)),color:colorValue(s.color),width:Math.max(.0005,Math.min(.02,Number(s.width)||.003)),opacity:Math.max(.1,Math.min(1,Number(s.opacity)||1))})).filter(s=>s.points.length>0);
  result[page]={crop,notes,...(strokes.length?{strokes}:{}),...(validMargins(value.margins)?{margins:Object.fromEntries(marginKeys.map(k=>[k,value.margins[k]]))}:{})};
 }
 return result;
}
export function projectRect(rect,crop=FULL_PAGE){return {...rect,x:(rect.x-crop.x)/crop.width,y:(rect.y-crop.y)/crop.height,width:rect.width/crop.width,height:rect.height/crop.height};}
export function originalPoint(point,crop=FULL_PAGE){return {x:crop.x+point.x*crop.width,y:crop.y+point.y*crop.height};}

export function cropMargins(rect){return {top:rect.y,right:Math.max(0,1-rect.x-rect.width),bottom:Math.max(0,1-rect.y-rect.height),left:rect.x};}
export function resizeCrop(rect,handle,point,bounds=FULL_PAGE){
 let l=rect.x,r=rect.x+rect.width,t=rect.y,b=rect.y+rect.height;
 if(handle.includes('w'))l=Math.max(bounds.x,Math.min(r-.05,point.x));
 if(handle.includes('e'))r=Math.min(bounds.x+bounds.width,Math.max(l+.05,point.x));
 if(handle.includes('n'))t=Math.max(bounds.y,Math.min(b-.05,point.y));
 if(handle.includes('s'))b=Math.min(bounds.y+bounds.height,Math.max(t+.05,point.y));
 return {x:l,y:t,width:r-l,height:b-t};
}
export function moveStroke(stroke,dx,dy){
 const xs=stroke.points.map(p=>p[0]),ys=stroke.points.map(p=>p[1]);
 dx=Math.max(-Math.min(...xs),Math.min(1-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(1-Math.max(...ys),dy));
 return {...stroke,points:stroke.points.map(([x,y])=>[x+dx,y+dy])};
}
