// Screenshot harness for Held Ledger（持有）
// Captures every main screen at iPhone viewport. The demo shell (#app) is a
// fixed 100dvh frame with overflow:hidden, so a fullPage shot adds nothing —
// one viewport capture per screen is the canonical set.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const indexUrl = pathToFileURL(resolve(root, 'demo/index.html')).href;
const outDir = resolve(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(indexUrl, { waitUntil: 'networkidle' });
await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
await page.waitForTimeout(600);

// Helper: navigate to a screen and wait
async function goto(screen) {
  await page.evaluate((s) => { route(s); }, screen);
  await page.waitForTimeout(300);
}

// Helper: capture the viewport frame
async function shot(name) {
  await page.screenshot({ path: resolve(outDir, name + '.png') });
  console.log('  ✓ ' + name);
}

console.log('Capturing screenshots...\n');

// 1. 总览看板
await goto('overview');
await shot('01-overview');

// 2. 资产 - 卡片视图（默认）
await goto('assets');
await shot('02-assets-card');

// 3. 资产 - 列表视图
await page.evaluate(() => { S.viewMode = 'list'; });
await page.evaluate(() => {
  const l = document.getElementById('itemList');
  if (l) l.innerHTML = itemsHTML();
  document.querySelectorAll('.view-toggle button').forEach(x =>
    x.classList.toggle('on', x.dataset.arg === 'list'));
});
await page.waitForTimeout(200);
await shot('03-assets-list');

// 4. 资产详情
await page.evaluate(() => { S.currentAsset = 'mac'; S.edit = null; route('asset-detail'); });
await page.waitForTimeout(300);
await shot('04-asset-detail-macbook');

// 5. 资产详情 - 权益类（合成航段示例）
await page.evaluate(() => { S.currentAsset = 'air'; S.edit = null; route('asset-detail'); });
await page.waitForTimeout(300);
await shot('05-asset-detail-airline');

// 6. 资产详情 - 车辆
await page.evaluate(() => { S.currentAsset = 'car'; S.edit = null; route('asset-detail'); });
await page.waitForTimeout(300);
await shot('06-asset-detail-car');

// 7. 待办
await goto('todos');
await shot('07-todos');

// 8. 智能添加
await goto('action');
await shot('08-action');

// 9. 我的
await goto('me');
await shot('09-me');

await browser.close();

if (errors.length) {
  console.log('\nRUNTIME_ERRORS:\n' + errors.join('\n'));
  process.exitCode = 2;
} else {
  console.log('\nOK: captured 9 screens, no runtime errors.');
}
