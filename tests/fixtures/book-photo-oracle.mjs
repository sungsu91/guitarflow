// Human transcription from the original local photographs, 2026-10-06.
// Eight COMPLETE sampled bars, not OCR confidence and not whole-page accuracy.
// Read independently from the source before scoring candidate recognition.
const chord=(duration,notes)=>({duration,dotted:false,tuplet:null,rest:false,notes});
const am=[[2,9],[3,9],[4,11],[5,0]],e=[[3,9],[4,9],[5,11],[6,0]];
const eight=notes=>Array.from({length:8},()=>chord('8',notes));
const nine=notes=>[...Array.from({length:7},()=>chord('8',notes)),chord('16',notes),chord('16',notes)];
export const bookPhotoOracle={
 scope:'Eight visually transcribed complete bars from two photographs. A sampled pass never means the entire page is accurate. Ties/techniques are outside this audit.',
 cases:[
  {id:'book-6',rowCenter:.319,part:1,bars:[
   {printed:21,left:.202,right:.421,events:eight(am)},
   {printed:22,left:.421,right:.579,events:nine(am)},
   {printed:23,left:.579,right:.731,events:eight(e)},
   {printed:24,left:.731,right:.896,events:nine(e)},
  ]},
  {id:'book-8',rowCenter:.436,part:2,bars:[
   {printed:41,left:.110,right:.361,events:[{duration:'1',rest:true,notes:[]}]},
   {printed:42,left:.361,right:.556,events:[{duration:'2',rest:true,notes:[]},{duration:'8',rest:true,notes:[]},chord('8',[[2,4]]),chord('8',[[2,5]]),chord('8',[[2,7]])]},
   {printed:43,left:.556,right:.731,events:[chord('1',[[1,4]])]},
   {printed:44,left:.731,right:.891,events:[chord('2',[[1,4]]),chord('8',[[1,4]]),chord('8',[[2,7]]),chord('8',[[2,7]]),chord('8',[[2,5]])]},
  ]},
 ],
};
