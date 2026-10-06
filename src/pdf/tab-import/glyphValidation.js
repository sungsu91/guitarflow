// An eighth rest cropped at a TAB line can fool both OCR passes into reading
// "7". Require the horizontal cap of a digit, not just OCR agreement. The
// input includes headroom ABOVE the component cut, so a round rest head isn't
// flattened by that cut and a real digit's cap isn't clipped away.
export function hasSevenCap(grayscale,width,height){
  return [80,110,145,180,205].some(threshold=>{
  const rows=[];
  for(let y=0;y<height;y++){
    let run=0,longest=0;
    for(let x=0;x<width;x++){
      run=grayscale[y*width+x]<threshold?run+1:0;
      longest=Math.max(longest,run);
    }
    rows.push(longest/width);
  }
  // Headroom may include the foot of a fret on the preceding string. Start
  // at the final ink group after a clear gap, not that unrelated earlier foot.
  let start=rows.findIndex(r=>r>=.2);
  for(let y=start+3;y<rows.length;y++)if(rows[y]>=.2&&rows[y-1]<.2&&rows[y-2]<.2)start=y;
  return start>=0&&((rows[start]>=.7&&rows[start+1]>=.7)||(rows[start+1]>=.7&&rows[start+2]>=.7));
  });
}
// A narrow serif 1 has a small head and a wider foot around a thinner body.
// Uniform stem/barline fragments do not. Rows crossing staff rules are omitted
// by the caller; this only admits a crop to OCR, never supplies its digit.
export function hasNarrowOneShape(rowWidths,spacing,height){
  const rows=rowWidths.filter(w=>w>0);
  if(height<spacing*.6||rows.length<8)return false;
  const sorted=[...rows].sort((a,b)=>a-b),body=sorted[Math.floor(sorted.length/2)],edge=Math.max(3,Math.ceil(rows.length*.25));
  return Math.max(...rows)>=spacing*.18
    &&Math.max(...rows.slice(0,edge))>=body+2
    &&Math.max(...rows.slice(-edge))>=body+2;
}
