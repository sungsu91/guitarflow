// Local contour pulls plus two under-eye masks. All distances use image-height
// units so portrait/landscape cameras and head roll receive the same correction.
export function faceShapeControls(points, aspect = 1) {
  if (!points || ![5,12].includes(points.length) || !Number.isFinite(aspect) || aspect <= 0 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const width = Math.hypot((points[1].x-points[0].x)*aspect, points[1].y-points[0].y);
  if (width < .06 || width > 1.5) return null;
  const center={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
  if (Math.abs((points[4].x-center.x)*aspect)>width*.28) return null;
  const detailed=points.length===12;
  const left=detailed?points[5]:points[0],right=detailed?points[8]:points[1];
  const length=Math.hypot((right.x-left.x)*aspect,right.y-left.y);
  if(length<.02)return null;
  const axis={x:(right.x-left.x)*aspect/length,y:(right.y-left.y)/length};
  const mid=detailed?{x:(left.x+right.x+points[11].x*2)/4,y:(left.y+right.y+points[11].y*2)/4}:center;
  const projection=p=>(p.x-mid.x)*aspect*axis.x+(p.y-mid.y)*axis.y;
  const frontal=detailed && Math.abs(projection(points[4]))<width*.12
    && Number.isFinite(points[0].z) && Number.isFinite(points[1].z)
    && Math.abs(points[0].z-points[1].z)*aspect<width*.18;
  const clamp=v=>Math.max(-width*.012,Math.min(width*.012,v));
  const controls=points.slice(0,4).map((p,i)=>{
    const partner=points[i%2===0?i+1:i-1];
    const balance=frontal?clamp((projection(p)+projection(partner))*.175):0;
    const slim=((p.x-center.x)*aspect*axis.x+(p.y-center.y)*axis.y)*(i<2?.065:.08);
    const delta=slim+balance;
    return {x:p.x,y:1-p.y,dx:delta*axis.x/aspect,dy:-delta*axis.y,radius:width*(i<2?.26:.24)};
  });
  if(detailed) for(const [lid,a,b] of [[9,5,6],[10,7,8]]) {
    const eyeWidth=Math.hypot((points[a].x-points[b].x)*aspect,points[a].y-points[b].y);
    controls.push({x:points[lid].x-axis.y*width*.045/aspect,y:1-points[lid].y-axis.x*width*.045,dx:axis.x,dy:-axis.y,radius:eyeWidth*.62});
  }
  return controls;
}
