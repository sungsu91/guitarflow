// One preparation bar on the same audio clock as the score. It runs once,
// before a fresh start, and is never part of the repeating score timeline.
export function practiceCountIn(enabled,meter,bpm){
 if(!enabled)return {duration:0,clicks:[],meter};
 const step=60/bpm*4/meter[1];
 return {duration:meter[0]*step,step,meter,clicks:Array.from({length:meter[0]},(_,beat)=>({time:beat*step,beat,downbeat:beat===0,subdivisionIndex:0,countIn:true}))};
}
