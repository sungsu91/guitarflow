const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {const page=await browser.newPage();await page.goto('http://127.0.0.1:5177/');
const report=await page.evaluate(async()=>{
 const {METRONOME_TONE_OPTIONS:tones}=await import('/src/metronome/options.js');
 const {GROOVE_SAMPLE_GAIN:gains}=await import('/src/metronome/groove.js');
 const ctx=new OfflineAudioContext(1,44100,44100), out=[];
 const db=x=>20*Math.log10(Math.max(1e-12,x));
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
 for(let len=2;len<=n;len*=2){const a=-2*Math.PI/len;for(let s=0;s<n;s+=len)for(let j=0;j<len/2;j++){const k=s+j,l=k+len/2,wr=Math.cos(a*j),wi=Math.sin(a*j),r=re[l]*wr-im[l]*wi,v=re[l]*wi+im[l]*wr;re[l]=re[k]-r;im[l]=im[k]-v;re[k]+=r;im[k]+=v;}}}
 for(const tone of tones.filter(t=>t.src)){
 const buffer=await ctx.decodeAudioData(await(await fetch(tone.src)).arrayBuffer());
 const duration=Math.min(buffer.duration,tone.id==='ride'?1.8:tone.id==='openHihat'?.35:1);
 const length=Math.floor(duration*buffer.sampleRate);let peak=0,energy=0,attack=0,maxWindow=0;const timeline=new Float64Array(length),bands=[0,0,0,0];let weighted=0,spectral=0;
 for(let c=0;c<buffer.numberOfChannels;c++){
 const data=buffer.getChannelData(c);let rolling=0;const win=Math.round(.02*buffer.sampleRate);
 for(let i=0;i<length;i++){const e=data[i]*data[i];energy+=e;timeline[i]+=e;peak=Math.max(peak,Math.abs(data[i]));if(i<win)attack+=e;rolling+=e-(i>=win?data[i-win]**2:0);if(i>=win-1)maxWindow=Math.max(maxWindow,rolling/win);}
 for(let start=0;start<length;start+=1024){const re=new Float64Array(2048),im=new Float64Array(2048);for(let i=0;i<2048;i++)re[i]=(data[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/2047));fft(re,im);for(let k=1;k<=1024;k++){const f=k*buffer.sampleRate/2048,p=re[k]**2+im[k]**2;bands[f<200?0:f<2000?1:f<6000?2:3]+=p;weighted+=p*f;spectral+=p;}}
 }
 let cumulative=0,t95=duration;for(let i=0;i<length;i++){cumulative+=timeline[i];if(cumulative>=energy*.95){t95=i/buffer.sampleRate;break;}}
 out.push({tone:tone.id,source:tone.src,durationMs:Math.round(duration*1000),energy95Ms:Math.round(t95*1000),peakDb:db(peak),rmsDb:db(Math.sqrt(energy/length/buffer.numberOfChannels)),attack20Db:db(Math.sqrt(attack/Math.min(length,Math.round(.02*buffer.sampleRate))/buffer.numberOfChannels)),max20Db:db(Math.sqrt(maxWindow)),centroidHz:Math.round(weighted/spectral),bandsPercent:bands.map(e=>Math.round(e/spectral*1000)/10),gain:gains[tone.id],mixedMax20Db:db(Math.sqrt(maxWindow)*gains[tone.id])});
 }return out;
});writeFileSync('artifacts/groove-sample-analysis.json',JSON.stringify(report,null,2));console.table(report.map(({tone,peakDb,max20Db,centroidHz,bandsPercent,energy95Ms,mixedMax20Db})=>({tone,peak:peakDb.toFixed(1),attack:max20Db.toFixed(1),centroidHz,bands:bandsPercent.join('/'),energy95Ms,mixedAttack:mixedMax20Db.toFixed(1)})));
}finally{await browser.close();}
