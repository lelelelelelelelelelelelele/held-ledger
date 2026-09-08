import { _electron as electron } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const thumbnails = join(root, 'docs', 'public-demo-assets', 'thumbnails');
const output = join(root, 'docs', 'public-demo-assets', 'assets-with-public-thumbnails.png');
const userDataDir = await mkdtemp(join(tmpdir(), 'held-ledger-public-thumbnail-capture-'));
const assets = [
  ['demo-laptop', 'laptop.jpg'],
  ['demo-camera', 'camera.jpg'],
  ['demo-bike', 'bike.jpg'],
  ['demo-gift', 'gift-card.jpg'],
  ['demo-member', 'membership.jpg'],
];

const app = await electron.launch({
  args: [root, `--user-data-dir=${userDataDir}`],
});

try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 416, height: 824 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.locator('[data-act="nav"][data-arg="assets"]').first().click();
  await page.waitForSelector('#itemList');

  for (const [id, file] of assets) {
    await page.locator(`[data-act="asset"][data-arg="${id}"]`).click();
    await page.waitForSelector('#assetPhoto', { state: 'attached' });
    await page.locator('#assetPhoto').setInputFiles(join(thumbnails, file));
    await page.waitForFunction(assetId => {
      const asset = ASSETS.find(item => item.id === assetId);
      return asset?.photoSource === 'user_upload' && asset.photo?.startsWith('data:image/jpeg');
    }, id);
    await page.locator('[data-act="nav"][data-arg="assets"]').first().click();
    await page.waitForSelector(`#itemList [data-act="asset"][data-arg="${id}"]`);
  }

  const cards = page.locator('#itemList');
  if (await cards.locator('[data-act="asset"]').count() !== 5) {
    throw new Error('Expected five synthetic asset cards.');
  }
  await cards.screenshot({ path: output });
  console.log(JSON.stringify({
    ok: true,
    output,
    source: 'fresh temporary Electron profile; public stock thumbnails uploaded through the app UI',
  }, null, 2));
} finally {
  await app.close();
}
