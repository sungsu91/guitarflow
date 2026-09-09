import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROME_PATH });
try {
  const page = await browser.newPage();
  const trackingRequests=[];
  page.on('request',request=>{if(request.url().includes('/face-landmarker/')) trackingRequests.push(request.url());});
  await page.goto(process.env.RECORDING_TEST_URL || 'http://127.0.0.1:5178');
  const result = await page.evaluate(async () => {
    const { beautyFrame, releaseBeauty } = await import('/src/shooter/recording/cameraBeauty.js');
    const c = document.createElement('canvas'); c.width=320; c.height=240;
    const ctx=c.getContext('2d'); ctx.fillStyle='#0010e0'; ctx.fillRect(0,0,320,240);
    for(let y=0;y<240;y++) for(let x=0;x<160;x++) {
      const d=(Math.floor(x/2)+Math.floor(y/2))%2?8:-8;
      ctx.fillStyle=`rgb(${180+d},${130+d},${110+d})`;ctx.fillRect(x,y,1,1);
    }
    ctx.fillStyle='#00ff00';ctx.fillRect(250,0,70,30);
    const video=document.createElement('video');video.muted=true;video.playsInline=true;
    const stream=c.captureStream(30);video.srcObject=stream;await video.play();
    await new Promise(resolve => setTimeout(resolve, 100));
    const out=document.createElement('canvas');out.width=320;out.height=240;const o=out.getContext('2d');
    o.drawImage(video,0,0);const before=o.getImageData(0,0,320,240).data;
    const source=beautyFrame(video,2);o.drawImage(source,0,0);const after=o.getImageData(0,0,320,240).data;
    const pixel=(data,x,y)=>Array.from(data.slice((y*320+x)*4,(y*320+x)*4+3));
    let pre=0,post=0;
    for(let y=40;y<200;y++)for(let x=20;x<130;x++) {pre+=Math.abs(before[(y*320+x)*4]-before[(y*320+x+1)*4]);post+=Math.abs(after[(y*320+x)*4]-after[(y*320+x+1)*4]);}
    const result={supported:source!==video,pre,post,blue:pixel(after,220,100),top:pixel(after,280,10),bottom:pixel(after,280,230),offSame:beautyFrame(video,0)===video};
    releaseBeauty(video);stream.getTracks().forEach(t=>t.stop());return result;
  });
  assert.equal(result.supported,true);assert.ok(result.post<result.pre*.9,JSON.stringify(result));
  assert.ok(result.blue[2]>180&&result.blue[0]<10);
  assert.ok(result.top[1]>220);assert.ok(result.bottom[2]>180);assert.equal(result.offSame,true);
  assert.deepEqual(trackingRequests,[],'Global soft focus must not load face tracking or masks');
  console.log('GPU soft focus: texture softened, orientation preserved, off bypasses processing; no tracking requests',result);
} finally {await browser.close();}
