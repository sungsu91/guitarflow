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
