import { _electron as electron } from 'playwright';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'youshu-seeded-flow-'));
const today = new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => {
  const parse = value => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
};
const giftDueDays = daysBetween(today, '2026-06-30');
const giftOverdueText = `已过期 ${Math.abs(giftDueDays)} 天`;
const zeekrDueDays = daysBetween(today, '2026-08-05');
const overdueSection = `已过期 · ${[giftDueDays, zeekrDueDays].filter(days => days < 0).length} 项`;
const zeekrDueSection = zeekrDueDays < 0 ? null : (zeekrDueDays <= 30 ? '30 天内 · 1 项' : '60 天内 · 1 项');
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
  for (const expected of ['全部 2 项', '好利来礼品卡', giftOverdueText]) {
    if (!initialText.includes(expected)) {
      throw new Error(`Seeded overview overdue todo missing: ${expected}`);
    }
  }

  await page.locator('[data-act="nav"][data-arg="todos"]').first().click();
  const todosText = await page.locator('#app').innerText();
  for (const expected of [overdueSection, '好利来礼品卡', giftOverdueText, zeekrDueSection, '极氪001'].filter(Boolean)) {
    if (!todosText.includes(expected)) {
      throw new Error(`Seeded todo section missing: ${expected}`);
    }
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

  await page.locator('#assetSort').selectOption('valueDesc');
  let firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('极氪001')) {
    throw new Error(`Value sort should put 极氪001 first: ${firstAssetText}`);
  }
  await page.locator('#assetSort').selectOption('recentBought');
  firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('T90 Pro 扫地机器人')) {
    throw new Error(`Recent purchase sort should put T90 Pro first: ${firstAssetText}`);
  }
  await page.locator('#assetSort').selectOption('dailyDesc');
  firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('极氪001')) {
    throw new Error(`Daily cost sort should put 极氪001 first: ${firstAssetText}`);
  }
  await page.locator('#assetSort').selectOption('dueSoon');
  firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('好利来礼品卡')) {
    throw new Error(`Due sort should put 好利来礼品卡 first: ${firstAssetText}`);
  }

  await page.locator('[data-act="asset"][data-arg="zeekr"]').click();
  let zeekrText = await page.locator('#app').innerText();
  if (!zeekrText.includes('购入日') || !zeekrText.includes('2026-06-25') || !zeekrText.includes('改购入日')) {
    throw new Error(`Zeekr purchase date editor is missing or wrong: ${zeekrText}`);
  }
  if (!zeekrText.includes('图片来源') || !zeekrText.includes('内置演示图')) {
    throw new Error(`Zeekr photo source policy is missing from detail: ${zeekrText}`);
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

  const previewName = await page.locator('#nlName').inputValue();
  const previewPrice = await page.locator('#nlPrice').inputValue();
  if (previewName !== '佳能 R8 相机' || Number(previewPrice) !== 6800) {
    throw new Error(`Unexpected editable preview: ${previewName} / ${previewPrice}`);
  }
  await page.locator('#nlName').fill('佳能 R8 Mark II');
  await page.locator('#nlPrice').fill('7200');
  await page.locator('#nlBought').fill('2026-05-20');
  await page.locator('#nlValue').fill('6900');
  await page.locator('#nlNote').fill('确认页编辑验收');

  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForSelector('.dhero', { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('佳能 R8 Mark II'));

  const detailText = await page.locator('#app').innerText();
  for (const expected of ['佳能 R8 Mark II', '¥7,200', '2026-05-20', '¥6,900', '确认页编辑验收', '录入资产']) {
    if (!detailText.includes(expected)) {
      throw new Error(`Edited asset detail missing ${expected}: ${detailText}`);
    }
  }
  if (detailText.includes('佳能 R8 相机') && !detailText.includes('佳能 R8 Mark II')) {
    throw new Error(`Asset detail did not show the entered asset: ${detailText}`);
  }

  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-act="delete-asset"]').click();
  await page.waitForSelector('.undo-toast', { timeout: 10_000 });
  const deletedAssetRows = await page.locator('[data-act="asset"]').filter({ hasText: '佳能 R8 Mark II' }).count();
  if (deletedAssetRows !== 0) {
    const afterDeleteText = await page.locator('#app').innerText();
    throw new Error(`Deleted asset was still visible in the asset list: ${afterDeleteText}`);
  }
  await page.locator('.undo-toast button').click();
  await page.waitForSelector('.dhero', { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('佳能 R8 Mark II'));

  await page.locator('[data-act="nav"][data-arg="overview"]').first().click();
  const overviewText = await page.locator('#app').innerText();
  if (!overviewText.includes('¥263,430.00')) {
    throw new Error(`Overview net worth did not include the edited asset value: ${overviewText}`);
  }

  await page.locator('[data-act="nav"][data-arg="me"]').first().click();
  await page.locator('[data-act="export-data"]').click();
  const exported = await page.evaluate(() => window.__lastExportPayload);
  if (exported.schema !== 'youshu-ledger-export' || !Array.isArray(exported.assets) || exported.assets.length < 7) {
    throw new Error(`Unexpected export payload: ${JSON.stringify(exported).slice(0, 300)}`);
  }
  const editedAsset = exported.assets.find(asset => asset.name === '佳能 R8 Mark II');
  if (!editedAsset || editedAsset.price !== 7200 || editedAsset.value !== 6900 || editedAsset.bought !== '2026-05-20') {
    throw new Error(`Edited smart-add asset missing from export: ${JSON.stringify(editedAsset)}`);
  }
  const seededPhotoAsset = exported.assets.find(asset => asset.id === 'zeekr');
  if (!seededPhotoAsset || seededPhotoAsset.photoSource !== 'bundled_demo') {
    throw new Error(`Seeded photo source missing from export: ${JSON.stringify(seededPhotoAsset)}`);
  }

  exported.assets.unshift({
    id: 'import-smoke',
    group: 'physical',
    cat: '数码',
    name: '导入验收资产',
    icon: 'box',
    tint: '#E1E6EC',
    status: 'active',
    countable: true,
    price: 1234,
    bought: '2026-07-04',
    value: 1234,
    meta: [['购入价', '¥1,234'], ['购入日', '2026-07-04'], ['当前估值', '¥1,234']],
    events: [{ date: '2026-07-04', title: '导入资产', delta: '−¥1,234', sub: 'JSON smoke', kind: 'buy' }],
  });
  const importPath = join(userDataDir, 'import-smoke.json');
  await writeFile(importPath, JSON.stringify(exported, null, 2));
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#importJson').setInputFiles(importPath);
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('导入验收资产'));

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    scenario: 'seeded ledger -> verify prior assets -> natural language asset entry -> delete undo -> JSON export import',
  }, null, 2));
} finally {
  await app.close();
}
