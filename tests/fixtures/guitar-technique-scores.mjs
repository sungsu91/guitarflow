import {createBlankDocument} from '../../src/etudes/scoreModel.js';
export function techniqueScores() {
  return [['hammer','5→7 해머링','H',5,7],['pull','7→5 풀오프','P',7,5],['slide','5→7 슬라이드','S',5,7],['tie','5→5 붙임줄',null,5,5],['picked','5→7 두 번 피킹',null,5,7]].map(([id,title,technique,a,b])=> {
    const d=createBlankDocument();d.id=`technique-check-${id}`;d.title=title;d.english=title;d.bpm=90;
    const events=d.measures[0].events;
    for(const [i,fret] of [a,b].entries())Object.assign(events[i],{rest:false,technique:i===0?technique:null,notes:[{id:`${id}-tone-${i}`,string:3,fret,locked:true}]});
    if(id==='tie')events[0].tieTo=events[1].id;
    return {id,document:d};
  });
}
