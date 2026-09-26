import {makePage,goto,button,snap,browser,assert,route,out} from './helpers.mjs';
import {writeFile} from 'node:fs/promises';
const p=await makePage(false),checks=[];
await goto(p,'fretboard');await snap(p,'final-desktop-fretboard');
await goto(p,'metronome');await button(p.locator('.standaloneMetronomePanel'),'3 그루브').click();await snap(p,'final-desktop-groove');
await goto(p,'audio-studio');await button(p,'편집실').click();await p.locator('input.audioStudioFileInput').setInputFiles(`${out}/fixtures/test-tone.wav`);await p.getByRole('button',{name:'test-tone 구간 다듬기',exact:true}).waitFor();await snap(p,'final-desktop-audio-editor');
await p.getByRole('button',{name:'test-tone 구간 다듬기',exact:true}).click();assert.equal(await p.getByRole('switch',{name:'TIME STRETCH'}).count(),1);await snap(p,'final-desktop-audio-trim');await p.close();
for(const [width,height]of [[360,800],[375,812],[390,844],[393,852],[430,932],[1280,720],[1366,768],[1440,900],[1920,1080]])for(const language of ['ko','en'])for(const theme of ['light','brand']){
 const mobile=width<1024,q=await makePage(mobile,width,height);await q.addInitScript(({language,theme})=>{localStorage.setItem('language',language);localStorage.setItem('rifflabThemeMode',theme);},{language,theme});await goto(q,'rhythm-trainer');await button(q,language==='ko'?'가이드실':'Guide room').click();
 const data=await q.locator('.rt-guide').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{width:r.width,height:r.height,position:s.position,background:s.backgroundColor,color:s.color,overflow:e.scrollWidth-e.clientWidth,buttons:[...e.querySelectorAll('button')].filter(b=>b.scrollWidth>b.clientWidth+3).map(b=>b.textContent)}});assert.ok(data.overflow<=1);assert.deepEqual(data.buttons,[]);assert.equal(data.position,'fixed');if(mobile){assert.ok(Math.abs(data.width-width)<1);assert.ok(Math.abs(data.height-height)<1);}if(theme==='brand')assert.equal(data.background,'rgb(44, 49, 55)');checks.push({mobile,viewport:[width,height],language,theme,...data,errors:q.errors});await snap(q,`final-guide-${width}-${language}-${theme}`);await q.close();console.log(`${width} ${language} ${theme} PASS`);
}
await writeFile(`${out}/final-visual-checks.json`,JSON.stringify(checks,null,2));await browser.close();
