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
