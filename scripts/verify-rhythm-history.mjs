import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const engine=process.env.NAV_BROWSER||'chromium',base=process.env.NAV_URL||'http://127.0.0.1:4193',out=process.env.NAV_OUTPUT||`artifacts/rhythm-history-20260928/${engine}`;await mkdir(out,{recursive:true});
const b=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});const report=[];
try{for(const width of (process.env.NAV_WIDTHS||'360,412,1440').split(',').map(Number)){
 const p=await b.newPage({viewport:{width,height:width<1000?968:1000},isMobile:width<1000,hasTouch:width<1000});p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const screen=async name=>{await p.locator(`.rt-workspace[data-screen="${name}"]`).waitFor({state:'visible'});assert.equal(await p.evaluate(()=>location.hash),'#rhythm-trainer');};
 const back=async name=>{await p.goBack();await screen(name);};const forward=async name=>{await p.goForward();await screen(name);};
 const uiBack=async name=>{await p.locator('.rt-header').getByRole('button',{name:'뒤로',exact:true}).click();await screen(name);};
 await p.goto(base+'/#fretboard');await p.locator('.launchSplash').waitFor({state:'detached'});await p.evaluate(()=>location.hash='#rhythm-trainer');await screen('library');
 if(width<1000){assert.equal(await p.locator('.rt-header').getByRole('button',{name:'메뉴',exact:true}).innerText(),'메뉴');assert.equal(await p.locator('.rt-menu-button svg').count(),1);}
 const buttons=await p.locator('.rt-library-actions button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON()})));assert.equal(buttons.length,3);assert.match(buttons[0].text,/백킹/);assert.equal(buttons[1].text,'가이드실');assert.match(buttons[2].text,/PDF/);for(let i=0;i<3;i++){assert.ok(buttons[i].rect.x>=0&&buttons[i].rect.right<=width);assert.ok(Math.abs(buttons[i].rect.y-buttons[0].rect.y)<2);if(i)assert.ok(buttons[i].rect.x>=buttons[i-1].rect.right);}
 await p.screenshot({path:`${out}/library-${width}.png`});
 await p.locator('.rt-library-actions').getByRole('button',{name:'가이드실',exact:true}).click();await p.getByRole('dialog',{name:'리듬 가이드실',exact:true}).waitFor();await p.getByRole('button',{name:'가이드실 닫기'}).click();
 await p.locator('.rt-library-filters select').first().selectOption('basic');await p.locator('[data-pack="pack-basic-one-three"]').click();await screen('setup');const title=await p.locator('.rt-meta strong').innerText();
 await back('library');assert.equal(await p.locator('.rt-library-filters select').first().inputValue(),'basic');await forward('setup');assert.equal(await p.locator('.rt-meta strong').innerText(),title);
 await uiBack('library');await p.goBack();await p.waitForFunction(()=>location.hash==='#fretboard');assert.equal(await p.locator('.rt-workspace').isVisible(),false);await forward('library');await forward('setup');
 // PDF has a separate history entry; closing it must not consume the pack.
 await p.locator('.rt-header').getByRole('button',{name:/PDF/}).click();await p.locator('.print-preview-overlay').waitFor();await back('setup');await p.locator('.print-preview-overlay').waitFor({state:'detached'});await back('library');await forward('setup');
 // Both native Back and the toolbar restore the editing origin.
 await p.getByRole('button',{name:'복사·편집',exact:true}).click();await screen('edit');await p.getByRole('textbox',{name:'패턴 제목',exact:true}).fill('Discarded via browser Back');await back('setup');assert.equal(await p.locator('.rt-meta strong').innerText(),title);
 await p.getByRole('button',{name:'복사·편집',exact:true}).click();await screen('edit');await p.getByRole('textbox',{name:'패턴 제목',exact:true}).fill('Saved through history');await p.getByRole('button',{name:'변경 내용 저장 →',exact:true}).click();await screen('setup');assert.equal(await p.locator('.rt-meta strong').innerText(),'Saved through history');await back('library');
 // Reopening another pack truncates the old forward path and stays in trainer.
 await p.locator('[data-pack="pack-eighths-foundation"]').click();await screen('setup');await p.getByRole('button',{name:'1마디부터 재생',exact:true}).click();await screen('play');await back('setup');assert.equal(await p.locator('.rt-transport').count(),0);await back('library');
 await p.getByRole('button',{name:'내가 만든 팩',exact:true}).click();await p.getByRole('button',{name:'＋ 신규 생성',exact:true}).click();await screen('edit');await p.getByRole('textbox',{name:'패턴 제목',exact:true}).fill('New navigation pack');await p.getByRole('button',{name:'변경 내용 저장 →',exact:true}).click();await screen('setup');await back('library');assert.equal(await p.getByRole('button',{name:'내가 만든 팩',exact:true}).getAttribute('class'),'selected');
 assert.deepEqual(errors,[]);report.push({engine,width,packBack:true,forward:true,toolbarBack:true,routeReentry:true,filters:true,pdfBack:true,editCancel:true,editSave:true,newPack:true,playbackBack:true,libraryActions:true});console.log(JSON.stringify(report.at(-1)));await p.close();
}await writeFile(out+'/verification.json',JSON.stringify(report,null,2));}finally{await b.close();}
