export const SHOOTER_SHARE_URL = 'https://guitarflow.vercel.app/#shooter';
const points = value => Math.max(0, Math.floor(Number(value) || 0));
export function usesMobileImageSharing(nav = navigator) {
  return /Android|iPad|iPhone|iPod/i.test(nav.userAgent || '')
    || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}
export function shooterShareResult(score, bestScore) {
  const value = points(score);
  return {score:value, bestScore:Math.max(value, points(bestScore)), title:'FRETIVA LAB · 슈팅게임',
    text:`슈팅게임에서 ${value.toLocaleString('ko-KR')}점을 기록했어요! 함께 도전해 보세요.`, url:SHOOTER_SHARE_URL};
}

// Prepare before the tap: awaiting canvas encoding inside a click can consume
// Safari's transient user activation and prevent the native share sheet.
export function createShooterResultPng(result, doc = document) {
  const canvas = doc.createElement('canvas'); canvas.width=1080; canvas.height=1350;
  const ctx=canvas.getContext('2d');
  if(!ctx) return Promise.reject(new Error('Canvas unavailable'));
  const bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#111b38');bg.addColorStop(1,'#030813');
  ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
  for(let i=0;i<55;i++){ctx.fillStyle=`rgba(160,190,255,${.15+(i%5)*.08})`;ctx.beginPath();ctx.arc((i*173+31)%1080,(i*239+17)%1350,1+i%3,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='center';
  const text=(value,y,size,color,weight=600)=>{ctx.font=`${weight} ${size}px Arial, sans-serif`;while(ctx.measureText(value).width>900 && size>20)ctx.font=`${weight} ${--size}px Arial, sans-serif`;ctx.fillStyle=color;ctx.fillText(value,540,y);};
  text('FRETIVA LAB',150,38,'#ead29a');text('슈팅게임 결과',245,48,'#f5f7ff');
  ctx.strokeStyle='#83cfff';ctx.lineWidth=3;ctx.shadowColor='#438dff';ctx.shadowBlur=24;
  ctx.beginPath();ctx.arc(540,510,135,0,Math.PI*2);ctx.stroke();text('♪',560,140,'#e8f5ff');ctx.shadowBlur=0;
  text('최종 점수',750,36,'#bec9e4');text(result.score.toLocaleString('ko-KR'),900,140,'#ffffff',800);
  text(`최고 점수  ${result.bestScore.toLocaleString('ko-KR')}`,1010,40,'#f0d69d');
  text('기타를 연주하고, 기록에 도전하세요',1170,30,'#bec9e4');text('guitarflow.vercel.app',1240,28,'#a6b6d6');
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'fretiva-shooter-result.png',{type:'image/png'})):reject(new Error('PNG unavailable')),'image/png'));
}

// Called directly from the click handler with a file already prepared.
export async function shareShooterResult(result, file, nav = navigator) {
  const textData={title:result.title,text:result.text,url:result.url};
  if(typeof nav.share==='function'){
    let filesSupported=false;
    try{filesSupported=Boolean(file && nav.canShare?.({files:[file]}));}catch{/* Use text sharing. */}
    try{
      // Mobile share sheets can show a generic preview for mixed image/link items.
      // Use a single image on Android and iOS; the UI exposes a separate link action.
      const fileData = usesMobileImageSharing(nav) ? {files:[file]} : {...textData,files:[file]};
      await nav.share(filesSupported?fileData:textData);
      return 'shared';
    }catch(error){
      if(error?.name==='AbortError')return 'cancelled';
      // Do not open a second sheet after a cancellation. Unsupported file
      // payloads may still permit a plain text/link share.
      if(filesSupported){try{await nav.share(textData);return 'shared';}catch(next){if(next?.name==='AbortError')return 'cancelled';}}
    }
  }
  try{if(nav.clipboard?.writeText){await nav.clipboard.writeText(result.url);return 'copied';}}catch{/* Explicit manual copy UI below. */}
  return 'manual';
}
