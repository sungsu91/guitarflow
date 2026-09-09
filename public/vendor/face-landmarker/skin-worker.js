// Landmark analysis and its source bitmap travel together. Never apply a mask
// from an older camera frame to the current live frame.
self.exports = {};
importScripts('./vision_bundle.js', './cheek-balance.js');
let model;
const canvas = new OffscreenCanvas(256, 256);
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const oval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const exclusions = [
  [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],
  [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398],
  [70,63,105,66,107,55,65,52,53,46],
  [336,296,334,293,300,276,283,282,295,285],
  [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185],
];
function polygon(points, indices, expansion) {
  const selected = indices.map(i => points[i]);
  const center = selected.reduce((a,p)=>({x:a.x+p.x/selected.length,y:a.y+p.y/selected.length}),{x:0,y:0});
  ctx.beginPath();
  selected.forEach((p,i)=>{const x=(center.x+(p.x-center.x)*expansion)*256,y=(center.y+(p.y-center.y)*expansion)*256;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.closePath();ctx.fill();
}
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    try {
      const root = new URL('./',self.location.href).href;
      const files = await self.exports.FilesetResolver.forVisionTasks(root);
      model = await self.exports.FaceLandmarker.createFromOptions(files, {
        baseOptions:{modelAssetPath:root+'face_landmarker.task',delegate:'GPU'},
        runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.65,minFacePresenceConfidence:.65,minTrackingConfidence:.6,
        outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false,
      });
      self.postMessage({type:'ready'});
    } catch { self.postMessage({type:'unavailable'}); }
  } else if(data.type === 'frame') {
    try {
      const start=performance.now();
      const points=model.detectForVideo(data.bitmap,data.timestamp).faceLandmarks[0];
      ctx.fillStyle='#000';ctx.fillRect(0,0,256,256);
      if(points){
        ctx.fillStyle='#fff';polygon(points,oval,.97);
        ctx.fillStyle='#000';exclusions.forEach(indices=>polygon(points,indices,1.28));
      }
      const rgba=ctx.getImageData(0,0,256,256).data;
      const mask=new Uint8Array(256*256);
      for(let i=0;i<mask.length;i++)mask[i]=rgba[i*4];
      const balance=self.cheekBalance(points,data.bitmap.width/data.bitmap.height);
      self.postMessage({type:'result',bitmap:data.bitmap,mask,balance,timestamp:data.timestamp,detected:!!points,elapsed:performance.now()-start},[data.bitmap,mask.buffer]);
    } catch {data.bitmap.close();self.postMessage({type:'unavailable'});}
  }
};
