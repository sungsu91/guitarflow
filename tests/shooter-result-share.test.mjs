import test from 'node:test';
import assert from 'node:assert/strict';
import {shooterShareResult,shareShooterResult,SHOOTER_SHARE_URL} from '../src/shooter/results/shareResult.js';
const result=shooterShareResult(1240,1700),file=new File(['png'],'result.png',{type:'image/png'});
test('result preserves score, includes canonical play link and handles new best',()=>{
 assert.equal(result.score,1240);assert.equal(result.bestScore,1700);assert.match(result.text,/1,240/);assert.equal(result.url,SHOOTER_SHARE_URL);
 assert.equal(shooterShareResult(2000,1700).bestScore,2000);
});
test('native file sharing receives prebuilt PNG, score text and URL immediately',async()=>{
 let called=false;const pending=shareShooterResult(result,file,{canShare:data=>{assert.deepEqual(data,{files:[file]});return true;},share:async data=>{called=true;assert.deepEqual(data,{title:result.title,text:result.text,url:result.url,files:[file]});}});
 assert.equal(called,true);assert.equal(await pending,'shared');
});
test('unsupported PNG falls back to text/link, then clipboard when native share is absent',async()=>{
 let data;assert.equal(await shareShooterResult(result,file,{canShare:()=>false,share:async d=>{data=d;}}),'shared');assert.equal(data.files,undefined);assert.equal(data.url,result.url);
 let copied;assert.equal(await shareShooterResult(result,file,{clipboard:{writeText:async value=>{copied=value;}}}),'copied');assert.equal(copied,result.url);
});
test('Android, iPhone and desktop-mode iPad share a single image item for native preview',async()=>{
 for(const device of [{userAgent:'Mozilla/5.0 (Linux; Android 15)'},{userAgent:'Mozilla/5.0 (Linux; Android 14; SAMSUNG) SamsungBrowser/26.0'},{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'},{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',platform:'MacIntel',maxTouchPoints:5}]){
  let data;
  const nav={...device,canShare:()=>true,share:async value=>{data=value;}};
  assert.equal(await shareShooterResult(result,file,nav),'shared');
  assert.deepEqual(data,{files:[file]});
  assert.equal(await shareShooterResult(result,null,nav),'shared');
  assert.deepEqual(data,{title:result.title,text:result.text,url:result.url});
 }
});
test('desktop browsers retain combined image and link sharing',async()=>{
 for(const device of [{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},{platform:'MacIntel',maxTouchPoints:0}]){
  let data;
  await shareShooterResult(result,file,{...device,canShare:()=>true,share:async value=>{data=value;}});
  assert.deepEqual(data,{title:result.title,text:result.text,url:result.url,files:[file]});
 }
});
test('cancel does not copy or open a second share sheet',async()=>{
 let calls=0;assert.equal(await shareShooterResult(result,file,{canShare:()=>true,share:async()=>{calls++;throw Object.assign(new Error(),{name:'AbortError'});},clipboard:{writeText:()=>assert.fail('unexpected copy')}}),'cancelled');assert.equal(calls,1);
});
test('rejected files try text; denied share and clipboard expose manual link',async()=>{
 let calls=0;assert.equal(await shareShooterResult(result,file,{canShare:()=>true,share:async d=>{calls++;if(d.files)throw new TypeError();}}),'shared');assert.equal(calls,2);
 assert.equal(await shareShooterResult(result,null,{share:async()=>{throw Error();},clipboard:{writeText:async()=>{throw Error();}}}),'manual');
});
