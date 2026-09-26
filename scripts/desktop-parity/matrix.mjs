import {makePage,goto,route,snap,browser,out} from './helpers.mjs';
import {writeFile} from 'node:fs/promises';
const sizes=[[360,800],[375,812],[390,844],[393,852],[430,932],[1280,720],[1366,768],[1440,900],[1920,1080]];
const routes=process.env.PARITY_ROUTES?.split(',')||['fretboard','stage1','stage2','stage3','metronome','tuner','mini-chord','rhythm-trainer','etudes','audio-studio','shooter'];
const phase=process.env.PARITY_MATRIX_FILE||'matrix';
const results=[];
for(const [width,height] of sizes)for(const language of ['ko','en'])for(const theme of ['light','brand']){
 const p=await makePage(width<1024,width,height);
 await p.addInitScript(({language,theme})=>{localStorage.setItem('language',language);localStorage.setItem('rifflabThemeMode',theme);},{language,theme});
 try{
  await goto(p,routes[0]);
  for(const mode of routes){
   if(mode!==routes[0])await route(p,mode);
   await p.waitForTimeout(mode==='etudes'||mode==='shooter'?700:120);
   const data=await p.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]');};
    const clipped=[...document.querySelectorAll('button,summary')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).overflowX==='hidden').map(e=>({name:(e.getAttribute('aria-label')||e.textContent).trim().slice(0,90),width:e.clientWidth,scroll:e.scrollWidth}));
    return {layout:document.documentElement.dataset.rifflabLayout,lang:document.documentElement.lang,appClass:document.querySelector('main.app')?.className,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,clipped,visibleRoots:[...document.querySelectorAll('main.app>section')].filter(visible).map(e=>e.className)};
   });
   results.push({width,height,language,theme,mode,...data,...(!data.appClass?{error:'Application root is missing'}:{}),errors:[...p.errors]});
   if(width===1440||(width===390&&language==='en'&&theme==='light'))await snap(p,`${phase}-${width}-${language}-${theme}-${mode}`);
  }
  console.log(`${width}x${height} ${language} ${theme} done`);
 }catch(error){results.push({width,height,language,theme,error:error.message,errors:p.errors});}
 finally{await p.close();await writeFile(`${out}/${phase}.json`,JSON.stringify(results,null,2));}
}
await browser.close();
const bad=results.filter(r=>r.error||r.errors?.length||r.overflow>1);console.log(JSON.stringify({states:results.length,bad:bad.length,clipped:results.filter(r=>r.clipped?.length).length}));if(bad.length)process.exitCode=1;
