import {makePage,goto,button,controls,snap,browser,out} from './helpers.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir(`${out}/fixtures`,{recursive:true});
const rate=16000, count=rate*3, wav=Buffer.alloc(44+count*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(Math.sin(2*Math.PI*220*i/rate)*6000,44+i*2);
await writeFile(`${out}/fixtures/test-tone.wav`,wav);
const p=await makePage(false);
async function record(name){await snap(p,`inspect-${name}`);await writeFile(`${out}/inspect-${name}.json`,JSON.stringify(await controls(p),null,2));console.log(name);}
try{
 await goto(p,'etudes');await button(p,'악보 작업').click();await p.getByRole('menuitem',{name:'제작',exact:true}).click();await p.locator('[data-ui=score-editor]').waitFor();await record('score-editor');
 await goto(p,'audio-studio');await button(p,'편집실').click();await p.locator('input[type=file].audioStudioFileInput').setInputFiles(`${out}/fixtures/test-tone.wav`);await p.waitForTimeout(1200);await record('audio-import');await button(p,'하나로 저장').click();await record('audio-save');
 await goto(p,'rhythm-trainer');await p.locator('.rt-card').first().click();await button(p,'복사·편집').click();await record('rhythm-editor');
 const beat=p.locator('.rt-score-scroll [role=button]').first();await beat.click();await record('rhythm-beat');
 await goto(p,'shooter');await record('shooter');
}finally{await browser.close();}
