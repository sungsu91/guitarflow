import {assert,makePage,goto,step,finish} from './helpers.mjs';
const core=['tuner','fretboard','metronome','shooter'];
const menu=['rhythm-trainer','etudes','stage1','stage2','stage3','mini-chord','audio-studio'];
for(const mobile of [true,false]){
 const p=await makePage(mobile);
 await step(p,`${mobile?'mobile':'desktop'}-all-navigation-buttons`,async()=>{
  await goto(p,'fretboard');
  for(const [index,mode] of [...core,...menu].entries()){
   if(mobile){
    if(index<4)await p.locator('.integratedBottomNav>button').nth(index).click();
    else{const bottom=p.locator('.integratedBottomNav button[aria-controls="utility-menu-panel"]');if(await bottom.isVisible())await bottom.click();else await p.getByRole('button',{name:/^(메뉴|메뉴 열기|전체 메뉴|☰)$/}).first().click();await p.locator('.utilityMenuList button').nth(index-4).click();}
   }else await p.locator('.desktopSidebarNavItem').nth(index).click();
   await p.waitForFunction(mode=>location.hash==='#'+mode,mode);assert.equal(new URL(p.url()).hash,'#'+mode);
  }
  assert.deepEqual(p.errors,[]);
 });await p.close();
}
await finish('navigation-flows');
