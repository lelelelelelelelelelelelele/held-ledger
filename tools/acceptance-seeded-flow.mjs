import { _electron as electron } from 'playwright';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'held-ledger-synthetic-flow-'));
const isoOffset = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const bicycleBought = isoOffset(-120);
const app = await electron.launch({
  args: [root, `--user-data-dir=${userDataDir}`],
});

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.waitForTimeout(500);

  const initialText = await page.locator('#app').innerText();
  for (const expected of ['¥10,320.00', '实物资产', '¥10,200.00', '权益票券', '¥120.00']) {
    if (!initialText.includes(expected)) {
      throw new Error(`Synthetic overview value missing: ${expected}`);
    }
  }
  await page.locator('[data-act="nav"][data-arg="todos"]').first().click();
  const todosText = await page.locator('#app').innerText();
  for (const expected of ['演示礼品卡', '通勤自行车', '演示年度会员']) {
    if (!todosText.includes(expected)) {
      throw new Error(`Synthetic todo missing: ${expected}`);
    }
  }

  await page.locator('[data-act="nav"][data-arg="assets"]').first().click();
  const assetsText = await page.locator('#app').innerText();
  for (const expected of ['演示笔记本', '旅行相机', '通勤自行车', '演示礼品卡', '演示年度会员']) {
    if (!assetsText.includes(expected)) {
      throw new Error(`Synthetic asset missing: ${expected}`);
    }
  }
  if (await page.locator('[data-act="asset"]').count() !== 5) {
    throw new Error('Synthetic asset list should contain exactly five entries.');
  }

  await page.locator('#assetSort').selectOption('valueDesc');
  let firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('演示笔记本')) {
    throw new Error(`Value sort should put 演示笔记本 first: ${firstAssetText}`);
  }
  await page.locator('#assetSort').selectOption('recentBought');
  firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('通勤自行车')) {
    throw new Error(`Recent purchase sort should put 通勤自行车 first: ${firstAssetText}`);
  }
  await page.locator('#assetSort').selectOption('dueSoon');
  firstAssetText = await page.locator('[data-act="asset"]').first().innerText();
  if (!firstAssetText.includes('演示礼品卡')) {
    throw new Error(`Due sort should put 演示礼品卡 first: ${firstAssetText}`);
  }

  await page.locator('[data-act="asset"][data-arg="demo-bike"]').click();
  let detailText = await page.locator('#app').innerText();
  for (const expected of ['通勤自行车', '图片来源', '生成占位图', '改购入日']) {
    if (!detailText.includes(expected)) {
      throw new Error(`Synthetic asset detail missing ${expected}: ${detailText}`);
    }
  }
  await page.locator('[data-act="edit"][data-arg="bought"]').click();
  if (await page.locator('#editInput').inputValue() !== bicycleBought) {
    throw new Error('Synthetic purchase date did not reach the editor.');
  }
  await page.locator('[data-act="edit-cancel"]').click();

  await page.locator('[data-act="nav"][data-arg="action"]').first().click();
  await page.locator('#nlInput').fill('上个月 6800 元买的旅行相机');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('[data-act="nl-confirm"]').waitFor({ timeout: 10_000 });
  if (Number(await page.locator('#nlPrice').inputValue()) !== 6800) {
    throw new Error('Local smart-add price parsing failed.');
  }
  await page.locator('#nlName').fill('验收相机');
  await page.locator('#nlPrice').fill('7200');
  await page.locator('#nlBought').fill(isoOffset(-30));
  await page.locator('#nlValue').fill('6900');
  await page.locator('#nlNote').fill('合成验收数据');
  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('验收相机'));

  detailText = await page.locator('#app').innerText();
  for (const expected of ['验收相机', '¥7,200', '¥6,900', '合成验收数据']) {
    if (!detailText.includes(expected)) {
      throw new Error(`Edited synthetic asset missing ${expected}: ${detailText}`);
    }
  }

  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-act="delete-asset"]').click();
  await page.waitForSelector('.undo-toast', { timeout: 10_000 });
  await page.locator('.undo-toast button').click();
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('验收相机'));

  await page.locator('[data-act="nav"][data-arg="overview"]').first().click();
  const overviewText = await page.locator('#app').innerText();
  if (!overviewText.includes('¥17,220.00')) {
    throw new Error(`Overview net worth did not include the edited asset: ${overviewText}`);
  }

  await page.locator('[data-act="nav"][data-arg="me"]').first().click();
  await page.locator('[data-act="export-data"]').click();
  const exported = await page.evaluate(() => window.__lastExportPayload);
  if (exported.schema !== 'held-ledger-export' || !Array.isArray(exported.assets) || exported.assets.length !== 6) {
    throw new Error(`Unexpected synthetic export payload: ${JSON.stringify(exported).slice(0, 300)}`);
  }
  const syntheticAsset = exported.assets.find(asset => asset.id === 'demo-bike');
  if (!syntheticAsset || syntheticAsset.photoSource !== 'generated_placeholder' || syntheticAsset.photo) {
    throw new Error(`Generated placeholder export policy failed: ${JSON.stringify(syntheticAsset)}`);
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
    bought: isoOffset(-10),
    value: 1234,
    meta: [['购入价', '¥1,234'], ['当前估值', '¥1,234']],
    events: [{ date: isoOffset(-10), title: '导入资产', delta: '−¥1,234', sub: 'synthetic smoke', kind: 'buy' }],
  });
  const importPath = join(userDataDir, 'import-smoke.json');
  await writeFile(importPath, JSON.stringify(exported, null, 2));
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#importJson').setInputFiles(importPath);
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('导入验收资产'));

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    scenario: 'synthetic seed -> smart add -> delete undo -> JSON export import',
  }, null, 2));
} finally {
  await app.close();
}
