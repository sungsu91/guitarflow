import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();
 const select=page.getByRole('combobox',{name:'한 줄 마디 수',exact:true});await select.selectOption('4');
 assert.equal(await select.inputValue(),'4');assert.equal(await page.getByRole('button',{name:'악보 보기 설정',exact:true}).count(),0);assert.equal(await page.locator('#etude-notation-options').count(),0);
 await page.locator('.etudeNotation svg').waitFor();await page.screenshot({path:'output/landscape-bar-dropdown.png'});
 await select.selectOption('2');assert.equal(await select.inputValue(),'2');console.log('Landscape direct bar dropdown OK');
}finally{await browser.close();}
