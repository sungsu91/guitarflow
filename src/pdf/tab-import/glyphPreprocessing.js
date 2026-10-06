// A bounded retry for weak isolated glyphs. Work at an enlarged scale so a
// one-pixel stroke adjustment cannot erase a low-resolution source numeral.
export function normalizeGlyphPixels(image,{stroke=0,threshold=180}={}){
 const {data,width,height}=image,gray=new Uint8Array(width*height);
 for(let i=0;i<gray.length;i++)gray[i]=data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=y*width+x,near=[gray[at]];
  if(stroke)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])near.push(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height?gray[(y+dy)*width+x+dx]:255);
  const value=(stroke<0?Math.max(...near):stroke>0?Math.min(...near):gray[at])<threshold?0:255;
  data[at*4]=data[at*4+1]=data[at*4+2]=value;data[at*4+3]=255;
 }
 return image;
}
