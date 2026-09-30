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
  const start=rows.findIndex(r=>r>=.2);
  return start>=0&&((rows[start]>=.7&&rows[start+1]>=.7)||(rows[start+1]>=.7&&rows[start+2]>=.7));
  });
}
