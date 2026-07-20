import { _electron as electron } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'held-ledger-id-collision-'));
const app = await electron.launch({
  args: [root, `--user-data-dir=${userDataDir}`],
});

const isoToday = new Date().toISOString().slice(0, 10);

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.length > 50, { timeout: 10_000 });

  // Seed IndexedDB with an existing nl1 asset, simulating a prior smart-add session.
  await page.evaluate(async (today) => {
    ASSETS = [
      {
        id: 'nl1',
        group: 'physical',
        cat: '数码',
        name: '已有旧资产',
        icon: 'box',
        tint: '#E1E6EC',
        status: 'active',
        countable: true,
        price: 1000,
        bought: '2026-01-01',
        value: 800,
        meta: [['购入价', '¥1,000'], ['当前估值', '¥800']],
        events: [{ date: '2026-01-01', title: '录入资产', delta: '−¥1,000', sub: '旧资产', kind: 'buy' }],
      },
    ];
    await dbPutAll(ASSETS);
  }, isoToday);

  // Reload to simulate an app restart: boot() must initialize nlSeq from the existing nl1 record.
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.length > 50, { timeout: 10_000 });

  // Smart-add a new asset through the UI.
  await page.locator('[data-act="nav"][data-arg="action"]').first().click();
  await page.waitForSelector('#nlInput', { timeout: 10_000 });
  await page.locator('#nlInput').fill('昨天 299 元买了一个背包');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('[data-act="nl-confirm"]').waitFor({ timeout: 10_000 });
  await page.locator('#nlName').fill('回归测试背包');
  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('回归测试背包'), { timeout: 10_000 });

  // Allow the 500ms debounced IndexedDB write to complete before reading back.
  await page.waitForTimeout(1000);

  // Verify IndexedDB contains both the old nl1 and a new distinct nl* asset.
  const stored = await page.evaluate(async () => {
    const assets = await dbGetAll();
    return assets.map(a => ({ id: a.id, name: a.name }));
  });

  const ids = stored.map(a => a.id);
  if (!ids.includes('nl1')) {
    throw new Error(`Existing nl1 asset missing from IndexedDB: ${JSON.stringify(stored)}`);
  }
  const newId = ids.find(id => id !== 'nl1');
  if (!newId || !/^nl\d+$/.test(newId)) {
    throw new Error(`New smart-add asset did not get a distinct nl* ID: ${JSON.stringify(stored)}`);
  }
  if (stored.length < 2) {
    throw new Error(`Expected at least 2 assets, got ${stored.length}: ${JSON.stringify(stored)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    stored,
    scenario: 'existing nl1 -> restart -> smart add -> both assets persisted',
  }, null, 2));
} finally {
  await app.close();
}
