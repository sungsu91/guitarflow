import {makePage,goto,button,controls,snap,step,finish,out} from './helpers.mjs';
import {writeFile} from 'node:fs/promises';
const p=await makePage(false);
async function record(name){await snap(p,`inspect-${name}`);await writeFile(`${out}/inspect-${name}.json`,JSON.stringify(await controls(p),null,2));}
await step(p,'pdf-import-explore',async()=>{await goto(p,'etudes');await p.locator('.pdfStudio > input[type=file]').first().setInputFiles('tmp/pdfs/pdf-practice-24pages.pdf');await p.locator('.pdfDialog').waitFor();await record('pdf-metadata');await p.locator('.pdfDialog button[type=submit]').click();await p.locator('.pdfPractice').waitFor();await record('pdf-practice');await button(p,'PDF 간단 편집').click();await record('pdf-edit');});
await step(p,'shooter-explore',async()=>{await goto(p,'shooter');await button(p,'슈팅게임 난이도').click();await record('shooter-difficulty');await p.keyboard.press('Escape');await button(p,'슈팅게임 스킨변경').click();await record('shooter-skins');await button(p,'스킨변경 창 닫기').click();await button(p,'슈팅게임 시작').click();await p.waitForTimeout(1200);await record('shooter-running');});
await step(p,'camera-explore',async()=>{await goto(p,'shooter');await button(p,'촬영모드').click();await button(p,'분할').click();await p.waitForTimeout(2000);await record('shooter-camera');});
await finish('remaining-explore');
