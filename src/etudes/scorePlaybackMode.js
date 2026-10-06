// A seek chooses a new route. A pause/tempo change retains the current route.
// Practice loops have priority over both score navigation and a clicked bar.
export function practicePlaybackRange(score) {
 const range=score.practiceRange;
 return range&&Number.isInteger(range.start)&&Number.isInteger(range.end)&&range.start>=0&&range.end>=range.start&&range.end<score.measures.length?range:null;
}

export function playbackRoute(score,from={bar:0,event:0}) {
 const range=practicePlaybackRange(score);
 if(range)return {mode:'practice-loop',startBar:range.start};
 if(Number.isFinite(from.timelineTick)&&from.route)return from.route;
 const startBar=Math.max(0,Math.min(score.measures.length-1,Math.floor(from.bar??0)));
 return {mode:startBar>0||from.event>0?'linear':'score',startBar};
}

export function playbackCycles({practice,route,repeatCount=1}) {
 // A middle-bar check ends at the end of the score, even if the previous
 // practice session used an endless whole-score loop.
 if(!practice||route.mode==='linear')return 1;
 return repeatCount===0?Infinity:Math.max(1,repeatCount);
}
