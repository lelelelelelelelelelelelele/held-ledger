import { _electron as electron } from 'playwright';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'docs', 'public-demo-assets');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'held-ledger-public-preview-'));

await mkdir(outputDir, { recursive: true });

const app = await electron.launch({
  args: [root, `--user-data-dir=${userDataDir}`],
});

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.setViewportSize({ width: 416, height: 824 });
  await page.waitForTimeout(300);

  await page.screenshot({ path: join(outputDir, 'overview.png') });

  await page.locator('[data-act="nav"][data-arg="assets"]').first().click();
  await page.waitForSelector('#itemList');
  await page.screenshot({ path: join(outputDir, 'assets.png') });

  await page.locator('[data-act="nav"][data-arg="action"]').first().click();
  await page.locator('#nlInput').fill('昨天买了一个 399 元的背包');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('#nlName').waitFor({ timeout: 10_000 });
  await page.screenshot({ path: join(outputDir, 'smart-add.png') });

  console.log(JSON.stringify({
    ok: true,
    source: 'clean temporary Electron profile with only the public synthetic seed',
    files: ['overview.png', 'assets.png', 'smart-add.png'],
  }, null, 2));
} finally {
  await app.close();
}
