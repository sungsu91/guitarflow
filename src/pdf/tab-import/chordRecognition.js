import {parseChordSymbol} from '../../chords/chordSymbols.js';
import {createOcrWorker} from './ocrWorkerClient.js';
import {abortable} from './abortable.js';
import {meterTicks} from '../../etudes/scoreMeters.js';
import {ticksOf} from '../../etudes/scoreModel.js';
import {recognizeChordGlyphs} from './chordGlyphs.js';
import {chordAnchorX} from './chordPosition.js';
const normalizeOcrChord=text=>text.replace(/^[a-g]/,letter=>letter.toUpperCase()).replace(/\/([a-g])([#b]?)$/,(_,root,sign)=>'/'+root.toUpperCase()+sign);

export function projectChordText(content,viewport){
 const words=content.items.flatMap(item=>{
  if(!item.transform||Math.abs(item.transform[1])+Math.abs(item.transform[2])>.01)return [];
  const text=item.str?.trim();if(!text)return [];
  const [x,baseline]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
  const height=Math.abs(item.transform[3])*viewport.scale,width=item.width*viewport.scale;
  const parts=[...item.str.matchAll(/\S+/g)];
  return parts.map(p=>({text:p[0],x:x+width*p.index/item.str.length,y:baseline-height*.78,width:width*p[0].length/item.str.length,height:height*.78,confidence:1,method:'pdf-chord-text'}));
 });
 // Encoded font runs may split Cmaj7 into [Cm] + a + [j7]. Retain the
 // complete printed token so a readable suffix cannot become an A chord.
 const groups=[];
 for(const word of words.map((w,order)=>({...w,order})).sort((a,b)=>a.x-b.x)){
  const prior=groups.findLast(p=>Math.abs(p.y+p.height-word.y-word.height)<Math.min(p.height,word.height)*.18&&Math.abs(p.height-word.height)<Math.max(p.height,word.height)*.25&&word.x>=p.x&&word.x-p.x-p.width<Math.min(p.height,word.height)*.22&&word.x-p.x-p.width>-Math.min(p.height,word.height)*.15);
  if(prior){const right=Math.max(prior.x+prior.width,word.x+word.width);prior.text+=word.text;prior.width=right-prior.x;prior.order=Math.min(prior.order,word.order);}
  else groups.push({...word});
 }
 return groups.sort((a,b)=>a.order-b.order).map(({order,...word})=>word);
}
export function chordWordsInRegion(words,region){
 const g=region.spacing;
 return words.flatMap(word=>{
  // Isolated printed capitals (especially C) can be returned as lowercase by
  // text OCR. Normalize the root only inside the already isolated chord band.
  const parsed=parseChordSymbol(word.method==='pdf-chord-text'?word.text:normalizeOcrChord(word.text));
  if(word.method!=='pdf-chord-text'&&region.textBaseline!==undefined&&Math.abs(word.y+word.height-region.textBaseline)>g*.6)return [];
  if(!parsed||word.confidence<.65||word.height<g*.72||word.height>g*3.5||word.x<region.x||word.x>region.x+region.width||word.y<region.y||word.y+word.height>region.staffY-g*.6)return [];
  return [{...word,name:parsed.name}];
 }).sort((a,b)=>a.x-b.x).filter((w,i,all)=>!all.slice(0,i).some(p=>p.name===w.name&&Math.abs(p.x-w.x)<g*.4));
}

export async function recognizePageChords(regions,nativeWords=[],{signal,onReading=()=>{}}={}){
 let worker;const canvas=document.createElement('canvas'),raw=document.createElement('canvas'),results=[];
 try{
  for(const region of regions){
   signal?.throwIfAborted();
   const triplets=[];
   // Native lyrics are positive text evidence. English-only OCR can otherwise
   // confidently call a Korean syllable A or mark it as a missing chord.
   const lyrics=nativeWords.filter(w=>/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(w.text));
   const lyricPart=p=>lyrics.some(w=>Math.min(region.x+p.x+p.width,w.x+w.width)-Math.max(region.x+p.x,w.x)>Math.min(p.width,w.width)*.45&&Math.min(region.y+p.y+p.height,w.y+w.height)-Math.max(region.y+p.y,w.y)>Math.min(p.height,w.height)*.4);
   const eligible=w=>!lyricPart({x:w.x-region.x,y:w.y-region.y,width:w.width,height:w.height});
   let words=chordWordsInRegion(nativeWords,region).filter(eligible);
   const covered=part=>words.some(w=>w.x<=region.x+part.x+region.spacing*.4&&w.x+w.width>=region.x+part.x+part.width-region.spacing*.4);
   // A PDF can mix native text and scanned chord labels on the same system.
   // Native symbols take precedence only at their own location.
   if(!words.length||(region.components??[]).some(part=>!covered(part))||region.rhythmComponents?.length){
    const native=words;
    worker??=await createOcrWorker(signal);
    await abortable(worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'ABCDEFGNMabcdefgmjinsudao#b0123456789/+().',user_defined_dpi:'300',classify_enable_learning:'0'}),signal);
    raw.width=region.width;raw.height=region.height;
    raw.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(region.rgba),region.width,region.height),0,0);
    const scale=Math.min(3,Math.max(1,26/region.spacing)),pad=20;
    canvas.width=Math.ceil(region.width*scale)+pad*2;canvas.height=Math.ceil(region.height*scale)+pad*2;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(raw,pad,pad,region.width*scale,region.height*scale);
    const {data}=await abortable(worker.recognize(canvas,{}, {blocks:true,text:true}),signal);
    const recognized=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))).map(w=>({text:w.text,confidence:w.confidence/100,x:region.x+(w.bbox.x0-pad)/scale,y:region.y+(w.bbox.y0-pad)/scale,width:(w.bbox.x1-w.bbox.x0)/scale,height:(w.bbox.y1-w.bbox.y0)/scale,method:'local-chord-ocr'}));
    words=[...native,...chordWordsInRegion(recognized,region).filter(w=>eligible(w)&&!native.some(n=>Math.abs(n.x-w.x)<region.spacing))];const uncertain=recognized.filter(eligible);
    // Sparse-text segmentation omits isolated one-letter chords. Read eligible
    // connected text groups separately, without guessing G from the melody.
    for(const part of [...region.components??[],...(region.rhythmComponents??[]).map(p=>({...p,tripletOnly:true}))]){
     if(lyricPart(part))continue;
     const px=region.x+part.x,py=region.y+part.y;
     if(py+part.height>region.staffY-region.spacing*.4)continue;
     const inPart=w=>w.x+w.width*.5>=px&&w.x+w.width*.5<=px+part.width;
     const existing=part.tripletOnly?null:words.find(inPart);
     if(existing?.method==='pdf-chord-text')continue;
     const partial=existing&&(existing.width<part.width*.75||existing.x>px+region.spacing*.35);
     const caseSensitive=existing&&/^[A-G][#b]?m\d/.test(existing.name);
     if(existing&&!partial&&!caseSensitive)continue;
     // Do not keep a valid prefix (C from Cadd2) as a complete chord. Retry the
     // full printed group; unread suffixes stay reviewable instead of changing harmony.
     if(partial)words=words.filter(w=>!inPart(w));
     if(!part.tripletOnly&&part.height>=region.spacing&&part.width>=part.height*1.15){
      const glyphReading=await recognizeChordGlyphs(raw,part,worker,{signal});
      if(glyphReading){
       words=words.filter(w=>w.x+w.width*.5<px||w.x>px+part.width);
       if(glyphReading.words)words.push(...glyphReading.words.map(w=>({...w,x:px+w.x,y:py+w.y,groupX:px,groupWidth:part.width})));
       else words.push({...glyphReading,x:px,y:py,width:part.width,height:part.height});continue;
      }
     }
     if(existing&&!partial)continue;
     // Keep anti-aliased edges around the connected ink. A tight thresholded
     // crop can make Tesseract confidently read just "A" from a printed "Am".
     const zoom=Math.min(3,48/part.height),pad=16,margin=Math.ceil(region.spacing*.2);
     const sx=Math.max(0,part.x-margin),sy=Math.max(0,part.y-margin),sw=Math.min(raw.width,part.x+part.width+margin)-sx,sh=Math.min(raw.height,part.y+part.height+margin)-sy;
     canvas.width=Math.ceil(sw*zoom)+pad*2;canvas.height=Math.ceil(sh*zoom)+pad*2;
     const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(raw,sx,sy,sw,sh,pad,pad,sw*zoom,sh*zoom);
     const attempts=[];let accepted=false;
     const modes=part.height>=region.spacing*1.1&&part.width>=part.height*.5&&part.width<=part.height*1.35?['7','13','10']:['7','13','7-large'];
     for(const mode of modes){
      const readingScale=mode==='10'?Math.min(4,96/part.height):mode==='7-large'?Math.min(4,72/part.height):zoom;
      if(mode==='10'||mode==='7-large'){
       canvas.width=Math.ceil(sw*readingScale)+pad*2;canvas.height=Math.ceil(sh*readingScale)+pad*2;
       ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(raw,sx,sy,sw,sh,pad,pad,sw*readingScale,sh*readingScale);
      }
      await abortable(worker.setParameters({tessedit_pageseg_mode:mode==='7-large'?'7':mode}),signal);
      const {data}=await abortable(worker.recognize(canvas,{}, {blocks:true,text:true}),signal);
      const symbols=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.flatMap(w=>w.symbols))));
      const coverage=symbols.length?Math.min((Math.max(...symbols.map(s=>s.bbox.x1))-Math.min(...symbols.map(s=>s.bbox.x0)))/(part.width*readingScale),(Math.max(...symbols.map(s=>s.bbox.y1))-Math.min(...symbols.map(s=>s.bbox.y0)))/(part.height*readingScale)):0;
      const reading={text:data.text.trim(),confidence:data.confidence/100,characterConfidence:symbols.length?Math.min(...symbols.map(s=>s.confidence))/100:0,needsReview:coverage<.7,x:px,y:py,width:part.width,height:part.height,method:'local-chord-crop-ocr'};
      onReading({staff:region.staff,mode,...reading});
      attempts.push(reading);
      if(!part.tripletOnly)uncertain.push(reading);
      const found=part.tripletOnly?[]:chordWordsInRegion([reading],region).filter(w=>!w.needsReview);if(found.length){words.push(...found);accepted=true;break;}
     }
     if(part.height>=region.spacing*.7&&part.height<=region.spacing*1.65&&attempts.filter(r=>r.text==='3'&&!r.needsReview&&r.characterConfidence>=.9).length>=2){
      triplets.push({x:px+part.width/2,y:py,width:part.width,height:part.height,method:'printed-triplet-consensus'});
     }
     // English word confidence penalizes names such as Em7. Require matching
     // character readings from both segmentation modes before recovering one.
     const matching=attempts.filter(r=>!r.needsReview&&r.characterConfidence>=.7).find(r=>parseChordSymbol(normalizeOcrChord(r.text))&&attempts.some(q=>q!==r&&!q.needsReview&&q.characterConfidence>=.7&&normalizeOcrChord(q.text)===normalizeOcrChord(r.text)));
     if(!part.tripletOnly&&!accepted&&part.height>=region.spacing*1.1&&matching){
      const matches=attempts.filter(r=>!r.needsReview&&normalizeOcrChord(r.text)===normalizeOcrChord(matching.text)&&r.characterConfidence>=.7);
      const reading={...matching,wordConfidence:matching.confidence,confidence:Math.min(...matches.map(r=>r.characterConfidence)),method:'local-chord-character-consensus'};
      words.push(...chordWordsInRegion([reading],region));
     }
    }
    words.sort((a,b)=>a.x-b.x);
    region.unresolvedWords=chordWordsInRegion(uncertain.filter(w=>!w.needsReview&&w.confidence>=.2&&w.height>=region.spacing*1.1&&!region.components?.some(p=>w.x>region.x+p.x+region.spacing*.35&&w.x<region.x+p.x+p.width)).map(w=>({...w,wordConfidence:w.confidence,confidence:1})),region)
      .filter(w=>!words.some(p=>Math.abs(p.x-w.x)<region.spacing)).map(w=>({...w,confidence:w.wordConfidence,needsReview:true}));
    // A clearly located but unread complete label must interrupt automatic
    // accompaniment, rather than silently carrying the previous chord through it.
    if(region.textBaseline!==undefined)region.unresolvedGroups=(region.components??[]).filter(p=>!lyricPart(p)&&p.height>=region.spacing&&p.height<region.spacing*2.5&&p.width>=p.height*.8&&!words.some(w=>Math.abs((w.groupX??w.x)-region.x-p.x)<region.spacing*.4&&(w.groupWidth??w.width)>=p.width*.75)).map(p=>({x:region.x+p.x,y:region.y+p.y,width:p.width,height:p.height}));
   }
   const {rgba,...meta}=region;results.push({...meta,words,triplets});
  }
  return results;
 }finally{canvas.width=canvas.height=raw.width=raw.height=0;await worker?.terminate();}
}

