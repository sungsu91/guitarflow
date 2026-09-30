import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/pdf-tab-import',{recursive:true});
try{
 for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5174/#etudes',{waitUntil:'networkidle'});
 await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 await writeFile(`artifacts/pdf-tab-import/buttons-${mobile}.json`,JSON.stringify(await p.getByRole('button').allTextContents()));
 if(!mobile)await p.getByRole('button',{name:'제작',exact:true}).click();else {await p.getByRole('button',{name:'악보 작업',exact:true}).click();await p.getByRole('menuitem',{name:/제작|만들기/}).click();}
 await p.locator('.etudeEditor').waitFor();
 const entry=p.getByRole('button',{name:'PDF에서 TAB 초안 생성',exact:true});assert.equal(await entry.count(),mobile?0:1);
 if(!mobile){await entry.click();await p.getByRole('dialog',{name:'PDF에서 TAB 초안 생성',exact:true}).waitFor();await p.screenshot({path:'artifacts/pdf-tab-import/desktop-dialog.png'});await p.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await p.locator('.desktopPdfTabImport').count(),0);}
 await p.screenshot({path:`artifacts/pdf-tab-import/${mobile?'mobile-390':'desktop-editor'}.png`});
 console.log({mobile,errors,buttons:await p.getByRole('button').count()});assert.deepEqual(errors,[]);await p.close();
 }
}finally{await b.close();}
