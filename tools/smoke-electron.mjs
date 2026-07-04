import { _electron as electron } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = await mkdtemp(resolve(tmpdir(), 'youshu-smoke-'));
const app = await electron.launch({ args: [root, `--user-data-dir=${userDataDir}`] });

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });

  const title = await page.title();
  const url = page.url();
  const appBounds = await page.locator('#app').boundingBox();
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });

  if (!title.includes('持有')) {
    throw new Error(`Unexpected title: ${title}`);
  }
  if (!url.startsWith('file://')) {
    throw new Error(`Expected packaged file URL, got: ${url}`);
  }
  if (!appBounds || appBounds.width < 380 || appBounds.height < 700) {
    throw new Error(`Unexpected app bounds: ${JSON.stringify(appBounds)}`);
  }
  if (!bodyText.includes('¥256,530.00') && !bodyText.includes('实物资产')) {
    throw new Error('Expected app content was not visible.');
  }

  console.log(JSON.stringify({ ok: true, title, url, appBounds }, null, 2));
} finally {
  await app.close();
}
