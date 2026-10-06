import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out]=process.argv.slice(2),file=JSON.parse(await readFile(manifestPath)).cases[3].path;await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),results=[];
try{for(const mobile of [true,false]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>localStorage.setItem('language','ko'));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#etudes`);await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();}
  const dialog=page.locator(mobile?'.mobilePdfTabImport':'.desktopPdfTabImport');await dialog.waitFor();
  assert.equal(await dialog.locator('input[capture]').count(),mobile?1:0);
  await dialog.getByRole('radio',{name:'TAB → TAB',exact:true}).check();await dialog.locator('input[type=file]').first().setInputFiles(file);
  await dialog.getByRole('button',{name:'영역 조정',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.photoScanPreview [role=status]')?.textContent.includes('준비'));
  const ratio=await dialog.locator('.photoScanFrame canvas').evaluate(el=>{const box=el.getBoundingClientRect();return {shown:box.width/box.height,pixels:el.width/el.height}});assert(Math.abs(ratio.shown-ratio.pixels)<.015,'preview must preserve the photographed aspect ratio');
  const handles=await dialog.locator('.photoScanCorner').all();assert.equal(handles.length,4);
  for(const handle of handles){const box=await handle.boundingBox();assert(box.width>=28&&box.width<=48);assert(box.height>=28&&box.height<=48);}
  await dialog.locator('.photoScanFrame').scrollIntoViewIfNeeded();
  for(const theme of ['light','classic-gold']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const color=await dialog.evaluate(el=>getComputedStyle(el).color);if(theme==='classic-gold')assert.equal(color,'rgb(244, 238, 227)');await page.waitForFunction(expected=>getComputedStyle(document.querySelector('.photoScanPreview p button')).color===expected,color);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${theme}.png`,animations:'disabled'});}
  const footer=await dialog.locator('footer').boundingBox();for(const handle of handles){const box=await handle.boundingBox();assert(box.y+box.height<=footer.y,'crop corners must stay clear of the fixed action bar');}assert(footer.y>=0&&footer.y+footer.height<=page.viewportSize().height+1);
  await dialog.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual(errors,[]);results.push({mobile,passed:true,errors});
 }catch(e){await page.screenshot({path:`${out}/failure.png`});await writeFile(out+'/failure.txt',e.message+'\n'+await page.locator('body').innerText());throw e;}finally{await page.close();}
}}finally{await writeFile(out+'/report.json',JSON.stringify(results,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(results));
