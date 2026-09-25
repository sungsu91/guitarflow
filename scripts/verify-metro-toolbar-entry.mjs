import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/metro-toolbar-entry',{recursive:true});const report=[];
try{for(const [width,height] of [[320,740],[390,844],[440,956],[844,390],[1440,900]]){
 const mobile=width!==1440,p=await b.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');const button=p.locator('.etudeViewTools [data-ui=metronome]');await button.waitFor();
 const measure=()=>button.evaluate(e=>({button:e.getBoundingClientRect().toJSON(),icon:e.querySelector('svg').getBoundingClientRect().toJSON(),text:e.textContent}));
 const check=async()=>{const g=await measure();assert.ok(g.button.left>=0&&g.button.right<=width);assert.ok(g.icon.left>=g.button.left&&g.icon.right<=g.button.right);if(mobile)assert.ok(Math.abs((g.icon.left+g.icon.right)-(g.button.left+g.button.right))<2);return g;};
 const initial=await check();if(mobile){assert.equal(initial.text,'');await button.evaluate(e=>e.style.setProperty('font-size','13px','important'));await check();}else assert.equal(initial.text,'BPM');
 await button.click();assert.equal(await button.getAttribute('aria-pressed'),'false');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await check();
 await p.reload();await button.waitFor();await check();
 await p.locator('.launchSplash').waitFor({state:'hidden'});await check();await p.screenshot({path:`artifacts/metro-toolbar-entry/${width}.png`});assert.deepEqual(errors,[]);report.push({width,height,initial,errors});console.log('PASS',width,'initial entry, label independence, toggle and reload');await p.close();
}}finally{await writeFile('artifacts/metro-toolbar-entry/verification.json',JSON.stringify(report,null,2));await b.close();}
