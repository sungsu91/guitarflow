import {assert,makePage,goto,route,button,snap,step,finish} from './helpers.mjs';

for(const mobile of [true,false]){
 const page=await makePage(mobile),label=mobile?'mobile':'desktop';
 await step(page,`${label}-fretboard-chord`,async()=>{
  await goto(page,'fretboard');
  const viewer=page.locator('.viewerControlPanel');
  await button(viewer,'D').click();await button(viewer,'Minor').click();await button(viewer,'7').click();
  assert.match(await page.locator('.viewerChordIdentity').innerText(),/Dm7/);
  const board=page.locator('.viewerFretboardGestureSurface');await board.focus();await page.keyboard.press('ArrowRight');
  await viewer.locator('.viewerChordSoundButton').click();
  await button(viewer,'전체보기').click();
  const card=page.locator('.chordMiniCard').filter({hasText:'C'}).first();await card.click();
  await page.waitForFunction(()=>document.querySelector('.viewerChordIdentity strong')?.textContent==='C');
  await snap(page,`${label}-fretboard`);
 });
 await step(page,`${label}-fretboard-note-scale`,async()=>{
  const viewer=page.locator('.viewerControlPanel');
  await button(viewer,'음표').click();
  await snap(page,`${label}-notes`);
  await viewer.locator('.viewerModeTabs button').nth(2).click();
  const choices=viewer.locator('select');
  if(await choices.count())await choices.first().selectOption({index:1});
  await route(page,'metronome');await route(page,'fretboard');
  assert.equal(await viewer.locator('.viewerModeTabs button').nth(2).getAttribute('aria-pressed'),'true');
  await snap(page,`${label}-scales`);
 });
 for(const mode of ['stage1','stage2'])await step(page,`${label}-${mode}`,async()=>{
  await goto(page,mode);
  const panel=page.locator('.referenceTrainingPanel');
  const toggle=panel.locator('.trainingNoteGuideToggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');await toggle.click();
  await button(panel,'BPM 10 올리기').click();
  await button(panel,'연습 시작').click();await page.waitForTimeout(900);
  await snap(page,`${label}-${mode}`);
  const running=panel.getByRole('button',{name:/일시정지|연습 정지|정지|멈추기/});
  assert.ok(await running.count(),'running transport must expose stop/pause');await running.first().click();
  await route(page,'fretboard');await route(page,mode);
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 });
 await page.close();
}
await finish('basic-flows');
