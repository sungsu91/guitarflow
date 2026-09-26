import {assert,makePage,goto,route,button,snap,step,finish} from './helpers.mjs';

for(const mobile of [true,false]){
 const p=await makePage(mobile),label=mobile?'mobile':'desktop';
 await step(p,`${label}-metronome`,async()=>{
  await goto(p,'metronome');const panel=p.locator('.standaloneMetronomePanel');
  await button(panel,'BPM 10 올리기').click();await button(panel,'메트로놈 시작').click();
  await button(panel,'메트로놈 정지').waitFor();await p.waitForTimeout(650);await button(panel,'메트로놈 정지').click();
  await button(panel,'2').click();await snap(p,`${label}-metronome-bars`);
  await button(panel,'1').click();await button(panel,'트래커 펼치기').click();
  await panel.locator('.metronomeAdvancedSummary').first().click();
  await p.locator('.metronomeAdvancedPopover').waitFor();await snap(p,`${label}-automator`);
  await p.locator('.metronomeAdvancedPopoverTopbar button').click();
  await panel.locator('.metronomeAdvancedSummary').nth(1).click();await snap(p,`${label}-tracker`);
  await p.locator('.metronomeAdvancedPopoverTopbar button').click();
 });
 await step(p,`${label}-groove-edit-save-load`,async()=>{
  await goto(p,'metronome');const panel=p.locator('.standaloneMetronomePanel');
  await button(panel,'3 그루브').click();const cell=button(panel,'1행 2칸');
  const before=await cell.getAttribute('aria-pressed');await cell.click();assert.notEqual(await cell.getAttribute('aria-pressed'),before);
  await button(panel,'줄 추가').click();assert.equal(await button(panel,'4행 1칸').count(),1);
  await button(panel,'저장').click();let d=p.getByRole('dialog');await d.locator('input[type=text],input:not([type])').first().fill('Desktop parity groove');
  await d.locator('button[type=submit]').click();await d.waitFor({state:'hidden'});
  await panel.locator('.groovePacksTrigger').click();
  d=p.getByRole('dialog');await d.waitFor();await d.locator('#groove-tab-saved').click();
  await d.locator('.groovePackPick').filter({hasText:'Desktop parity groove'}).click();
  await d.locator('.groovePackPreview').first().click();await p.waitForTimeout(700);assert.equal(await d.locator('.groovePackPreview').first().getAttribute('aria-pressed'),'true');
  await snap(p,`${label}-groove-packs`);await button(d,'불러오기').click();
  await button(panel,'메트로놈 시작').click();await p.waitForTimeout(500);await button(panel,'메트로놈 정지').click();
  await route(p,'fretboard');await route(p,'metronome');assert.equal(await button(panel,'4행 1칸').count(),1);
 });
 await step(p,`${label}-tuner`,async()=>{
  await goto(p,'tuner');const tuner=p.locator('.tunerModeShell');
  await tuner.getByRole('button',{name:/악기 선택, 현재/}).click();
  await tuner.getByRole('radio',{name:/^베이스/}).click();
  assert.match(await tuner.getByRole('button',{name:/악기 선택, 현재/}).getAttribute('aria-label'),/베이스/);
  await tuner.getByRole('button',{name:/튜닝 프리셋 선택, 현재/}).click();await snap(p,`${label}-tuner-settings`);
  const auto=tuner.getByRole('button',{name:/^자동/});if(await auto.count())await auto.first().click();
  await p.keyboard.press('Escape');
  await tuner.getByRole('button',{name:/4번 줄 .*수동 선택/}).click();
  const mic=tuner.getByRole('button',{name:/^마이크 (켜기|끄기)$/});await mic.click();await mic.click();
  await snap(p,`${label}-tuner`);
  await route(p,'fretboard');await route(p,'tuner');assert.match(await tuner.getByRole('button',{name:/악기 선택, 현재/}).getAttribute('aria-label'),/베이스/);
 });
 await step(p,`${label}-mini-chord`,async()=>{
  await goto(p,'mini-chord');const panel=p.locator('.miniChordMakerPanelCompact');
  await button(panel,'1마디 1박 코드 설정').click();const editor=p.locator('.miniChordFloatingChordPopover');
  await button(editor,'D').click();await button(editor,'마이너').click();await button(editor,'7').click();await button(editor,'적용').click();
  assert.match(await button(panel,'1마디 1박 코드 설정').innerText(),/Dm7/);
  await panel.getByPlaceholder('제목 입력',{exact:true}).fill('Desktop parity chords');
  await button(panel,'저장').click();await snap(p,`${label}-mini-save`);
  const confirm=p.getByRole('dialog');if(await confirm.count())await confirm.getByRole('button',{name:/저장/}).last().click();
  await button(panel,'미니코드 반주 시작').click();await p.waitForTimeout(600);await button(panel,'미니코드 반주 정지').click();
  await route(p,'fretboard');await route(p,'mini-chord');assert.equal(await panel.getByPlaceholder('제목 입력',{exact:true}).inputValue(),'Desktop parity chords');
  await snap(p,`${label}-mini-chord`);
 });
 await p.close();
}
await finish('tool-flows');
