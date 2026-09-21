// Interpolate in engraved coordinates using the audio clock, never a UI timer.
export function rhythmAnchors(points){
 // Simultaneous voices/chord tones occupy one common time position.
 const unique=new Map();
 for(const point of [...points].sort((a,b)=>a.tick-b.tick))if(Number.isFinite(point.tick)&&Number.isFinite(point.x)&&!unique.has(point.tick))unique.set(point.tick,point);
 return [...unique.values()];
}
export function playheadX(points,tick){
 if(!points.length)return 0;
 if(tick<=points[0].tick)return points[0].x;
 for(let i=1;i<points.length;i++)if(tick<=points[i].tick){const a=points[i-1],b=points[i];return a.x+(b.x-a.x)*Math.max(0,Math.min(1,(tick-a.tick)/(b.tick-a.tick||1)));}
 return points.at(-1).x;
}
