import { chooseInstrument, countInstrumentOptions } from './instrument-dropdown-helpers.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHOOTER_TEST_URL || 'http://127.0.0.1:5173';
const dir = 'work/shooter-inline-controls';
await mkdir(dir, { recursive: true });
// Exercise the production microphone path without recording a real device.
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const reports = [];
try {
  for (const [name, width, height, userAgent] of [
    ['small-phone',360,800,'iPhone Mobile'], ['phone',440,956,'iPhone Mobile'], ['phone-landscape',844,390,'iPhone Mobile'],
    ['tablet',768,1024,'iPad Safari'], ['tablet-split',507,1180,'iPad Safari'],
    ['tablet-landscape',1280,800,'Android Tablet'], ['desktop',1440,1000,''],
  ].filter(profile => !process.argv[2] || process.argv[2] === profile[0])) {
    const page = await browser.newPage({ viewport: {width,height}, ...(userAgent ? {userAgent,isMobile:true,hasTouch:true} : {}) });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${base}/?debugHitbox=1#shooter`);
      await page.locator('.shooterPanel').waitFor();
      await page.locator('.launchSplash').waitFor({state:'hidden'});
      const select = page.locator(userAgent ? '.shooterInstrumentHud .instrumentDropdownTrigger' : '.dsSession .shooterInstrumentSelect .instrumentDropdownTrigger');
      await select.waitFor();
      assert.equal(await countInstrumentOptions(page, select),8);
      for (const id of ['guitar-6','guitar-7','bass-4','bass-5','bass-6','ukulele-high-g','ukulele-low-g']) {
        await chooseInstrument(page, select, id);
        assert.equal(await select.getAttribute('data-value'),id);
      }
      await chooseInstrument(page, select, 'bass-5');
      if (userAgent) {
        const help = page.getByRole('checkbox', { name: '도움', exact: true });
        await help.uncheck();
        assert.equal(await page.locator('.mobileShooterPlayHelpMessageBar').count(), 0);
        await help.check();
        assert.equal(await page.locator('.mobileShooterPlayHelpMessageBar').count(), 1);
        assert.equal(await page.locator('.shooterInstrumentSettings').count(), 0);
        await chooseInstrument(page, select, 'voice');
        assert.equal(await help.count(), 0);
        await chooseInstrument(page, select, 'bass-5');
      }
      await page.mouse.move(width-2,height-2);
      await page.screenshot({path:`${dir}/${name}.png`});
      if (userAgent) {
        const dimensions = await page.locator('.mobileShooterPrimaryHudRow').evaluate(el => ({
          row:el.getBoundingClientRect().toJSON(), children:[...el.children].map(x=>x.getBoundingClientRect().toJSON()),
        }));
        for (const child of dimensions.children) {
          assert.ok(child.x>=-1 && child.right<=width+1,`${name} HUD overflow`);
          assert.ok(child.y>=dimensions.row.y-1 && child.bottom<=dimensions.row.bottom+1,`${name} HUD wraps`);
        }
      }
      let target;
      if (['small-phone','desktop'].includes(name)) {
        await page.locator(userAgent ? '.shooterStartPanelButton--primary' : '.dsStartGameButton').click();
        const enemy = page.locator('.shooterEnemy--currentTarget');
        await enemy.waitFor({timeout:20000});
        target = await enemy.getAttribute('aria-label');
        assert.match(target,/B0/);
        if (userAgent) {
          const help = page.getByRole('checkbox', { name: '도움', exact: true });
          await help.uncheck();
          assert.equal(await page.locator('.mobileShooterPlayHelpMessageBar').count(), 0);
          await help.check();
          assert.match(await page.locator('.mobileShooterPlayHelpMessageBar').innerText(), /개방현/);
        }
        assert.equal(await select.isDisabled(),true);
      }
      assert.deepEqual(errors,[]);
      reports.push({name,pass:true,target});
      console.log('PASS',name,target || 'all profiles');
    } catch (error) {
      await page.screenshot({path:`${dir}/${name}-failure.png`});
      reports.push({name,pass:false,error:String(error),errors});
      console.log('FAIL',name,String(error),errors);
    }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${dir}/browser-report${process.argv[2]?`-${process.argv[2]}`:''}.json`,JSON.stringify(reports,null,2));
if (reports.some(report=>!report.pass)) process.exitCode = 1;
