import {assert,makePage,goto,route,button,snap,step,finish,out,controls} from './helpers.mjs';
for(const mobile of [true,false]){
 const p=await makePage(mobile,mobile?360:1440,mobile?800:900),label=mobile?'mobile':'desktop';
 await p.addInitScript(()=>localStorage.setItem('language','en'));
 await step(p,`${label}-guide-all-meters-play-return`,async()=>{
  await goto(p,'rhythm-trainer');await button(p,'Guide room').click();const guide=p.locator('.rt-guide');
  for(const meter of ['2/4','3/4','4/4','6/8','9/8','12/8']){await guide.locator('.rt-guide-meter select').selectOption(meter);assert.doesNotMatch(await guide.innerText(),/[가-힣]/);await button(guide,'▶ Loop pattern').click();await button(guide,'Ⅱ Stop listening').click();}
  await guide.locator('.rt-guide-select > label select').selectOption('tuplets');await guide.locator('nav button').last().click();await button(guide,'▶ Loop pattern').click();await route(p,'metronome');assert.equal(await guide.isVisible(),false);await route(p,'rhythm-trainer');await button(guide,'▶ Loop pattern').click();await button(guide,'Ⅱ Stop listening').click();
  await snap(p,`${label}-rhythm-guide-en`);await button(guide,'Close rhythm guide').click();
 });
 await step(p,`${label}-rhythm-print-pdf-download`,async()=>{
  await goto(p,'rhythm-trainer');await p.locator('.rt-card').first().click();await button(p,'Print · PDF').click();await button(p,'Save PDF').click();await p.locator('.rt-pdf-filename input').fill('Parity printed rhythm');
  const [download]=await Promise.all([p.waitForEvent('download',{timeout:60000}),button(p,'Save with this name').click()]);assert.match(download.suggestedFilename(),/\.pdf$/);await download.saveAs(`${out}/fixtures/${label}-rhythm-print.pdf`);
  assert.equal(await p.locator('.rt-pdf-filename').count(),0);
 });
 await step(p,`${label}-score-instrument-controls`,async()=>{
  await p.evaluate(()=>localStorage.setItem('language','ko'));await p.addInitScript(()=>localStorage.setItem('language','ko'));await goto(p,'etudes');await button(p,'악보 작업').click();await p.getByRole('menuitem',{name:'제작',exact:true}).click();const editor=p.locator('[data-ui=score-editor]');
  for(const instrument of ['bass','ukulele','piano','drums','guitar']){await editor.locator('.scoreInstrumentSelect').selectOption(instrument);if(await button(p,'저장하지 않고 변경').isVisible()){await button(p,'저장하지 않고 변경').click();}assert.equal(await editor.locator('.scoreInstrumentSelect').inputValue(),instrument);assert.ok(await editor.locator('svg').count()>0);if(instrument==='piano')await editor.locator('.scorePianoKeys button').first().click();else if(instrument==='drums')await editor.locator('.drumPiece.drum-snare').click();else await button(editor,'프렛 3').click();await snap(p,`${label}-score-${instrument}`);}
  await button(editor,'프렛 3').click();await editor.locator('.etudeEditorSave').click();const dialog=p.locator('.scoreSaveDialog');await dialog.getByRole('textbox').first().fill('Small viewport saved score');
  if(mobile)await p.setViewportSize({width:360,height:480});await dialog.locator('button[type=submit]').click();await dialog.waitFor({state:'hidden'});if(mobile)await p.setViewportSize({width:360,height:800});
  await snap(p,`${label}-score-saved-short-viewport`);
 });
 await p.close();
}
await finish('detail-flows');
