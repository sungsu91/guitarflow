import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.locator('.etudeNotation svg').waitFor({timeout:60000});
  const checks=await page.evaluate(async()=>{
    const {ETUDES}=await import('/src/etudes/catalog.js');
    const {drawScore}=await import('/src/etudes/Score.jsx');
    const holder=document.createElement('div');holder.style.cssText='width:366px;background:white';document.body.append(holder);
    const results=[];
    for(const id of ['C-ballad-breath','F-pop-chord-route','C-legato-drive','C-chord-accompaniment','F-chord-accompaniment']) {
      const e=ETUDES.find(e=>e.id===id);
      drawScore(holder,e,{mobile:true,enlarged:true});
      if(e.chordShapes && holder.querySelectorAll('.etudeChordDiagram').length!==8) throw new Error('Missing chord boxes');
      const bounds=holder.querySelector('svg').getBBox();
      if(bounds.y+bounds.height>holder.querySelector('svg').viewBox.baseVal.height) throw new Error('Clipped chord score');
      const labels=[...holder.querySelectorAll('.etudeTechniqueLabel')].map(n=>n.getBBox());
      results.push({id,tabNotes:holder.querySelectorAll('.vf-tabnote').length,expected:e.measures.flat().filter(n=>!n.rest).length,
        labelOverlap:labels.some((a,i)=>labels.slice(i+1).some(b=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)),
        chords:e.harmony?.every(chord=>[...holder.querySelectorAll('text')].some(t=>t.textContent===chord))??true});
    }
    holder.remove();return results;
  });
  for(const check of checks){assert.equal(check.tabNotes,check.expected,check.id+': rest must have no fret');assert.equal(check.labelOverlap,false);assert.ok(check.chords);}
  await page.locator('.etudeMobileFilterDetails summary').click();
  for(const [level,id] of [['초급','C-ballad-breath'],['중급','C-pop-chord-route'],['중급','C-chord-accompaniment'],['고급','C-legato-drive']]) {
    await page.getByLabel('난이도',{exact:true}).selectOption(level);
    await page.getByLabel(/^연습곡 ·/).selectOption(id);
    await page.waitForTimeout(150);
    await page.locator('.etudeSheet').screenshot({path:`artifacts/etudes/${id}.png`});
  }
  const common=page.locator('.etudeCommonTips');
  await common.locator('summary').click();
  assert.equal(await common.locator('li').count(),7);
  assert.equal(await common.locator('tbody tr').count(),3);
  await page.setViewportSize({width:320,height:740});
  assert.ok(await common.evaluate(d=>d.scrollWidth<=d.clientWidth+1),'common TIP fits narrow mobile');
  await common.screenshot({path:'artifacts/etudes/common-tip-mobile.png'});
  await page.getByLabel('난이도',{exact:true}).selectOption('초급');
  assert.ok(await common.evaluate(d=>d.open),'common TIP stays open across lessons');
  await common.locator('summary').click();
  assert.equal(await common.evaluate(d=>d.open),false);
  const desktop=await browser.newPage({viewport:{width:1440,height:1000}});
  await desktop.goto('http://127.0.0.1:5173/#etudes');
  await desktop.locator('.etudeCommonTips summary').click();
  assert.ok(await desktop.locator('.etudeCommonTips').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await desktop.locator('.etudeCommonTips').screenshot({path:'artifacts/etudes/common-tip-desktop.png'});
  console.log('PASS: rests hide TAB frets, chord labels transpose, dense technique labels do not overlap.');
}finally{await browser.close();}
