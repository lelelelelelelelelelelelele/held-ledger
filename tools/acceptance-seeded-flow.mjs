import { _electron as electron } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'youshu-seeded-flow-'));
const app = await electron.launch({
  args: [root, `--user-data-dir=${userDataDir}`],
});

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.waitForTimeout(500);

  const initialText = await page.locator('#app').innerText();
  for (const expected of ['¥256,530.00', '实物资产', '¥256,450.00', '权益票券', '¥80.00']) {
    if (!initialText.includes(expected)) {
      throw new Error(`Seeded overview value missing: ${expected}`);
    }
  }
  if (initialText.includes('从第一项资产开始') || initialText.includes('¥0.00\n日均成本')) {
    throw new Error('First-run empty ledger UI should not be shown for seeded data.');
  }

  await page.locator('[data-act="nav"][data-arg="assets"]').first().click();
  const assetsText = await page.locator('#app').innerText();
  for (const expected of ['MacBook Air 13"', '9700X + 5070 主机', '极氪001', 'T90 Pro 扫地机器人', 'Mate 70 Pro+', '好利来礼品卡']) {
    if (!assetsText.includes(expected)) {
      throw new Error(`Seeded asset missing from assets list: ${expected}`);
    }
  }
  for (const unexpected of ['本田思域', '国航航段', '招商银行储蓄卡', '浪琴名匠', 'iPhone 15 Pro']) {
    if (assetsText.includes(unexpected)) {
      throw new Error(`Unexpected sample asset leaked into seeded list: ${unexpected}`);
    }
  }

  await page.locator('[data-act="asset"][data-arg="zeekr"]').click();
  let zeekrText = await page.locator('#app').innerText();
  if (!zeekrText.includes('购入日') || !zeekrText.includes('2026-06-25') || !zeekrText.includes('改购入日')) {
    throw new Error(`Zeekr purchase date editor is missing or wrong: ${zeekrText}`);
  }
  await page.locator('[data-act="edit"][data-arg="bought"]').click();
  await page.locator('#editInput').fill('2026-06-25');
  await page.locator('[data-act="edit-ok"]').click();
  await page.waitForTimeout(500);
  zeekrText = await page.locator('#app').innerText();
  if (!zeekrText.includes('购入日') || !zeekrText.includes('2026-06-25')) {
    throw new Error(`Zeekr purchase date edit did not persist: ${zeekrText}`);
  }

  await page.locator('[data-act="nav"][data-arg="action"]').first().click();
  await page.locator('#nlInput').fill('上个月 6800 元买的佳能 R8 相机');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('[data-act="nl-confirm"]').waitFor({ timeout: 10_000 });

  const previewText = await page.locator('.nl-preview').innerText();
  if (!previewText.includes('佳能 R8 相机') || !previewText.includes('¥6,800.00')) {
    throw new Error(`Unexpected preview: ${previewText}`);
  }

  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForSelector('.dhero', { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('佳能 R8 相机'));

  const detailText = await page.locator('#app').innerText();
  if (!detailText.includes('佳能 R8 相机') || !detailText.includes('录入资产')) {
    throw new Error(`Asset detail did not show the entered asset: ${detailText}`);
  }

  await page.locator('[data-act="nav"][data-arg="overview"]').first().click();
  const overviewText = await page.locator('#app').innerText();
  if (!overviewText.includes('录入资产 · 佳能 R8 相机')) {
    throw new Error(`Overview did not show the new entry: ${overviewText}`);
  }

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    scenario: 'seeded ledger -> verify prior assets -> natural language asset entry',
  }, null, 2));
} finally {
  await app.close();
}
