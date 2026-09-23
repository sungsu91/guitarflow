import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await mkdir('artifacts/print-alignment',{recursive:true});
try{for(const width of [390,1440]){
 const p=await browser.newPage({viewport:{width,height:900}});await p.goto('http://127.0.0.1:5173/#etudes');
 const ready=p.waitForEvent('popup');await p.evaluate(async()=>{const {daylightDocument}=await import('/src/etudes/daylightFingerstyle.js');const {printEditorScore}=await import('/src/etudes/printScore.js');const d=structuredClone(daylightDocument);d.viewSettings={...d.viewSettings,measuresPerRow:4};printEditorScore(document.body,d.title,'tab',d);});const popup=await ready;
 await popup.waitForSelector('body[data-preview-ready="true"]');
 const rows=await popup.locator('.a4Sheet section').evaluateAll(sections=>sections.map(section=>[...section.querySelectorAll('svg')].map(svg=>{const number=svg.querySelector('.etudeMeasureNumber'),point=svg.createSVGPoint();point.x=0;point.y=Number(number.getAttribute('y'))+4;return point.matrixTransform(svg.getScreenCTM()).y;})));
 for(const row of rows)assert.ok(Math.max(...row)-Math.min(...row)<.5,JSON.stringify(row));
 await popup.screenshot({path:`artifacts/print-alignment/preview-${width}.png`,fullPage:true});console.log('PASS',width,rows.length,'aligned systems');await popup.close();await p.close();
}}finally{await browser.close();}
