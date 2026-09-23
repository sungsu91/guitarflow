// Wrap at chord/arrow boundaries rather than shrinking dense labels to tiny type.
// The caller supplies the actual engraving font's text metrics.
export function harmonyLabelLines(value,width,measure){
 const words=String(value??'').trim().split(/\s+/).filter(Boolean),lines=[];
 let line='';
 for(const word of words){
  const next=line?`${line} ${word}`:word;
  if(measure(next)<=width){line=next;continue;}
  if(line){lines.push(line);line='';}
  if(measure(word)<=width){line=word;continue;}
  // Imported free-text symbols can be longer than a whole measure.
  for(const char of word){
   if(line&&measure(line+char)>width){lines.push(line);line='';}
   line+=char;
  }
 }
 if(line)lines.push(line);
 return lines.length?lines:[''];
}
