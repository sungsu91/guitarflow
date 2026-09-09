import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  for(const mobile of [true,false]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
    await page.goto('http://127.0.0.1:5173/#etudes');
    await page.locator('.etudeNotation svg').waitFor({timeout:60000});
    if(mobile) await page.locator('.etudeMobileFilterDetails summary').click();
    await page.getByLabel('난이도',{exact:true}).selectOption('중급');
    await page.getByLabel('연습 유형',{exact:true}).selectOption('스케일');
    const counter=page.locator('.etudeLessonNav>span');
    const next=page.getByRole('button',{name:'다음 ›',exact:true});
    const prev=page.getByRole('button',{name:'‹ 이전',exact:true});
    assert.equal(await counter.textContent(),'중급 · 1 / 3');
    assert.ok(await prev.isDisabled());
    for(const step of [2,3]) {
      await next.click();
      assert.equal(await counter.textContent(),`중급 · ${step} / 3`);
      assert.equal(await page.getByLabel('연습 유형',{exact:true}).inputValue(),'스케일');
      assert.equal(await page.getByLabel('난이도',{exact:true}).inputValue(),'중급');
    }
    assert.ok(await next.isDisabled());
    await prev.click();
    assert.equal(await counter.textContent(),'중급 · 2 / 3');
    await page.getByLabel('스타일',{exact:true}).selectOption('기초');
    assert.equal(await counter.textContent(),'중급 · 1 / 2');
    await next.click();
    assert.equal(await counter.textContent(),'중급 · 2 / 2');
    assert.equal(await page.getByLabel('스타일',{exact:true}).inputValue(),'기초');
    await page.getByLabel('스타일',{exact:true}).selectOption('전체');
    await page.getByLabel('연습 유형',{exact:true}).selectOption('코드 아르페지오');
    assert.equal(await counter.textContent(),'중급 · 1 / 1');
    assert.ok(await prev.isDisabled()&&await next.isDisabled());
    await page.getByLabel('연습 유형',{exact:true}).selectOption('전체');
    assert.equal(await counter.textContent(),'중급 · 13 / 13');
    assert.ok(await next.isDisabled());
    await page.close();
  }
  console.log('PASS: filtered 1/3 navigation, style intersection, 1/1 boundaries and All on mobile and desktop.');
}finally{await browser.close();}
