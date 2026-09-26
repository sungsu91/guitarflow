import {assert,makePage,goto,route,button,snap,step,finish,out} from './helpers.mjs';
import {readFile} from 'node:fs/promises';
import {readBackup} from '../../src/pdf/pdfLibrary.js';
for(const mobile of [true,false]){
 const p=await makePage(mobile),label=mobile?'mobile':'desktop';
 await step(p,`${label}-pdf-import-edit-backup`,async()=>{
  await goto(p,'etudes');await p.locator('.pdfStudio > input[type=file]').first().setInputFiles('tmp/pdfs/pdf-practice-24pages.pdf');const d=p.locator('.pdfDialog');await d.getByRole('textbox').first().fill('Parity PDF');await d.locator('button[type=submit]').click();
  const view=p.locator('.pdfPractice');await view.waitFor();await button(p,'다음 PDF 페이지').click();await button(p,'이전 PDF 페이지').click();
  await button(p,'PDF 간단 편집').click();await button(p,'텍스트').click();const paper=p.locator('.pdfPaper').first();await paper.click({position:{x:100,y:160}});
  const text=p.locator('.pdfInlineText input').first();await text.fill('Parity note');await button(p,'메모 저장').click();
  await snap(p,`${label}-pdf-note`);
  if(mobile)await p.locator('.mobilePdfHud button[aria-expanded]').click();
  const [file]=await Promise.all([p.waitForEvent('download',{timeout:30000}),button(p,'연습 파일 저장').first().click()]);await file.saveAs(`${out}/fixtures/${label}.fretiva-pdf`);assert.match(file.suggestedFilename(),/fretiva-pdf$/);
  const [{record,pdfBlob}]=await readBackup(new Blob([await readFile(`${out}/fixtures/${label}.fretiva-pdf`)]));assert.equal(record.pageEdits[1].notes[0].text,'Parity note');assert.deepEqual(Buffer.from(await pdfBlob.arrayBuffer()),await readFile('tmp/pdfs/pdf-practice-24pages.pdf'));
  await route(p,'fretboard');await route(p,'etudes');await view.waitFor();await button(p,'PDF 연습 시작 정지').click();await p.waitForTimeout(700);await button(p,'PDF 연습 시작 정지').click();
  await button(p,'악보연습실로 돌아가기').click();await p.locator('.pdfStudio > input[type=file]').nth(1).setInputFiles(`${out}/fixtures/${label}.fretiva-pdf`);
  await p.waitForTimeout(300);assert.equal(await p.locator('.pdfError').count(),0);
 });
 await step(p,`${label}-shooter-controls-cleanup`,async()=>{
  await goto(p,'shooter');await button(p,'슈팅게임 난이도').click();await button(p,'보통').click();
  await button(p,'슈팅게임 스킨변경').click();for(const name of ['이펙트','펫','맵','피크','기타'])await button(p.locator('.shooterSkinTabs'),name).click();
  await snap(p,`${label}-shooter-skins`);await p.keyboard.press('Escape');await p.locator('.shooterGuitarPickerModal').waitFor({state:'hidden'});
  await button(p,'슈팅게임 시작').click();await p.waitForTimeout(3800);
  if(mobile)await p.locator('.shooterArena').click({position:{x:20,y:200}});else await p.locator('.desktopShooterPauseControl').click();
  await p.locator('.shooterPausePanel').waitFor();await snap(p,`${label}-shooter-paused`);await p.locator('.shooterPausePanelButton--continue').click();
  await route(p,'fretboard');await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.parityStreams.flatMap(s=>s.getTracks()).filter(t=>t.readyState==='live').length),0);
  await route(p,'shooter');await button(p,'슈팅게임 시작').waitFor();
 });
 await step(p,`${label}-camera-recording-cleanup`,async()=>{
  await goto(p,'shooter');await button(p,'촬영모드').click();await button(p,'분할').click();await p.locator('.shooterRecordingCamera video').waitFor();
  await p.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.readyState>=2));
  await button(p,'슈팅게임 시작').click();await p.waitForTimeout(4400);await button(p,'촬영모드 종료').click();
  await p.locator('.shooterRecordingReview').waitFor({timeout:20000});await snap(p,`${label}-recording-review`);
  await route(p,'fretboard');await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.parityStreams.flatMap(s=>s.getTracks()).filter(t=>t.readyState==='live').length),0);
 });
 await p.close();
}
await finish('remaining-flows');
