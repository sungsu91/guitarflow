// Public positions retain the original 12 ticks/quarter storage format.
// All arithmetic is performed on the exact 420-unit quarter grid (LCM 4,3,5,6,7).
export const UNITS_PER_TICK = 35;
export const QUARTER_UNITS = 420;
export const units = n => Math.round(n.ticks * UNITS_PER_TICK);
export const writtenTicks = n => n.written ?? (n.ticks === 4 ? 6 : n.ticks);
export function tuplet(count, rests = [], half = false) {
  const written = count === 3 && !half ? 6 : 3;
  const normal = count === 3 ? 2 : 4;
  return Array.from({length:count}, (_,i)=>({ticks:written*normal/count, written, rest:rests.includes(i), tuplet:{count,normal,group:0}}));
}
export function tupletGroups(beat) {
  if(beat.length===3 && beat.every(n=>n.ticks===4&&!n.tuplet))return [{start:0,end:2,count:3,normal:2}];
  const groups=[];
  beat.forEach((n,i)=>{
    if(!n.tuplet)return;
    const last=groups.at(-1);
    if(last && last.end===i-1 && last.group===n.tuplet.group)last.end=i;
    else groups.push({...n.tuplet,start:i,end:i});
  });
  return groups;
}
export function validateBeat(beat, duration = 12) {
  if(![12,18].includes(duration)||!Array.isArray(beat)||!beat.length||beat.length>(duration===18?12:8))return false;
  if(!beat.every(n=>n&&Number.isFinite(n.ticks)&&n.ticks>0&&Math.abs(n.ticks*35-units(n))<1e-7&&typeof n.rest==='boolean'&&(n.tie===undefined||typeof n.tie==='boolean')))return false;
  if(beat.reduce((sum,n)=>sum+units(n),0)!==duration*35)return false;
  if(beat.some(n=>n.ticks===4&&!n.tuplet))return beat.length===3&&beat.every(n=>n.ticks===4&&!n.tuplet&&!n.written);
  if(!beat.every(n=>n.tuplet ? [3,5,6,7].includes(n.tuplet.count)&&(n.tuplet.normal===(n.tuplet.count===3?2:4)||(duration===18&&n.tuplet.count!==3&&n.tuplet.normal===3&&n.written===6))&&Number.isInteger(n.tuplet.group)&&[3,6].includes(n.written)&&Math.abs(n.ticks-n.written*n.tuplet.normal/n.tuplet.count)<1e-8 : [3,6,9,12,...(duration===18?[18]:[])].includes(n.ticks)&&n.written===undefined))return false;
  const groups=tupletGroups(beat);
  if(new Set(groups.map(g=>g.group)).size!==groups.length)return false;
  return groups.every(g=>{
    const notes=beat.slice(g.start,g.end+1);
    return notes.length===g.count&&notes.every(n=>n.tuplet.count===g.count&&n.tuplet.normal===g.normal&&n.written===notes[0].written);
  });
}
