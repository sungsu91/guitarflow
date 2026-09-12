import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { TYPES } from '../src/etudes/tracks.js';
import { LEVELS, ETUDES } from '../src/etudes/catalog.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const output='artifacts/etude-tracks';
await mkdir(output,{recursive:true});
const report=[];
try {
  for(const mobile of process.env.ETUDE_LAYOUT==='mobile'?[true]:[false,true]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,
      ...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{})});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/#etudes');
    await page.locator('.etudeNotation svg').waitFor({timeout:60000});
    assert.equal(await page.getByLabel('연습 유형',{exact:true}).inputValue(),'스케일');
    assert.equal(await page.getByRole('button',{name:'초급',exact:true}).getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.getByLabel('연습 유형',{exact:true}).locator('option').allTextContents(),TYPES);
    await page.getByRole('button',{name:'▶ 시작',exact:true}).click();
    await page.locator('.etudeBeat.is-on').waitFor();
    await page.getByLabel('연습 유형',{exact:true}).selectOption('레가토');
    await page.getByRole('button',{name:'▶ 시작',exact:true}).waitFor();
    assert.equal(await page.getByLabel('연습 BPM',{exact:true}).inputValue(),'44');
    if(mobile) {
      assert.ok(await page.getByLabel('연습 유형',{exact:true}).isVisible());
      assert.ok(await page.getByRole('group',{name:'난이도',exact:true}).isVisible());
      assert.equal(await page.locator('.etudeMobileFilterDetails').getAttribute('open'),null);
    }
    const next=page.getByRole('button',{name:'다음 ›',exact:true});
    const previous=page.getByRole('button',{name:'‹ 이전',exact:true});
    for(const type of TYPES) {
      await page.getByLabel('연습 유형',{exact:true}).selectOption(type);
      for(const level of LEVELS) {
        await page.getByRole('button',{name:level,exact:true}).click();
        const expected=ETUDES.filter(e=>e.root==='C'&&e.type===type&&e.level===level);
        const select=page.getByLabel(`연습곡 · ${expected.length}개`,{exact:true});
        assert.equal(await select.inputValue(),expected[0].id);
        assert.equal(await page.locator('.etudeLessonNav>span>strong').textContent(),`1 / ${expected.length}`);
        assert.ok(await previous.isDisabled());
        // Every lesson, not just the endpoints, must stay inside this course.
        for(let i=1;i<expected.length;i++) {
          await next.click();
          assert.equal(await select.inputValue(),expected[i].id);
          assert.equal(await page.locator('.etudeLessonNav>span>strong').textContent(),`${i+1} / ${expected.length}`);
          assert.equal(await page.getByLabel('연습 유형',{exact:true}).inputValue(),type);
          assert.equal(await page.getByRole('button',{name:level,exact:true}).getAttribute('aria-pressed'),'true');
        }
        assert.ok(await next.isDisabled());
        if(type==='레가토') {
          await previous.click();
          await page.locator('.etudeNotation svg').scrollIntoViewIfNeeded();
          await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-legato-${level}.png`,fullPage:true});
        }
      }
    }
    if(mobile) await page.locator('.etudeMobileFilterDetails summary').click();
    await page.getByLabel('연습 유형',{exact:true}).selectOption('스케일');
    await page.getByRole('button',{name:'중급',exact:true}).click();
    await page.getByLabel('스타일',{exact:true}).selectOption('기초');
    assert.equal(await page.locator('.etudeLessonNav>span>strong').textContent(),'1 / 2');
    await next.click();
    assert.ok(await next.isDisabled());
    await page.getByLabel('연습 유형',{exact:true}).selectOption('아르페지오');
    assert.equal(await page.getByRole('button',{name:'중급',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByLabel('스타일',{exact:true}).inputValue(),'전체');
    await page.getByLabel('조성',{exact:true}).selectOption('F');
    await page.getByRole('button',{name:'초급',exact:true}).click();
    assert.equal(await page.getByLabel('연습곡 · 2개',{exact:true}).inputValue(),'C-chord-three-strings');
    assert.deepEqual(await page.getByLabel('조성',{exact:true}).locator('option').allTextContents(),['C','D','E','G','A']);
    assert.equal(await page.getByLabel('조성',{exact:true}).inputValue(),'C');
    await page.locator('.etudeTips:not(.etudeCommonTips) summary').click();
    await page.locator('.etudePrerequisite').waitFor();
    assert.equal(await page.locator('.etudeNotation .etudeChordDiagram').count(),8);
    assert.equal(await page.locator('.etudeNotation .etudeChordDiagram').first().getAttribute('aria-label'),'C, 6번줄부터 뮤트, 3프렛, 2프렛, 0프렛, 1프렛, 0프렛');
    assert.deepEqual(await page.locator('.etudeNotation .vf-tabnote').first().locator('text').allTextContents(),['3','1']);
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-chord-beginner.png`,fullPage:true});
    await page.getByLabel('조성',{exact:true}).selectOption('C');
    for(const level of LEVELS) {
      await page.getByRole('button',{name:level,exact:true}).click();
      await page.locator('.etudeNotation svg').waitFor();
      await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-arpeggio-${level}.png`,fullPage:true});
    }
    const renderSummary=await page.evaluate(async mobile=>{
      const {ETUDES}=await import('/src/etudes/catalog.js');
      const {drawScore}=await import('/src/etudes/Score.jsx');
      const holder=document.createElement('div');document.body.append(holder);
      let count=0;
      try {
        for(const e of ETUDES) for(const options of mobile?[{mobile:true},{mobile:true,enlarged:true},{mobile:true,enlarged:true,landscape:true}]:[{}]) {
          const metrics=drawScore(holder,e,options);
          const svg=holder.querySelector('svg');
          const fail=message=>{throw new Error(`${e.id} ${JSON.stringify(options)}: ${message}`)};
          if(!metrics.flat().every(n=>Math.abs(n.noteX-n.tabX)<0.1&&n.line===n.expectedLine&&n.noteX<n.end-8))fail('staff/TAB alignment, pitch or bar fit');
          if(!metrics.flat().every(n=>n.tones.every(t=>t.line===t.expectedLine&&t.tab.str===t.expectedTab.str&&t.tab.fret===t.expectedTab.fret)))fail('simultaneous pitch/TAB mismatch');
          const events=e.measures.flat().filter(n=>!n.rest);
          const tabGroups=[...svg.querySelectorAll('.vf-tabnote')];
          if(tabGroups.length!==events.length)fail('TAB event count');
          events.forEach((event,i)=>{
            if(!event.tones)return;
            const digits=[...tabGroups[i].querySelectorAll('text')];
            if(digits.length!==event.tones.length)fail('missing stacked fret number');
            const boxes=digits.map(d=>d.getBBox());
            // Ink bounds differ by digit and mobile raster scale; the SVG text
            // anchor, not the ink bounding box, defines typographic centering.
            if(digits.some(t=>t.getAttribute('text-anchor')!=='middle'||Math.abs(Number(t.getAttribute('x'))-Number(digits[0].getAttribute('x')))>0.01))fail('pinch frets not vertically aligned');
            if(boxes.some((a,j)=>boxes.slice(j+1).some(b=>a.y<b.y+b.height&&a.y+a.height>b.y)))fail('stacked fret numbers overlap');
          });
          if(svg.outerHTML.includes('NaN'))fail('non-finite SVG');
          const bounds=svg.getBBox();
          if(bounds.y+bounds.height>svg.viewBox.baseVal.height)fail('vertical clipping');
          if(svg.querySelectorAll('.etudeTechniqueLabel').length!==e.measures.flat().filter(n=>n.technique).length)fail('missing technique marks');
          count++;
        }
      } finally {holder.remove()}
      return {count};
    },mobile);
    console.log(`${mobile?'mobile':'desktop'}: ${renderSummary.count} renders and 27 course combinations passed`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:mobile?'가로 전환 ↻':'악보 크게 보기 ↗',exact:true}).click();
    await page.getByRole('dialog').locator('svg').waitFor();
    if(mobile) await page.setViewportSize({width:844,height:390});
    await page.getByRole('dialog').locator('svg').waitFor();
    assert.ok(await page.getByRole('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    await page.getByRole('button',{name:'닫기 ✕',exact:true}).click();
    await page.setViewportSize(mobile?{width:320,height:740}:{width:1024,height:768});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/${mobile?'mobile-320':'desktop-1024'}.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    report.push({mobile,...renderSummary,courseCombinations:TYPES.length*LEVELS.length,errors});
    await page.close();
  }
  await writeFile(`${output}/verification.json`,JSON.stringify(report,null,2));
  console.log('PASS:',JSON.stringify(report));
} finally {await browser.close()}
