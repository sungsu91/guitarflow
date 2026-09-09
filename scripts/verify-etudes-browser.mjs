import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const output = 'artifacts/etudes';
await mkdir(output,{recursive:true});
const report=[];
try {
  for (const mobile of [true,false]) {
    const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,...(mobile ? {userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'} : {})});
    const page = await context.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/#etudes');
    await page.locator('.etudeNotation svg').waitFor({timeout:60000});
    await page.waitForTimeout(3000);
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}.png`,fullPage:true});
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,'page must fit viewport');
    const renderChecks = await page.evaluate(async mobile => {
      const {ETUDES}=await import('/src/etudes/catalog.js');
      const {drawScore}=await import('/src/etudes/Score.jsx');
      const holder=document.createElement('div');document.body.append(holder);
      const results=[];
      try { for(const e of ETUDES){ for(const layout of (mobile ? [{},{enlarged:true},{enlarged:true,landscape:true}] : [{}])) {
        const metrics=drawScore(holder,e,{mobile,...layout});
        const svg=holder.querySelector('svg');
        const bounds=svg.getBBox();
        const expectedMarks=e.measures.flat().filter(n=>n.technique).length;
        if(svg.querySelectorAll('.vf-etude-technique').length!==expectedMarks)throw new Error(e.id+': technique markings missing');
        const labels=[...svg.querySelectorAll('.etudeTechniqueLabel')];
        if(labels.length!==expectedMarks || labels.some(label=>!['H','P','SL'].includes(label.textContent)||getComputedStyle(label).fontWeight!=='700'))throw new Error(e.id+': technique labels missing or too thin');
        results.push({id:e.id,aligned:metrics.flat().every(n=>Math.abs(n.noteX-n.tabX)<0.1),pitchLines:metrics.flat().every(n=>n.line===n.expectedLine),accidentals:metrics.flat().flatMap(n=>n.accidentals),fits:metrics.flat().every(n=>n.noteX<n.end-8),finite:!svg.outerHTML.includes('NaN'),height:bounds.y+bounds.height,viewHeight:svg.viewBox.baseVal.height});
      }}} finally{holder.remove()}
      return results;
    }, mobile);
    for(const r of renderChecks){assert.ok(r.pitchLines,`${r.id}: staff pitch position`);assert.ok(r.aligned,`${r.id}: alignment`);assert.ok(r.fits,`${r.id}: bar fit`);assert.ok(r.finite,`${r.id}: finite`);assert.ok(r.height<=r.viewHeight,`${r.id}: vertical clipping ${r.height} > ${r.viewHeight}`);}
    assert.ok(renderChecks.find(r=>r.id==='C-blue-turn').accidentals.includes('b'));
    assert.ok(renderChecks.find(r=>r.id==='C-blue-turn').accidentals.includes('n'));
    if(mobile) await page.locator('.etudeMobileFilterDetails summary').click();
    // Both concrete levels and All must stop at the current level boundary.
    for(const level of ['초급','중급','고급','전체']) {
      await page.getByLabel('난이도',{exact:true}).selectOption(level);
      const boundaryLevel=await page.locator('.etudeLessonNav span').textContent();
      for(let i=0;i<13 && await page.getByRole('button',{name:'다음 ›',exact:true}).isEnabled();i++) {
        await page.getByRole('button',{name:'다음 ›',exact:true}).click();
        assert.ok((await page.locator('.etudeLessonNav span').textContent()).startsWith(boundaryLevel.split(' · ')[0]));
      }
      assert.ok(await page.getByRole('button',{name:'다음 ›',exact:true}).isDisabled());
    }
    for(const type of ['스케일','펜타토닉','릭','아르페지오','코드 아르페지오','해머온','풀오프','슬라이드','레가토']) {
      await page.getByLabel('연습 유형',{exact:true}).selectOption(type);
      await page.waitForFunction(type=>document.querySelector('.etudeSheetTools')?.textContent.includes(type),type);
      await page.locator('.etudeNotation svg').waitFor();
      assert.equal(await page.locator('.etudeEmpty').count(),0);
      if(['풀오프','슬라이드','레가토'].includes(type)) {
        await page.waitForTimeout(100);
        await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${type}.png`,fullPage:true});
      }
    }
    await page.getByLabel('연습 유형',{exact:true}).selectOption('전체');
    await page.getByLabel('난이도',{exact:true}).selectOption('초급');
    await page.getByLabel('연습곡 · 12개',{exact:true}).selectOption('C-first-path');
    await page.getByRole('button',{name:'다음 ›',exact:true}).click();
    assert.ok((await page.locator('.etudeLessonNav').textContent()).includes('6 / 12'));
    await page.getByLabel('연습 유형',{exact:true}).selectOption('해머온');
    await page.locator('.etudeTips:not(.etudeCommonTips) summary').click();
    await page.getByText(/해머온\(H\): 첫 음/).waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('.etudeNotation .vf-etude-technique').length>0);
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-hammer-tip.png`,fullPage:true});
    await page.getByLabel('연습 유형',{exact:true}).selectOption('전체');
    await page.getByLabel('난이도',{exact:true}).selectOption('고급');
    await page.getByLabel('조성',{exact:true}).selectOption('B');
    await page.getByLabel('연습 유형',{exact:true}).selectOption('스케일');
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-advanced.png`,fullPage:true});
    await page.getByRole('button',{name:'▶ 시작',exact:true}).click();
    await page.getByRole('button',{name:'■ 정지',exact:true}).waitFor();
    await page.waitForFunction(()=>!!document.querySelector('.etudeBeat.is-on'));
    await page.evaluate(()=>{window.etudeSvgBeforeTempo=document.querySelector('.etudeNotation svg')});
    await page.getByLabel('연습 BPM',{exact:true}).fill('100');
    await page.getByLabel('연습 BPM',{exact:true}).press('Enter');
    await page.getByRole('button',{name:'▶ 시작',exact:true}).waitFor();
    assert.ok((await page.locator('.etudeSheetMeta').textContent()).includes('100'));
    assert.equal(await page.evaluate(()=>window.etudeSvgBeforeTempo===document.querySelector('.etudeNotation svg')),true,'tempo must not re-engrave score');
    await page.getByLabel('스타일',{exact:true}).selectOption('팝');
    await page.waitForFunction(()=>document.querySelector('.etudeSheetTools')?.textContent.includes('팝'));
    assert.equal(await page.locator('.etudeEmpty').count(),0);
    await page.getByLabel('난이도',{exact:true}).selectOption('초급');
    await page.getByLabel('스타일',{exact:true}).selectOption('전체');
    await page.getByLabel('연습 유형',{exact:true}).selectOption('전체');
    await page.getByLabel('조성',{exact:true}).selectOption('C');
    await page.getByLabel('연습곡 · 12개',{exact:true}).selectOption('C-first-path');
    if(mobile) await page.evaluate(()=>{
      window.savedEtudeLock=screen.orientation.lock;
      window.savedEtudeFullscreen=document.documentElement.requestFullscreen;
      screen.orientation.lock=()=>Promise.reject(new Error('unsupported'));
      document.documentElement.requestFullscreen=undefined;
    });
    await page.getByRole('button',{name:mobile?'가로 전환 ↻':'악보 크게 보기 ↗',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    const checkZoom = async () => {
      await page.getByRole('dialog').locator('svg').waitFor();
      const fit = await page.getByRole('dialog').evaluate(d=>{
        const bounds=d.getBoundingClientRect(), sheet=d.querySelector('.etudeSheet').getBoundingClientRect();
        return d.scrollWidth<=d.clientWidth+1 && sheet.left>=bounds.left && sheet.right<=bounds.right+1;
      });
      assert.ok(fit,'enlarged score fits actual viewport');
    };
    await checkZoom();
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-zoom.png`});
    if(mobile) {
      assert.equal(await page.getByRole('dialog').getByRole('button').count(),1,'reader only needs a close button');
      await page.getByText(/이 브라우저에서는 휴대폰을 직접/).waitFor();
      await page.evaluate(()=>{screen.orientation.lock=window.savedEtudeLock;document.documentElement.requestFullscreen=window.savedEtudeFullscreen});
      await page.setViewportSize({width:844,height:390});
      await page.waitForFunction(()=>document.querySelector('.etudeZoom svg')?.viewBox.baseVal.width===980);
      await checkZoom();
      assert.equal(await page.locator('.portraitOrientationGuarded').count(),0);
      await page.screenshot({path:`${output}/mobile-zoom-landscape.png`});
      await page.getByRole('dialog').evaluate(d=>d.scrollTop=d.scrollHeight);
      await page.getByRole('button',{name:'닫기 ✕',exact:true}).click({trial:true});
      await page.setViewportSize({width:320,height:740});
      await page.waitForFunction(()=>document.querySelector('.etudeZoom svg')?.viewBox.baseVal.width===460);
      await checkZoom();
      await page.getByRole('dialog').evaluate(d=>d.scrollTop=0);
      await page.screenshot({path:`${output}/mobile-zoom-320.png`});
      await page.setViewportSize({width:390,height:844});
    }
    await page.getByRole('button',{name:'닫기 ✕',exact:true}).click();
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
    await page.getByRole('button',{name:'▶ 시작',exact:true}).click();
    await page.getByRole('button',{name:'■ 정지',exact:true}).waitFor();
    await page.evaluate(()=>{location.hash='#stage2'});
    await page.waitForFunction(()=>!document.querySelector('.etudeStudio'));
    if(mobile) {
      await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
      await page.locator('.utilityMenuList').getByRole('button',{name:/에튀드 스튜디오/}).click();
    } else await page.locator('.desktopSidebar').getByRole('button',{name:/에튀드 스튜디오/}).click();
    await page.locator('.etudeNotation svg').waitFor();
    await page.getByRole('button',{name:'▶ 시작',exact:true}).waitFor();
    if(mobile) {
      await page.getByRole('button',{name:'홈으로 가기',exact:true}).click();
      await page.waitForFunction(()=>location.hash==='#fretboard'&&!document.querySelector('.etudeStudio'));
      await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
      await page.locator('.utilityMenuList').getByRole('button',{name:/에튀드 스튜디오/}).click();
      await page.locator('.etudeNotation svg').waitFor();
    }
    await page.setViewportSize(mobile?{width:320,height:740}:{width:1024,height:768});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/${mobile?'mobile-320':'desktop-1024'}.png`,fullPage:true});
    await page.evaluate(()=>{document.querySelector('main.app').classList.replace('theme-light','theme-dark')});
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-dark.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    const performanceChecks = await page.evaluate(async()=>{
      const {ETUDES}=await import('/src/etudes/catalog.js');
      const {drawScore,renderCachedScore}=await import('/src/etudes/Score.jsx');
      const holder=document.createElement('div');document.body.append(holder);
      const e=ETUDES[0], options={mobile:true};
      const raw=[], cached=[];
      try {
        renderCachedScore(holder,e,options);
        for(let i=0;i<12;i++) {
          let time=performance.now();drawScore(holder,e,options);raw.push(performance.now()-time);
          time=performance.now();const result=renderCachedScore(holder,e,options);cached.push(performance.now()-time);
          if(result!=='cached')throw new Error('Repeated score did not use cache');
        }
      } finally {holder.remove()}
      const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
      return {engraveMedianMs:median(raw),reuseMedianMs:median(cached)};
    });
    report.push({mobile,renderChecks,performanceChecks,errors}); await context.close();
  }
  await writeFile(`${output}/verification.json`,JSON.stringify(report,null,2));
  console.log('PASS: 1036 score renders with technique marks; curriculum, TIP, mobile rotation, BPM and route lifecycle.');
}finally{await browser.close()}
