import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.BACKING_TEST_URL || 'http://localhost:5173';
const output = 'work/mobile-backing-dock';
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true, channel:'msedge'});
const results = [];
try {
  for (const spec of [
    {width:440,height:956,theme:'brand',device:'mobile'},
    {width:360,height:800,theme:'light',device:'mobile'},
    {width:956,height:440,theme:'light',device:'mobile'},
    {width:820,height:1180,theme:'light',device:'tablet'},
    {width:1440,height:1000,theme:'brand',device:'desktop'},
  ].filter(spec=>!process.env.BACKING_TEST_WIDTHS || process.env.BACKING_TEST_WIDTHS.split(',').includes(String(spec.width)))) {
    const {width,height,theme,device} = spec;
    const touch = device !== 'desktop';
    const page = await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{
      if (message.type()==='error' && /application chunk failed|TypeError|Rendered more hooks|Rendered fewer hooks/.test(message.text())) errors.push(message.text());
    });
    await page.addInitScript(value=>localStorage.setItem('rifflabThemeMode',value),theme);
    await page.goto(`${base}/#etudes`);
    const remote = page.locator('.etudeRemote:visible');
    await remote.waitFor();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('app-is-launching'));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.rifflabDevice),device);
    const dotSize = await remote.locator('.etudeBeat i').first().evaluate(node=>parseFloat(getComputedStyle(node).width));
    if (device === 'mobile' && height>width) assert.equal(dotSize,24);
    if (device === 'desktop') assert.equal(dotSize,20);

    const launcher = page.locator('.etudeBackingToggle button:visible');
    const panel = page.locator('.backingDockPanel');
    const edge = page.locator('.backingDockEdge');
    const tap = async locator=>{
      if (touch) await locator.tap(); else await locator.click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    };
    const state = async (active,expanded) => {
      assert.equal(await launcher.getAttribute('aria-pressed'),String(active));
      assert.equal(await launcher.getAttribute('aria-expanded'),String(expanded));
      assert.equal(await panel.count(),Number(expanded));
      assert.equal(await edge.count(),Number(active&&!expanded));
    };
    await state(false,false);
    await tap(launcher);
    await panel.waitFor();
    await page.waitForTimeout(180);
    await state(true,true);
    assert.equal(await panel.evaluate(node=>node.classList.contains('backingDockPanel--touchDrag')),device==='mobile');
    const cdp = touch ? await page.context().newCDPSession(page) : null;
    const drag = async (locator,dy,{cancel=false,jitter=false}={}) => {
      const before = await panel.boundingBox();
      const rect = await locator.boundingBox();
      const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
      if (touch) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for (let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/8}]});
        await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
      } else {
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:8});await page.mouse.up();
      }
      const after = await panel.boundingBox();
      assert.ok(after,'drag must not fold or disable the panel');
      assert.ok(Math.abs(after.y-before.y-(jitter?0:dy))<2,JSON.stringify({before,after,dy}));
      // Let Chrome finish the touch gesture before starting a separate tap.
      await page.waitForTimeout(400);
      return after;
    };

    if (height>width && device==='mobile') {
      const title = panel.locator('.backingLoopTrackInfo');
      await drag(title,-80);
      const repeat = panel.locator('.backingLoopRepeatButton');
      const repeatBefore = await repeat.getAttribute('data-repeat-mode');
      await drag(repeat,-70);
      assert.equal(await repeat.getAttribute('data-repeat-mode'),repeatBefore,'drag must not activate repeat');
      await tap(repeat);
      await page.waitForFunction(value=>document.querySelector('.backingDockPanel .backingLoopRepeatButton')?.dataset.repeatMode!==value,repeatBefore,{timeout:3000});
      assert.notEqual(await repeat.getAttribute('data-repeat-mode'),repeatBefore,'stationary tap activates repeat');
      const shuffle = panel.locator('.backingLoopShuffleButton');
      const shuffleBefore = await shuffle.getAttribute('aria-pressed');
      await drag(shuffle,40,{jitter:false,cancel:true});
      assert.equal(await shuffle.getAttribute('aria-pressed'),shuffleBefore);
      await drag(shuffle,3,{jitter:true});
      assert.notEqual(await shuffle.getAttribute('aria-pressed'),shuffleBefore,'small tap jitter still clicks');
      await drag(panel.locator('.backingLoopRecordButton'),70);
      assert.equal(await panel.locator('.backingLoopPanel').getAttribute('data-backing-loop-phase'),'idle','drag must not start recording');
      await drag(panel.locator('.backingPanelClose'),-30);
      const beforeKey = await panel.boundingBox();
      await title.focus();await page.keyboard.press('ArrowUp');
      assert.equal((await panel.boundingBox()).y,beforeKey.y-24);
      await tap(panel.locator('.backingLoopPlaylistToggle'));
      await page.locator('.backingLoopPlaylistDialog').waitFor();
      await tap(page.locator('.backingLoopPlaylistDialog').getByRole('button',{name:'Playlist 닫기',exact:true}));
      await page.screenshot({path:`${output}/${width}-${theme}-open.png`});
      if (width===440) {
        await tap(panel.locator('.backingLoopVolumeMute'));
        const volume = panel.locator('.backingLoopVolumeSlider input');
        await volume.waitFor({state:'visible'});
        const panelBeforeVolume = await panel.boundingBox();
        const volumeBefore = await volume.inputValue();
        const slider = await volume.boundingBox();
        await page.touchscreen.tap(slider.x+slider.width/2,slider.y+slider.height*.75);
        await page.waitForFunction(value=>document.querySelector('.backingDockPanel .backingLoopVolumeSlider input').value!==value,volumeBefore);
        assert.deepEqual(await panel.boundingBox(),panelBeforeVolume,'volume slider must not move the panel');
        await tap(panel.locator('.backingLoopPlaylistToggle'));
        await page.locator('.backingLoopPlaylistDialog').waitFor();
        await page.locator('.backingLoopImportInput').setInputFiles('public/sounds/gpg4.wav');
        await page.locator('.backingLoopPlaylistItem').first().waitFor();
        await tap(page.locator('.backingLoopPlaylistDialog').getByRole('button',{name:'Playlist 닫기',exact:true}));
        await tap(panel.locator('.backingLoopPlayerPlayButton'));
        await page.waitForFunction(()=>document.querySelector('.backingDockPanel .backingLoopPlayerPlayButton')?.getAttribute('aria-pressed')==='true');
        await tap(panel.locator('.backingLoopPlayerPlayButton'));
        await page.waitForFunction(()=>document.querySelector('.backingDockPanel .backingLoopPlayerPlayButton')?.getAttribute('aria-pressed')==='false');
        const seek = panel.locator('.backingLoopProgress input');
        const panelBeforeSeek = await panel.boundingBox();
        const seekBefore = await seek.inputValue();
        const seekRect = await seek.boundingBox();
        await page.touchscreen.tap(seekRect.x+seekRect.width*.65,seekRect.y+seekRect.height/2);
        await page.waitForFunction(value=>document.querySelector('.backingDockPanel .backingLoopProgress input').value!==value,seekBefore);
        assert.deepEqual(await panel.boundingBox(),panelBeforeSeek,'seek slider must not move the panel');
        const pausedPosition = await seek.inputValue();
        await drag(panel.locator('.backingLoopPlayerPlayButton'),40);
        assert.equal(await panel.locator('.backingLoopPlayerPlayButton').getAttribute('aria-pressed'),'false','drag must not start playback');
        await tap(panel.locator('.backingPanelClose'));
        await edge.waitFor();
        await state(true,false);
        await tap(page.locator('.backingDockHandle'));
        await panel.waitFor();
        assert.equal(await panel.locator('.backingLoopProgress input').inputValue(),pausedPosition,'folding preserves the shared playback position');
      }
    }
    if (device==='desktop') await drag(panel.locator('.backingLoopTrackInfo'),-60);
    if (device==='tablet') assert.equal(await panel.locator('.is-drag-handle').count(),0);

    await tap(panel.locator('.backingPanelClose'));
    await edge.waitFor();
    await state(true,false);
    await page.screenshot({path:`${output}/${width}-${theme}-folded.png`});
    await tap(page.locator('.backingDockHandle'));
    await panel.waitFor();
    await page.waitForTimeout(180);
    await state(true,true);
    await tap(panel.locator('.backingPanelClose'));
    await edge.waitFor();
    await tap(launcher);
    await state(false,false);
    await tap(launcher);
    await panel.waitFor();
    await page.waitForTimeout(180);
    await tap(launcher);
    await state(false,false);
    assert.deepEqual(errors,[]);
    results.push({...spec,dotSize,drag:device==='tablet'?'fixed tablet panel':'passed',activation:'passed',errors});
    console.log(results.at(-1));
    await page.close();
  }
  await writeFile(`${output}/verification.json`,JSON.stringify(results,null,2));
} finally { await browser.close(); }
