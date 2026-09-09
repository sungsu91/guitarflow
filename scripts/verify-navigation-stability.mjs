import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/navigation',{recursive:true});const report=[];
try {for(const width of [360,390,430,1440]){
const mobile=width<1024;const page=await browser.newPage({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.NAVIGATION_TEST_URL || 'http://127.0.0.1:5173'}/#metronome`);const nav=mobile?'.modeSwitch':'.desktopSidebar';await page.locator(nav).waitFor();await page.waitForTimeout(2500);
await page.evaluate(nav=>{window.savedNavigation=document.querySelector(nav);window.navigationFrames=[];function sample(){const n=window.savedNavigation;const app=document.querySelector('main.app:not(.mobileNavigationSurface)');const c=getComputedStyle(app);window.navigationFrames.push({mode:location.hash,rect:n.getBoundingClientRect().toJSON(),transform:c.transform,canonical:document.documentElement.classList.contains('shooterCanonicalMobile')});window.navigationFrame=requestAnimationFrame(sample)}sample()},nav);
const states=[];
for(const name of ['메트로놈','슈팅게임','지판 보기','튜너','메트로놈','튜너','지판 보기']){
await page.locator(mobile?'.modeSwitch button':'.desktopSidebarNavItem').filter({hasText:name}).click();await page.mouse.move(900,5);await page.waitForTimeout(250);
states.push(await page.evaluate(({nav,name})=>({name,sameNode:window.savedNavigation===document.querySelector(nav),rect:document.querySelector(nav).getBoundingClientRect().toJSON(),background:getComputedStyle(document.querySelector(nav)).background,overflow:document.documentElement.scrollWidth>innerWidth}),{nav,name}));
if(['튜너','슈팅게임'].includes(name))await page.screenshot({path:`artifacts/navigation/after-${width}-${name}.png`});
}
const frames=await page.evaluate(()=>{cancelAnimationFrame(window.navigationFrame);return window.navigationFrames});assert.ok(states.every(s=>s.sameNode),'navigation remains mounted');assert.ok(states.every(s=>!s.overflow),'no horizontal overflow');
const base=states[0].rect;for(const f of frames)for(const axis of ['x','y','width','height'])assert.ok(Math.abs(f.rect[axis]-base[axis])<0.1,`${width} ${f.mode} navigation ${axis}: ${f.rect[axis]} vs ${base[axis]}`);
if(mobile)assert.ok(frames.filter(f=>f.canonical).every(f=>f.transform!=='none'),'canonical canvas always scaled before paint');assert.deepEqual(errors,[]);report.push({width,states,frames:frames.length});await page.close();}
await writeFile('artifacts/navigation/verification.json',JSON.stringify(report,null,2));console.log('PASS: persistent navigation, stable every-frame geometry, entry scaling, overflow, runtime errors at 360/390/430/1440px');}finally{await browser.close()}
