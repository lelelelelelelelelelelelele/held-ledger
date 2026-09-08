import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const socialDir = join(root, 'docs', 'public-demo-assets', 'social');
const previews = [
  ['phone-preview.html', 'held-ledger-social-preview.png'],
  ['card-preview.html', 'held-ledger-social-preview-cards.png'],
  ['asset-card-promo.html', 'held-ledger-asset-card-promo.png'],
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 1,
  });

  for (const [source, output] of previews) {
    await page.goto(pathToFileURL(join(socialDir, source)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: join(socialDir, output),
      fullPage: false,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    source: 'editable local HTML using only bundled public demo media',
    files: previews.map(([, output]) => `docs/public-demo-assets/social/${output}`),
  }, null, 2));
} finally {
  await browser.close();
}
