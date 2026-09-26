// Optical spacing follows the reference sheet. Transport time stays musical:
// interpolate between the rendered event centers using each event's duration.
const POSITIONS = {1:[.42],2:[.16,.64],3:[.10,.39,.66],4:[.08,.30,.52,.74]};
export function beatPositions(beat, beatIndex, meter) {
  const width=316/meter;
  return (POSITIONS[beat.length] || Array.from({length:beat.length},(_,i)=>.05+i*.84/(beat.length-1))).map(fraction=>30+(beatIndex+fraction)*width);
}
export function scoreCursorX(measure,meter,position) {
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
  if(timeAligned)return {index,x:15+index*158/count,width:158/count};
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
