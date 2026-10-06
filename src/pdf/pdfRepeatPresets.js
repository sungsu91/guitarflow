import {setPdfRepeatMark} from './pdfRepeats.js';

// Mapped positions also support gaps in numbering and endings across pages.
export function addPdfRepeatPreset(settings,bars,{start,end,kind='repeat'}){
 const from=bars.findIndex(b=>b.number===Number(start)),to=bars.findIndex(b=>b.number===Number(end));
 if(from<0||to<from||!['repeat','endings'].includes(kind)||(kind==='endings'&&!bars[to+1]))return null;
 let next=setPdfRepeatMark(settings,bars[from].number,{repeatStart:true});
 next=setPdfRepeatMark(next,bars[to].number,{repeatEnd:true,...(kind==='endings'?{ending:1}:{})});
 if(kind==='endings')next=setPdfRepeatMark(next,bars[to+1].number,{ending:2});
 return {...next,mode:'score'};
}

// A quick edit replaces only its previous complete pair. Other repeat blocks,
// navigation symbols and handwritten placement remain intact.
export function previewPdfRepeatPreset(settings,bars,selection,previous){
 if(!addPdfRepeatPreset(settings,bars,selection))return null;
 let next=settings;
 const start=settings.marks[previous?.start],end=settings.marks[previous?.end];
 if(start?.repeatStart&&end?.repeatEnd){
  next=setPdfRepeatMark(next,previous.start,{repeatStart:false});
  next=setPdfRepeatMark(next,previous.end,{repeatEnd:false,...(end.ending===1?{ending:0}:{})});
  const following=bars[bars.findIndex(b=>b.number===Number(previous.end))+1];
  if(end.ending===1&&following&&next.marks[following.number]?.ending===2)next=setPdfRepeatMark(next,following.number,{ending:0});
 }
 return addPdfRepeatPreset(next,bars,selection);
}
