// Optical spacing follows the reference sheet. Transport time stays musical:
// interpolate between the rendered event centers using each event's duration.
const POSITIONS = {1:[.42],2:[.16,.64],3:[.10,.39,.66],4:[.08,.30,.52,.74]};
const opticalFractions=beat=>POSITIONS[beat.length] || Array.from({length:beat.length},(_,i)=>.05+i*.84/(beat.length-1));

// Engrave equal-sized groups at the same width, regardless of where a held
// subdivision falls. The count table remains an evenly spaced time grid.
function guideNotePositions(beat,cellTicks=3) {
  const total=beat.reduce((sum,n)=>sum+n.ticks,0);
  // Dense mixed tuplets need evenly spaced count slots to keep every label legible.
  if(total/cellTicks>7.01){let at=0;return beat.map(n=>{const x=15+(at+cellTicks/2)*158/total;at+=n.ticks;return x;});}
  const span={1:0,2:80,3:100,4:120}[beat.length]??140;
  const start=beat.length>4?20:25;
  return beat.map((_,i)=>start+(beat.length>1?i*span/(beat.length-1):0));
}
export function guideCursorX(beat,tick,cellTicks=3) {
  const xs=guideNotePositions(beat,cellTicks);
  let at=0;
  for(let i=0;i<beat.length;i++) {
    const end=at+beat[i].ticks;
    if(tick<end-1e-9) {
      const progress=Math.max(0,Math.min(1,(tick-at)/beat[i].ticks));
      return xs[i]+((xs[i+1]??173)-xs[i])*progress;
    }
    at=end;
  }
  return 173;
}
export function beatPositions(beat, beatIndex, meter, timeAligned=false, cellTicks=3) {
  if(timeAligned)return guideNotePositions(beat,cellTicks).map(x=>x+180*beatIndex);
  const width=316/meter;
  return opticalFractions(beat).map(fraction=>30+(beatIndex+fraction)*width);
}
export function scoreCursorX(measure,meter,position,timeAligned=false,cellTicks=3) {
  if(timeAligned){
    const bi=position.event?.beat??0;
    const before=measure.slice(0,bi).flat().reduce((sum,n)=>sum+n.ticks,0);
    return 180*bi+guideCursorX(measure[bi],position.tick-before,Array.isArray(cellTicks)?cellTicks[bi]:cellTicks);
  }
  const event=position?.event;
  if(!event)return 30;
  const xs=beatPositions(measure[event.beat],event.beat,meter);
  const from=xs[event.index];
  const to=xs[event.index+1] ?? (event.beat+1<meter?beatPositions(measure[event.beat+1],event.beat+1,meter)[0]:351);
  const progress=Math.max(0,Math.min(1,(position.tick-event.at)/event.ticks));
  return from+(to-from)*progress;
}

export function subdivisionTicks(beat) {
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  return beat.reduce((size,n)=>gcd(size,Math.round(n.ticks*35)),0)/35;
}

// Subdivision time advances independently of note onsets (including held notes).
export function subdivisionRegion(beat,beatIndex,meter,position,timeAligned=false,cellTicks=3) {
  const total=beat.reduce((sum,n)=>sum+n.ticks,0);
  const step=timeAligned?cellTicks:subdivisionTicks(beat);
  const count=Math.round(total/step);
  const before=beat.slice(0,position.event.index).reduce((sum,n)=>sum+n.ticks,0);
  const elapsed=position.tick-position.event.at+before;
  const index=Math.max(0,Math.min(count-1,Math.floor((elapsed+1e-8)/step)));
  if(timeAligned){
    const center=guideCursorX(beat,index*step,step);
    const start=index?(guideCursorX(beat,(index-1)*step,step)+center)/2:11.5;
    const end=index+1<count?(center+guideCursorX(beat,(index+1)*step,step))/2:175.5;
    return {index,x:start+180*beatIndex,width:end-start};
  }
  const width=316/meter,left=30+beatIndex*width-6;
  const xs=beatPositions(beat,beatIndex,meter);
  const centers=Array.from({length:count},(_,i)=>{
    const tick=i*step;
    let at=0;
    for(let j=0;j<beat.length;j++) {
      if(tick<at+beat[j].ticks-1e-8) {
        const end=xs[j+1]??left+width;
        return xs[j]+(end-xs[j])*(tick-at)/beat[j].ticks;
      }
      at+=beat[j].ticks;
    }
    return left+width;
  });
  const start=index?(centers[index-1]+centers[index])/2:left;
  const end=index+1<count?(centers[index]+centers[index+1])/2:left+width;
  return {index,x:start,width:end-start};
}
