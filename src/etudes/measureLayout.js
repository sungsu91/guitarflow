import {copiedScoreLayout} from './copiedScoreLayout.js';

export const MAX_MEASURES_PER_ROW=12;
export const MEASURE_ROW_OPTIONS=Object.freeze(Array.from({length:MAX_MEASURES_PER_ROW},(_,i)=>i+1));

// A reader override reflows the page; Auto restores the document's authored
// rows, including uneven systems copied from a PDF or photo.
export function scoreLineSettings(document,override=0,fallback=1){
 const source=!override&&copiedScoreLayout(document);
 if(source)return source;
 const saved=document?.viewSettings;
 return {perRow:override||saved?.measuresPerRow||fallback,breaks:override?[]:saved?.systemBreaks??[],pageBreaks:[]};
}

// Display placement only. Musical order, IDs, and timing are never changed.
export function measureLayout(measures, perRow = 1, breaks = []) {
 const count=Math.max(1,Math.min(MAX_MEASURES_PER_ROW,Math.floor(Number(perRow)||1))), forced=new Set(breaks), rows=[];
 for(const measure of measures){
  if(!rows.length||rows.at(-1).length===count||forced.has(measure.id))rows.push([]);
  rows.at(-1).push(measure.id);
 }
 return rows.flatMap((row,index)=>row.map((id,column)=>({id,row:index+1,column:column*(12/row.length)+1,span:12/row.length})));
}
