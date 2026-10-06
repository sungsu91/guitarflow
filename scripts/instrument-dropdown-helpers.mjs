import assert from 'node:assert/strict';

export async function chooseInstrument(page, trigger, id) {
  await trigger.click();
  const menu = page.locator('.instrumentDropdownMenu');
  await menu.waitFor();
  const bounds = await menu.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, 'instrument menu horizontal overflow');
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'instrument menu vertical overflow');
  await menu.locator(`[role="option"][data-value="${id}"]`).click();
  await menu.waitFor({ state: 'detached' });
  assert.equal(await trigger.getAttribute('data-value'), id);
}

export async function countInstrumentOptions(page, trigger) {
  await trigger.click();
  const count = await page.locator('.instrumentDropdownMenu [role="option"]').count();
  await page.keyboard.press('Escape');
  return count;
}
