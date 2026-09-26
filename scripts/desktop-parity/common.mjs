import {assert,makePage,goto,route,button,snap,step,finish} from './helpers.mjs';
for(const mobile of [true,false]){
 const p=await makePage(mobile),label=mobile?'mobile':'desktop';
 await p.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.parityCopied=text;}},configurable:true});});
 await step(p,`${label}-menu-settings-help-share`,async()=>{
  await goto(p,'fretboard');
  if(mobile){await p.locator('.integratedBottomNav button[aria-controls="utility-menu-panel"]').click();await button(p,'설정').click();await p.getByRole('radio',{name:'English',exact:true}).click();}
  else await p.locator('.desktopSidebarLanguage select').selectOption('en');
  assert.equal(await p.locator('html').getAttribute('lang'),'en');
  const dark=p.locator(mobile?'.utilitySettingsSheet [role=radiogroup]':'.desktopSidebarThemeOptions').getByRole('radio').last();await dark.click();await p.waitForTimeout(1500);assert.match(await p.locator('main.app:not([role=presentation])').getAttribute('class'),/theme-brand/);
  if(mobile)await button(p,'Back to menu').click();
  const menu=p.locator(mobile?'.utilityMenuFooter':'.desktopSidebar');await menu.locator('.utilityShareMenu summary').click();await menu.getByRole('button',{name:'Share',exact:true}).click();await p.waitForFunction(()=>Boolean(window.parityCopied));assert.match(await p.evaluate(()=>window.parityCopied),/#shooter/);
  await menu.getByRole('button',{name:/^Help|User Guide|Guide.*Help/i}).click();const help=p.locator('.helpGuidePanel');await help.waitFor();const sections=help.locator('.helpAccordionTrigger');assert.ok(await sections.count()>=8);for(const item of await sections.all()){await item.click();assert.equal(await item.getAttribute('aria-expanded'),'true');}
  await snap(p,`${label}-help-en-dark`);await button(help,'Close').click();
  if(mobile){if(!await button(p,'Settings').isVisible())await p.locator('.integratedBottomNav button[aria-controls="utility-menu-panel"]').click();await button(p,'Settings').click();await p.getByRole('radio',{name:'한국어',exact:true}).click();}
  else await p.locator('.desktopSidebarLanguage select').selectOption('ko');
  await p.getByRole('radio',{name:/화이트/}).first().click();await p.waitForTimeout(1500);assert.match(await p.locator('main.app:not([role=presentation])').getAttribute('class'),/theme-light/);
  await p.reload();assert.equal(await p.locator('html').getAttribute('lang'),'ko');await p.waitForFunction(()=>document.querySelector('main.app.theme-light'));
 });
 await step(p,`${label}-hidden-editor-does-not-cover-next-mode`,async()=>{
  await goto(p,'mini-chord');await button(p,'1마디 1박 코드 설정').click();await p.locator('.miniChordFloatingChordPopover').waitFor();await route(p,'metronome');assert.equal(await p.locator('.miniChordFloatingChordPopover').isVisible(),false);await button(p,'메트로놈 시작').click();await button(p,'메트로놈 정지').click();await route(p,'mini-chord');await p.locator('.miniChordFloatingChordPopover').waitFor();
 });
 await step(p,`${label}-tuner-input-release`,async()=>{
  await goto(p,'tuner');await p.waitForTimeout(600);await route(p,'fretboard');await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.parityStreams.flatMap(s=>s.getTracks()).filter(t=>t.readyState==='live').length),0);
 });
 await p.close();
}
const denied=await makePage(true);
await denied.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='rifflab-rhythm-display')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,key,value);};});
await step(denied,'rhythm-storage-failure-keeps-app-usable',async()=>{await goto(denied,'rhythm-trainer');await denied.locator('.rt-card').first().click();await denied.getByRole('button',{name:/BPM · 연습 시작/}).click();await button(denied,'일시정지').click();assert.equal(denied.errors.length,0);});
await denied.close();
await finish('common-flows');
