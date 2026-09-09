import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function launch(dataDir, executablePath = process.env.HELD_LEDGER_EXE || resolve('src-tauri/target/release/held-ledger.exe')) {
  if (process.platform !== 'win32') throw Error('WebView2 native integration tests require Windows');
  const listener = createServer();
  await new Promise(r => listener.listen(0, '127.0.0.1', r));
  const port = listener.address().port;
  await new Promise(r => listener.close(r));
  const child = spawn(executablePath, [], {
    env: { ...process.env, HELD_LEDGER_DATA_DIR: resolve(dataDir), WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` },
    stdio: 'ignore',
  });
  let browser;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw Error(`Native process exited ${child.exitCode} before startup`);
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); break; } catch { await delay(150); }
  }
  if (!browser) { child.kill(); throw Error('WebView2 debugging endpoint did not start'); }
  let page;
  while (Date.now() < deadline) {
    page = browser.contexts().flatMap(c => c.pages()).find(p => /tauri\.localhost|tauri:\/\//.test(p.url()));
    if (page) break;
    await delay(100);
  }
  if (!page) { child.kill(); throw Error('Native main page not found'); }
  await page.waitForFunction(() => window.ledgerReady === true, null, { timeout: 15000 });
  return {
    page, child,
    requestClose() {
      execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Process -Id ${child.pid}).CloseMainWindow() | Out-Null`]);
    },
    async close() {
      if (child.exitCode !== null) return;
      // Sends the real native WM_CLOSE path. Do not substitute browser/page reload for process restart.
      this.requestClose();
      for (let i = 0; i < 100 && child.exitCode === null; i++) await delay(100);
      if (child.exitCode === null) { child.kill(); throw Error('Native close did not exit within 10 seconds'); }
      await browser.close().catch(() => {});
    },
  };
}

export async function importFile(page, path, count) {
  await page.evaluate(() => route('me'));
  page.once('dialog', d => d.accept());
  await page.locator('#importJson').setInputFiles(path);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const assets = await page.evaluate(() => dbGetAll());
    if (assets?.length === count) return;
    await delay(100);
  }
  throw Error('Import did not persist expected item count');
}
