// Screenshot harness: renders demo/index.html at an iPhone viewport and
// captures every screen + a couple of interaction states. Also collects any
// console errors / page errors so detection can flag runtime breakage.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const indexUrl = pathToFileURL(resolve(root, 'demo/index.html')).href;
const outDir = resolve(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

// Each shot: drive the app to a screen (optionally run an extra action), wait, capture.
const SHOTS = [
  { name: '01-dashboard', screen: 'dashboard' },
  { name: '02-add',       screen: 'add' },
  { name: '03-add-filled',screen: 'add', action: 'fillAdd' },
  { name: '04-records',   screen: 'records' },
  { name: '05-analytics', screen: 'analytics' },
  { name: '06-assets',    screen: 'assets' },
  { name: '07-asset-detail', screen: 'asset-detail' },
];

const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(indexUrl, { waitUntil: 'networkidle' });
// Give web fonts a beat to settle for deterministic type rendering.
await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
await page.waitForTimeout(400);

for (const shot of SHOTS) {
  await page.evaluate((s) => {
    if (typeof window.gotoScreen === 'function') window.gotoScreen(s);
    else location.hash = '#' + s;
  }, shot.screen);
  await page.waitForTimeout(250);
  if (shot.action) {
    await page.evaluate((a) => { if (typeof window[a] === 'function') window[a](); }, shot.action);
    await page.waitForTimeout(300);
  }
  // Full viewport (above-the-fold mobile frame) shot.
  await page.screenshot({ path: resolve(outDir, shot.name + '.png') });
  // Also a full-page shot to inspect scroll content.
  await page.screenshot({ path: resolve(outDir, shot.name + '-full.png'), fullPage: true });
}

await browser.close();

if (errors.length) {
  console.log('RUNTIME_ERRORS:\n' + errors.join('\n'));
  process.exitCode = 2;
} else {
  console.log('OK: captured ' + SHOTS.length + ' screens, no runtime errors.');
}
