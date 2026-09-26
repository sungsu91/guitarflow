import {assert,makePage,goto,route,button,snap,step,finish,out} from './helpers.mjs';
for(const mobile of [true,false]){
 const p=await makePage(mobile),label=mobile?'mobile':'desktop';
 await step(p,`${label}-rhythm-edit-save-play`,async()=>{
  await goto(p,'rhythm-trainer');await p.locator('.rt-card').first().click();await button(p,'복사·편집').click();
  await p.getByRole('textbox',{name:'패턴 제목'}).fill('Parity rhythm');
  await p.locator('.rt-score-scroll [role=button]').first().click();let d=p.locator('.rt-dialog');
  await button(d,'8분 + 8분').click();await d.waitFor({state:'hidden'});
  await button(p,'변경 내용 저장 →').click();assert.equal(await p.locator('.rt-meta strong').innerText(),'Parity rhythm');
  await button(p,'시작 설정').click();d=p.locator('.rt-dialog');await d.locator('input[type=checkbox]').last().uncheck();await button(d,'적용하기').click();
  await p.getByRole('button',{name:/BPM · 연습 시작/}).click();await button(p,'일시정지').waitFor();await p.waitForTimeout(800);await button(p,'일시정지').click();
  await button(p,'재생').click();await p.waitForTimeout(300);await route(p,'fretboard');await route(p,'rhythm-trainer');await button(p,'재생').waitFor();
  await button(p,'재생').click();await button(p,'일시정지').click();await button(p,'뒤로').click();
  await button(p,'인쇄 · PDF').click();await p.locator('.rt-print-page').waitFor();await snap(p,`${label}-rhythm-print`);await button(p.locator('.rt-dialog'),'닫기').click();
  await button(p,'뒤로').click();await button(p,'내가 만든 팩').click();assert.equal(await p.locator('.rt-card').filter({hasText:'Parity rhythm'}).count(),1);
  await p.reload();await button(p,'내가 만든 팩').click();await p.locator('.rt-card').filter({hasText:'Parity rhythm'}).waitFor();await snap(p,`${label}-rhythm-saved`);
 });
 await step(p,`${label}-stage3-edit-save-load`,async()=>{
  await goto(p,'stage3');await button(p,'LOAD').click();let d=p.locator('.stage3StorageDialog');
  await button(d,'D').click();await button(d,'Minor').click();await button(d,'4박 추가').click();
  await button(d,'저장').click();d=p.locator('.stage3StorageSaveTitleDialog');await d.locator('input').fill('Parity progression');await button(d,'저장').click();
  await d.waitFor({state:'hidden'});await button(p,'연습 시작').click();await p.waitForTimeout(650);
  await p.locator('.stage3BpmStartButton').click();await snap(p,`${label}-stage3`);
  await button(p,'LOAD').click();await p.locator('.stage3StorageDialog').getByRole('button',{name:'저장된 코드 진행 불러오기',exact:true}).click();
  await p.getByRole('option').filter({hasText:'Parity progression'}).click();
  await button(p,'저장된 코드 진행 닫기').click();await route(p,'fretboard');await route(p,'stage3');assert.match(await p.locator('.currentProgressionReadout').innerText(),/Dm/);
 });
 await step(p,`${label}-score-edit-save-play-export`,async()=>{
  await goto(p,'etudes');await button(p,'악보 작업').click();await p.getByRole('menuitem',{name:'제작',exact:true}).click();let editor=p.locator('[data-ui=score-editor]');await editor.waitFor();
  await button(editor,'프렛 3').click();await button(editor,'다음 입력 위치').click();await button(editor,'프렛 5').click();
  await editor.locator('.etudeEditorSave').click();const d=p.locator('.scoreSaveDialog');await d.getByRole('textbox').first().fill('Parity guitar score');await d.locator('button[type=submit]').click();
  await button(editor,'악보 재생').click();await p.waitForTimeout(500);await editor.locator('.editorPlay').click();
  await snap(p,`${label}-score-editor`);
  if(!mobile){const download=p.waitForEvent('download');await button(editor,'파일 내려받기').click();const file=await download;assert.match(file.suggestedFilename(),/json/i);await file.saveAs(`${out}/fixtures/${label}-score.json`);}
  if(mobile)await editor.locator('.mobileScoreHeader > button').first().click();else await button(editor,'닫기').click();await button(p,'내 저장 악보').click();await p.locator('.etudePickerCard').filter({hasText:'Parity guitar score'}).click();await button(p.locator('.etudeSongPicker'),'불러오기').click();
  await route(p,'fretboard');await route(p,'etudes');await p.getByText('Parity guitar score',{exact:true}).first().waitFor();
 });
 await step(p,`${label}-audio-import-trim-save-reload`,async()=>{
  await goto(p,'audio-studio');await button(p,'편집실').click();await p.locator('input.audioStudioFileInput').setInputFiles(`${out}/fixtures/test-tone.wav`);
  await p.getByRole('button',{name:'test-tone 구간 다듬기',exact:true}).click();let d=p.locator('.audioStudioSimpleTrimDialog');
  const start=d.locator('[data-trim-handle=start]');await start.focus();await p.keyboard.press('ArrowRight');assert.ok(Number(await start.getAttribute('aria-valuenow'))>0);
  await button(d,'적용').click();await button(p,'전체 재생').click();await p.waitForTimeout(550);await button(p,'일시정지').click();
  await button(p,'하나로 저장').click();d=p.getByRole('dialog');await d.getByRole('textbox').fill('Parity mix');
  if(!mobile){await p.setViewportSize({width:390,height:844});assert.equal(await d.getByRole('textbox').inputValue(),'Parity mix');await p.setViewportSize({width:1440,height:900});}
  await button(d,'하나로 저장').click();await d.waitFor({state:'hidden',timeout:20000});
  const row=p.locator('.audioStudioMixRow').filter({hasText:'Parity mix'});await row.waitFor();await row.locator('.audioStudioMixPlay').click();await p.waitForTimeout(400);assert.equal(await row.locator('.audioStudioMixPlay').getAttribute('aria-pressed'),'true');await row.locator('.audioStudioMixPlay').click();
  const download=p.waitForEvent('download');await row.getByRole('button',{name:/기기로 다운로드/}).click();assert.match((await download).suggestedFilename(),/\.wav$/);
  await snap(p,`${label}-audio-library`);await p.reload();await p.locator('.audioStudioMixRow').filter({hasText:'Parity mix'}).waitFor();
 });
 await p.close();
}
await finish('editor-flows');