export function attachPageChords(page,regions){
 if(page.chordWarning){page.staffs.forEach(s=>s.measures.forEach(m=>{m.harmonyReview={reason:'chord-ocr-failed'};}));return page;}
 for(const staff of page.staffs){
  const region=regions.find(r=>r.staff===staff.id);if(!region)continue;
  const bounds=page.notation?region.measures:staff.measures;
  // A missed barline must not shift every subsequent chord to another bar.
  if(bounds.length!==staff.measures.length){staff.chordReview={reason:'bar-count-mismatch',words:region.words};if(region.words.length)staff.measures.forEach(m=>{m.harmonyReview=staff.chordReview;});continue;}
  staff.measures.forEach((measure,i)=>{
   const box=bounds[i],g=region.spacing;
   const words=[...region.words,...(region.unresolvedWords??[])].filter(w=>w.x+w.width*.25>=box.x-g*.2&&w.x+w.width*.25<box.x+box.width-g*.2).sort((a,b)=>a.x-b.x);
   const unread=(region.unresolvedGroups??[]).filter(w=>w.x+w.width*.25>=box.x-g*.2&&w.x+w.width*.25<box.x+box.width-g*.2);
   if(unread.length)measure.harmonyReview={reason:'unread-chord-label',sources:unread.map(w=>({page:page.page,staff:staff.id,...w}))};
   if(!words.length)return;
   const capacity=meterTicks(measure.meter??[4,4]);
   // Use the score's duration rules, including tuplets. Unknown rhythm cannot
   // establish a beat for a mid-bar chord, even if its horizontal position fits.
   let elapsed=0;const anchors=measure.rhythmValid?(measure.slots??[]).map(s=>{const a={x:s.x,onset:s.onset??elapsed,positioned:!s.voice||s.positioned};elapsed+=ticksOf(s);return a;}).filter(a=>a.positioned):[];
   measure.harmonyChanges=words.map((word,index)=>{
    const first=index===0&&word.x<box.x+Math.max(g*(i===0?12:8),box.width*.32);
    const rootX=chordAnchorX(word);
    const anchor=(!page.notation||measure.positioned)&&anchors.length?anchors.reduce((a,b)=>Math.abs(b.x-rootX)<Math.abs(a.x-rootX)?b:a):null;
    const onset=first?0:anchor?.onset??Math.min(capacity-240,Math.max(0,Math.round((word.x-box.x)/box.width*capacity/240)*240));
    return {name:word.name,onset,needsReview:Boolean(word.needsReview||!first&&!anchor),source:{page:page.page,staff:region.sourceStaff??staff.id,x:word.x,y:word.y,width:word.width,height:word.height,confidence:word.confidence,method:word.method,...(region.sharedSystemHarmony?{sharedSystemHarmony:true}: {})}};
   });
   measure.harmony=measure.harmonyChanges[0].onset===0?measure.harmonyChanges[0].name:null;
  });
 }
 return page;
}
